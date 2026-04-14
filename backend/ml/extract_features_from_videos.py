"""
SignBridge ML — WLASL Feature Extraction Script
================================================
One-time offline preprocessing: runs MediaPipe HolisticLandmarker on every
video in a WLASL dataset directory and saves the extracted features as .npy
files ready for training.

Prerequisites
-------------
1. Download WLASL from:
     https://github.com/dxli94/WLASL
     or Kaggle: https://www.kaggle.com/datasets/risangbaskoro/wlasl-processed
     (request form or direct download — see README)

2. Organise files like this:
     data/wlasl/
       WLASL_v0.3.json          <- metadata (gloss, signer_id, video_id, etc.)
       videos/                  <- video files named by video_id
         00001.mp4
         00002.mp4
         ...

3. Run this script (takes ~1-2 hours for WLASL300 on a laptop):
     python -m backend.ml.extract_features_from_videos \\
       --wlasl_dir data/wlasl \\
       --output_dir backend/ml/wlasl_features \\
       --subset 300          # 300 most common glosses (WLASL300)
       --workers 4           # parallel workers (0 = serial)

Output
------
backend/ml/wlasl_features/
  X.npy              (N, 252)  float32  feature matrix (mean+std pooled)
  y.npy              (N,)      int32    integer class labels
  classes.json                          list of gloss strings (index = label)
  metadata.json                         per-sample signer_id, video_id, split

Training
--------
After extraction, retrain via:
    python -m backend.ml.train --data wlasl
or via the API:
    POST /api/ml/train   { "data_source": "wlasl" }
"""

from __future__ import annotations

import argparse
import json
import os
import warnings
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import cv2
import numpy as np

# Suppress TFLite noise
os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '3')
warnings.filterwarnings('ignore')

from backend.ml.feature_extractor import extract_holistic_features, pool_frame_sequence

_MODEL_PATH = Path(__file__).parent / 'models' / 'holistic_landmarker.task'

# WLASL standard train/val/test split labels
_SPLIT_KEYS = ('train', 'val', 'test')


# ── MediaPipe detector (one per process) ────────────────────────────────────

def _make_detector():
    """Create a HolisticLandmarker for the calling process."""
    import mediapipe as mp
    from mediapipe.tasks.python.core.base_options import BaseOptions
    from mediapipe.tasks.python import vision

    opts = vision.HolisticLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(_MODEL_PATH)),
        min_pose_detection_confidence=0.4,
        min_hand_landmarks_confidence=0.4,
    )
    return vision.HolisticLandmarker.create_from_options(opts)


# ── Per-video extraction ────────────────────────────────────────────────────

def _lm_to_dict_list(lm_list) -> list[dict]:
    """Convert mediapipe NormalizedLandmarkList → list of {x,y,z} dicts."""
    if lm_list is None:
        return []
    return [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in lm_list]


def extract_video_features(
    video_path: Path,
    max_frames: int = 64,
    frame_step: int = 2,
) -> np.ndarray | None:
    """
    Run MediaPipe HolisticLandmarker on a video and return a 252-dim
    pooled feature vector (mean+std of per-frame 126-dim vectors).

    Parameters
    ----------
    video_path  : path to the video file
    max_frames  : maximum frames to sample (default 64 = ~2 s at 30 fps)
    frame_step  : stride between sampled frames (default 2 = every other frame)

    Returns None if the video cannot be opened or yields no detections.
    """
    import mediapipe as mp
    from mediapipe.tasks.python.core.base_options import BaseOptions
    from mediapipe.tasks.python import vision

    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        return None

    # Read frames up to limit
    frames_rgb = []
    frame_idx  = 0
    while len(frames_rgb) < max_frames:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % frame_step == 0:
            frames_rgb.append(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
        frame_idx += 1
    cap.release()

    if not frames_rgb:
        return None

    opts = vision.HolisticLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(_MODEL_PATH)),
        min_pose_detection_confidence=0.4,
        min_hand_landmarks_confidence=0.4,
    )
    per_frame_feats = []

    with vision.HolisticLandmarker.create_from_options(opts) as detector:
        for rgb in frames_rgb:
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result   = detector.detect(mp_image)

            rh   = _lm_to_dict_list(result.right_hand_landmarks)
            lh   = _lm_to_dict_list(result.left_hand_landmarks)
            pose = _lm_to_dict_list(result.pose_landmarks)

            feat = extract_holistic_features(rh or None, lh or None, pose or None)
            per_frame_feats.append(feat)

    if not per_frame_feats:
        return None

    return pool_frame_sequence(per_frame_feats)   # (252,)


# ── Worker function (runs in subprocess) ────────────────────────────────────

def _worker(args):
    video_path, gloss, label = args
    try:
        feat = extract_video_features(Path(video_path))
        if feat is not None:
            return (feat, label, gloss, str(video_path))
        return None
    except Exception as e:
        return None


# ── Main extraction pipeline ─────────────────────────────────────────────────

def extract_wlasl(
    wlasl_dir: Path,
    output_dir: Path,
    subset: int = 300,
    max_videos_per_gloss: int = 0,   # 0 = no limit
    workers: int = 4,
    verbose: bool = True,
) -> Path:
    """
    Full WLASL feature extraction pipeline.

    Parameters
    ----------
    wlasl_dir            : directory containing WLASL_v0.3.json + videos/
    output_dir           : where to save X.npy, y.npy, classes.json
    subset               : number of top-frequency glosses to use
    max_videos_per_gloss : cap videos per gloss (0 = use all)
    workers              : parallel processes (0 = serial, safer for debug)

    Returns path to output_dir.
    """
    def log(msg):
        if verbose:
            print(msg)

    wlasl_dir  = Path(wlasl_dir)
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    json_path   = wlasl_dir / 'WLASL_v0.3.json'
    videos_dir  = wlasl_dir / 'videos'

    if not json_path.exists():
        raise FileNotFoundError(f"WLASL metadata not found: {json_path}")
    if not videos_dir.exists():
        raise FileNotFoundError(f"Videos directory not found: {videos_dir}")

    with open(json_path, 'r') as f:
        wlasl = json.load(f)

    # ── Build task list ────────────────────────────────────────────────────
    # WLASL JSON structure:
    # [ { "gloss": "book", "instances": [
    #       { "video_id": "00001", "signer_id": 1, "split": "train", ... }, ...
    #   ]}, ... ]

    # Select top-N glosses by total instance count
    sorted_entries = sorted(wlasl, key=lambda e: len(e['instances']), reverse=True)
    selected       = sorted_entries[:subset]
    classes        = [e['gloss'].upper() for e in selected]
    label_map      = {g: i for i, g in enumerate(classes)}

    log(f"\n[WLASL] Selected {len(classes)} glosses from {len(wlasl)} total")

    tasks        = []   # (video_path, gloss, label)
    missing      = 0
    meta_rows    = []

    for entry in selected:
        gloss       = entry['gloss'].upper()
        label       = label_map[gloss]
        instances   = entry['instances']

        if max_videos_per_gloss:
            instances = instances[:max_videos_per_gloss]

        for inst in instances:
            vid_id = str(inst['video_id'])
            # Try common extensions
            for ext in ('.mp4', '.avi', '.mov', '.mkv', ''):
                vpath = videos_dir / f"{vid_id}{ext}"
                if vpath.exists():
                    tasks.append((str(vpath), gloss, label))
                    meta_rows.append({
                        'video_id':  vid_id,
                        'gloss':     gloss,
                        'label':     label,
                        'signer_id': inst.get('signer_id', -1),
                        'split':     inst.get('split', 'train'),
                    })
                    break
            else:
                missing += 1

    log(f"[WLASL] Tasks: {len(tasks)} videos found, {missing} missing")
    if not tasks:
        raise RuntimeError("No video files found. Check that videos/ is populated.")

    # ── Extract features ──────────────────────────────────────────────────
    log(f"\n[WLASL] Extracting features ({workers} workers)...")
    log(       "       This takes ~1-2 hours for WLASL300 on a laptop.")
    log(       "       Progress is saved as X.npy on completion.\n")

    X_rows, y_rows, meta_out = [], [], []
    done = 0

    if workers > 0:
        with ProcessPoolExecutor(max_workers=workers) as pool:
            futures = {pool.submit(_worker, t): t for t in tasks}
            for fut in as_completed(futures):
                result = fut.result()
                done += 1
                if done % 100 == 0:
                    log(f"  {done}/{len(tasks)} videos processed ...")
                if result is not None:
                    feat, label, gloss, vpath = result
                    X_rows.append(feat)
                    y_rows.append(label)
                    meta_out.append(meta_rows[tasks.index(futures[fut])])
    else:
        for i, task in enumerate(tasks):
            result = _worker(task)
            if i % 50 == 0:
                log(f"  {i}/{len(tasks)} videos processed ...")
            if result is not None:
                feat, label, gloss, vpath = result
                X_rows.append(feat)
                y_rows.append(label)
                meta_out.append(meta_rows[i])

    if not X_rows:
        raise RuntimeError("Feature extraction produced zero samples. Check video format.")

    X = np.stack(X_rows).astype(np.float32)   # (N, 252)
    y = np.array(y_rows, dtype=np.int32)       # (N,)

    # ── Signer-stratified split metadata ────────────────────────────────
    # Tag each sample with signer_id so train.py can do cross-signer eval
    signer_ids = np.array([m['signer_id'] for m in meta_out], dtype=np.int32)

    # Save
    np.save(output_dir / 'X.npy',          X)
    np.save(output_dir / 'y.npy',          y)
    np.save(output_dir / 'signer_ids.npy', signer_ids)

    with open(output_dir / 'classes.json', 'w') as f:
        json.dump(classes, f, indent=2)

    with open(output_dir / 'metadata.json', 'w') as f:
        json.dump(meta_out, f, indent=2)

    per_class = {}
    for lbl in y:
        per_class[classes[lbl]] = per_class.get(classes[lbl], 0) + 1
    samples_per_class = sorted(per_class.values())

    log(f"\n[WLASL] Done!")
    log(f"  Samples   : {X.shape[0]:,}")
    log(f"  Classes   : {len(classes)}")
    log(f"  Features  : {X.shape[1]}")
    log(f"  Min/med/max samples/class: "
        f"{samples_per_class[0]} / {samples_per_class[len(samples_per_class)//2]} / {samples_per_class[-1]}")
    log(f"  Saved to  : {output_dir}")

    return output_dir


# ── CLI entry point ─────────────────────────────────────────────────────────

if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Extract WLASL features using MediaPipe HolisticLandmarker'
    )
    parser.add_argument('--wlasl_dir',   required=True,
                        help='Directory with WLASL_v0.3.json and videos/')
    parser.add_argument('--output_dir',  default='backend/ml/wlasl_features',
                        help='Where to save X.npy, y.npy, classes.json')
    parser.add_argument('--subset',      type=int, default=300,
                        help='Top N glosses to use (default 300 = WLASL300)')
    parser.add_argument('--max_videos',  type=int, default=0,
                        help='Max videos per gloss (0 = all)')
    parser.add_argument('--workers',     type=int, default=4,
                        help='Parallel processes (0 = serial)')
    parser.add_argument('--verbose',     action='store_true', default=True)

    args = parser.parse_args()

    extract_wlasl(
        wlasl_dir=Path(args.wlasl_dir),
        output_dir=Path(args.output_dir),
        subset=args.subset,
        max_videos_per_gloss=args.max_videos,
        workers=args.workers,
        verbose=args.verbose,
    )
