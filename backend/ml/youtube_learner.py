"""
SignBridge — YouTube Self-Supervised Sign Learner
==================================================
Watches ASL teaching videos on YouTube, extracts landmark sequences via
MediaPipe, aligns them with caption labels, and trains the sign classifier
incrementally — no human annotation required.

Pipeline
--------
  1. yt-dlp downloads video + auto-captions (VTT/SRT)
  2. MediaPipe Holistic runs on every frame → 63-float landmark vector
  3. Caption parser extracts (timestamp, sign_label) pairs from phrases like
     "the sign for HELLO" / "THIS IS HOW YOU SIGN GOODBYE"
  4. Frames inside each label window → training samples
  5. Online SGD updates the MLP in real time (imitation learning)

Usage
-----
    # Learn from a single video URL
    python -m backend.ml.youtube_learner --url "https://youtube.com/watch?v=..."

    # Learn from a playlist or text file of URLs
    python -m backend.ml.youtube_learner --playlist "https://youtube.com/playlist?list=..."
    python -m backend.ml.youtube_learner --file urls.txt

    # Dry-run: extract samples but don't update the model
    python -m backend.ml.youtube_learner --url "..." --dry-run

    # Control learning rate and minimum confidence
    python -m backend.ml.youtube_learner --url "..." --lr 5e-4 --min-frames 8
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Generator

import cv2
import numpy as np
import torch
import torch.nn as nn

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT       = Path(__file__).parent
SIGNS_JSON = ROOT / "signs_data.json"
MLP_PATH   = ROOT / "trained_mlp.pt"
REPORT     = ROOT / "training_report.json"

# ── Caption regex patterns ────────────────────────────────────────────────────
# Matches phrases like "the sign for HELLO", "how to sign goodbye", "signing THANK YOU"
_SIGN_PATTERNS = [
    re.compile(r"(?:sign(?:ing|s)?\s+(?:for\s+)?|how\s+to\s+sign\s+)([A-Z][A-Z _'-]{1,30})", re.I),
    re.compile(r"this\s+(?:is\s+)?(?:the\s+)?sign\s+(?:for\s+)?[\"']?([A-Z][A-Z _'-]{1,30})[\"']?", re.I),
    re.compile(r"asl\s+(?:for\s+)?[\"']?([A-Z][A-Z _'-]{1,30})[\"']?", re.I),
    re.compile(r"word\s+(?:is\s+)?[\"']([A-Z][A-Z _'-]{1,30})[\"']", re.I),
]


# ── MLP definition (must match trained_mlp.pt architecture) ───────────────────
class SignMLP(nn.Module):
    def __init__(self, input_dim: int, num_classes: int, hidden: int = 256):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden),
            nn.LayerNorm(hidden),
            nn.GELU(),
            nn.Dropout(0.3),
            nn.Linear(hidden, hidden),
            nn.GELU(),
            nn.Dropout(0.2),
            nn.Linear(hidden, hidden // 2),
            nn.GELU(),
            nn.Linear(hidden // 2, num_classes),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


# ── VTT / SRT caption parser ──────────────────────────────────────────────────
def _vtt_timestamp_to_seconds(ts: str) -> float:
    parts = ts.strip().replace(",", ".").split(":")
    parts = [float(p) for p in parts]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    return parts[0] * 60 + parts[1]


def parse_captions(caption_file: Path) -> list[tuple[float, float, str]]:
    """Return list of (start_sec, end_sec, text) from VTT or SRT file."""
    text = caption_file.read_text(encoding="utf-8", errors="ignore")
    results: list[tuple[float, float, str]] = []

    # WebVTT format
    if caption_file.suffix == ".vtt":
        blocks = re.split(r"\n\n+", text)
        for block in blocks:
            lines = block.strip().splitlines()
            time_line = next((l for l in lines if "-->" in l), None)
            if not time_line:
                continue
            parts = time_line.split("-->")
            try:
                start = _vtt_timestamp_to_seconds(parts[0])
                end   = _vtt_timestamp_to_seconds(parts[1].split()[0])
                body  = " ".join(l for l in lines if "-->" not in l and l.strip())
                if body:
                    results.append((start, end, body))
            except (ValueError, IndexError):
                continue
    else:
        # SRT format
        blocks = re.split(r"\n\n+", text)
        for block in blocks:
            lines = block.strip().splitlines()
            time_line = next((l for l in lines if "-->" in l), None)
            if not time_line:
                continue
            parts = time_line.split("-->")
            try:
                start = _vtt_timestamp_to_seconds(parts[0])
                end   = _vtt_timestamp_to_seconds(parts[1])
                body  = " ".join(l for l in lines if "-->" not in l and not l.strip().isdigit() and l.strip())
                if body:
                    results.append((start, end, body))
            except (ValueError, IndexError):
                continue

    return results


def extract_sign_labels(captions: list[tuple[float, float, str]]) -> list[tuple[float, float, str]]:
    """Extract (start, end, sign_key) windows from caption list."""
    labels: list[tuple[float, float, str]] = []
    for start, end, text in captions:
        clean = re.sub(r"<[^>]+>", "", text).strip()  # strip VTT timing tags
        for pattern in _SIGN_PATTERNS:
            m = pattern.search(clean)
            if m:
                key = m.group(1).upper().strip().replace(" ", "_")
                # extend window 2s after the caption ends (signer demonstrates after spoken label)
                labels.append((start, end + 2.0, key))
                break
    return labels


# ── Landmark extraction ───────────────────────────────────────────────────────
def extract_landmarks_from_video(
    video_path: Path,
    label_windows: list[tuple[float, float, str]],
    min_frames: int = 8,
) -> Generator[tuple[np.ndarray, str], None, None]:
    """
    Yield (landmark_vector, sign_key) pairs from video frames inside label windows.
    Requires mediapipe installed: pip install mediapipe
    """
    try:
        import mediapipe as mp
    except ImportError:
        raise ImportError("pip install mediapipe  — required for landmark extraction")

    mp_holistic = mp.solutions.holistic
    holistic    = mp_holistic.Holistic(
        static_image_mode=False,
        model_complexity=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )

    cap = cv2.VideoCapture(str(video_path))
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

    # Build a frame→label lookup for fast access
    frame_labels: dict[int, str] = {}
    for start_s, end_s, key in label_windows:
        for f in range(int(start_s * fps), int(end_s * fps) + 1):
            frame_labels[f] = key

    frame_idx   = 0
    key_buffers: dict[str, list[np.ndarray]] = {}

    while True:
        ok, frame = cap.read()
        if not ok:
            break

        label = frame_labels.get(frame_idx)
        if label:
            rgb     = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = holistic.process(rgb)

            vec = _landmarks_to_vector(results)
            if vec is not None:
                key_buffers.setdefault(label, []).append(vec)

                # Yield averaged feature vector once we have enough frames
                if len(key_buffers[label]) >= min_frames:
                    yield np.mean(key_buffers[label], axis=0), label
                    key_buffers[label] = []  # reset buffer, continue collecting

        frame_idx += 1

    # Flush remaining buffers
    for label, frames in key_buffers.items():
        if len(frames) >= min_frames // 2:
            yield np.mean(frames, axis=0), label

    cap.release()
    holistic.close()


def _landmarks_to_vector(results) -> np.ndarray | None:
    """Convert holistic results to a 63-float right-hand landmark vector."""
    if results.right_hand_landmarks is None:
        return None
    lm = results.right_hand_landmarks.landmark
    return np.array([[p.x, p.y, p.z] for p in lm], dtype=np.float32).flatten()  # 63


# ── yt-dlp download ───────────────────────────────────────────────────────────
def download_video_and_captions(url: str, out_dir: Path) -> tuple[Path | None, Path | None]:
    """Download video + auto-captions using yt-dlp. Returns (video_path, caption_path)."""
    print(f"[YTLearner] Downloading: {url}")
    cmd = [
        "yt-dlp",
        "--write-auto-sub",
        "--sub-lang", "en",
        "--sub-format", "vtt",
        "--write-sub",
        "--format", "bestvideo[height<=480][ext=mp4]+bestaudio/best[height<=480]",
        "--merge-output-format", "mp4",
        "--output", str(out_dir / "video.%(ext)s"),
        "--no-playlist",
        url,
    ]
    try:
        subprocess.run(cmd, check=True, capture_output=True)
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        print(f"[YTLearner] yt-dlp error: {e}")
        return None, None

    video   = next(out_dir.glob("video.mp4"), None)
    caption = next(out_dir.glob("video.*.vtt"), None) or next(out_dir.glob("video.*.srt"), None)
    return video, caption


# ── Model loader / saver ─────────────────────────────────────────────────────
def _load_model_and_classes() -> tuple[SignMLP, list[str], torch.optim.Optimizer] | None:
    if not MLP_PATH.exists():
        print("[YTLearner] No trained_mlp.pt found — run training first.")
        return None

    checkpoint = torch.load(MLP_PATH, map_location="cpu")

    classes = checkpoint.get("classes", [])
    if not classes and SIGNS_JSON.exists():
        signs = json.loads(SIGNS_JSON.read_text())
        classes = sorted(signs.keys())

    if not classes:
        print("[YTLearner] Cannot determine class list.")
        return None

    model = SignMLP(input_dim=63, num_classes=len(classes))
    try:
        model.load_state_dict(checkpoint["model_state"] if "model_state" in checkpoint else checkpoint)
    except RuntimeError as e:
        print(f"[YTLearner] State dict mismatch: {e}")
        return None

    optimizer = torch.optim.Adam(model.parameters(), lr=1e-4)
    return model, classes, optimizer


def _save_model(model: SignMLP, classes: list[str]) -> None:
    torch.save({"model_state": model.state_dict(), "classes": classes}, MLP_PATH)
    print(f"[YTLearner] Model saved → {MLP_PATH}")


# ── Online learning loop ──────────────────────────────────────────────────────
def learn_from_url(
    url: str,
    dry_run: bool = False,
    lr: float = 1e-4,
    min_frames: int = 8,
) -> dict:
    result = _load_model_and_classes()
    if result is None:
        return {"error": "model not loaded"}

    model, classes, optimizer = result
    optimizer.param_groups[0]["lr"] = lr
    criterion = nn.CrossEntropyLoss()

    class_to_idx = {c: i for i, c in enumerate(classes)}

    stats = {"url": url, "samples_seen": 0, "samples_trained": 0,
             "signs_encountered": {}, "losses": []}

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        video_path, caption_path = download_video_and_captions(url, tmp_path)

        if not video_path or not caption_path:
            return {"error": "download failed", **stats}

        print(f"[YTLearner] Parsing captions: {caption_path.name}")
        captions     = parse_captions(caption_path)
        label_windows = extract_sign_labels(captions)

        print(f"[YTLearner] Found {len(label_windows)} sign label windows:")
        for s, e, k in label_windows[:10]:
            print(f"  {s:.1f}s–{e:.1f}s  →  {k}")

        if not label_windows:
            return {"error": "no sign labels found in captions", **stats}

        model.train()
        for vec, sign_key in extract_landmarks_from_video(video_path, label_windows, min_frames):
            stats["samples_seen"] += 1
            stats["signs_encountered"][sign_key] = stats["signs_encountered"].get(sign_key, 0) + 1

            if sign_key not in class_to_idx:
                print(f"[YTLearner] Unknown sign '{sign_key}' — skipping")
                continue

            if dry_run:
                continue

            x     = torch.tensor(vec, dtype=torch.float32).unsqueeze(0)
            y     = torch.tensor([class_to_idx[sign_key]], dtype=torch.long)
            loss  = criterion(model(x), y)

            optimizer.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()

            stats["samples_trained"] += 1
            stats["losses"].append(round(loss.item(), 4))

            if stats["samples_trained"] % 20 == 0:
                avg_loss = sum(stats["losses"][-20:]) / 20
                print(f"[YTLearner] step {stats['samples_trained']:4d}  loss={avg_loss:.4f}  sign={sign_key}")

    if not dry_run and stats["samples_trained"] > 0:
        _save_model(model, classes)

    stats["avg_loss"] = round(sum(stats["losses"]) / len(stats["losses"]), 4) if stats["losses"] else None
    del stats["losses"]
    return stats


def learn_from_urls(urls: list[str], **kwargs) -> list[dict]:
    return [learn_from_url(url, **kwargs) for url in urls]


# ── CLI ───────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Learn ASL signs from YouTube videos")
    group  = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--url",      help="Single YouTube video URL")
    group.add_argument("--playlist", help="YouTube playlist URL")
    group.add_argument("--file",     help="Text file with one URL per line")

    parser.add_argument("--dry-run",    action="store_true", help="Extract samples only, no model update")
    parser.add_argument("--lr",         type=float, default=1e-4,  help="Learning rate (default 1e-4)")
    parser.add_argument("--min-frames", type=int,   default=8,     help="Min frames per label window (default 8)")

    args = parser.parse_args()

    if args.url:
        urls = [args.url]
    elif args.playlist:
        out = subprocess.check_output(["yt-dlp", "--flat-playlist", "-j", args.playlist]).decode()
        urls = [json.loads(l)["url"] for l in out.strip().splitlines()]
        print(f"[YTLearner] Playlist: {len(urls)} videos")
    else:
        urls = [u.strip() for u in Path(args.file).read_text().splitlines() if u.strip()]

    all_stats = learn_from_urls(urls, dry_run=args.dry_run, lr=args.lr, min_frames=args.min_frames)

    print("\n── Summary ──────────────────────────────────────────")
    for s in all_stats:
        print(json.dumps(s, indent=2))
