"""
TSL — Feature extraction from static sign images
=================================================
Processes the Tunisian Sign Language image dataset (one folder per gloss)
using MediaPipe HolisticLandmarker and saves pooled features for training.

Usage:
    python -m backend.ml.extract_features_from_images \\
      --dataset_dir "data/tsl-dataset-raw/(First ever) Tunisian Sign Language Dataset/Data" \\
      --vocab data/tsl/vocabulary.json \\
      --output_dir backend/ml/tsl_features
"""

from __future__ import annotations

import argparse
import json
import os
import warnings
from pathlib import Path

import cv2
import numpy as np

os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
warnings.filterwarnings("ignore")

from backend.ml.feature_extractor import extract_holistic_features, pool_frame_sequence

_MODEL_PATH = Path(__file__).parent / "models" / "holistic_landmarker.task"


def _make_detector():
    import mediapipe as mp
    from mediapipe.tasks.python.core.base_options import BaseOptions
    from mediapipe.tasks.python import vision

    opts = vision.HolisticLandmarkerOptions(
        base_options=BaseOptions(model_asset_path=str(_MODEL_PATH)),
        min_pose_detection_confidence=0.4,
        min_hand_landmarks_confidence=0.4,
    )
    return vision.HolisticLandmarker.create_from_options(opts)


def _landmarks_to_dicts(landmarks) -> list[dict]:
    if not landmarks:
        return []
    return [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in landmarks]


def _process_image(detector, image_path: Path) -> np.ndarray | None:
    bgr = cv2.imread(str(image_path))
    if bgr is None:
        return None
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    import mediapipe as mp

    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = detector.detect(mp_image)

    rh = _landmarks_to_dicts(result.right_hand_landmarks)
    lh = _landmarks_to_dicts(result.left_hand_landmarks)
    pose = _landmarks_to_dicts(result.pose_landmarks)
    face = _landmarks_to_dicts(result.face_landmarks)

    if not rh and not lh:
        return None

    feat = extract_holistic_features(rh or None, lh or None, pose or None, face or None)
    return pool_frame_sequence([feat])


def _find_sign_dir(data_root: Path, category: str, sign_id: str) -> Path | None:
    cat_dir = data_root / category
    if not cat_dir.exists():
        return None
    for child in cat_dir.iterdir():
        if child.is_dir() and child.name.lower() == sign_id.lower():
            return child
    norm = sign_id.lower().replace("-", "").replace("_", "")
    aliases = {"metro": ["metro", "métro", "m\u00e9tro"]}
    try_ids = [sign_id] + aliases.get(sign_id.lower(), [])
    for sid in try_ids:
        for child in cat_dir.iterdir():
            if child.is_dir() and child.name.lower().replace("-", "").replace("_", "") == sid.lower().replace("-", "").replace("_", ""):
                return child
    for child in cat_dir.iterdir():
        if child.is_dir() and child.name.lower().replace("-", "").replace("_", "") == norm:
            return child
    return None


def extract_tsl_features(
    dataset_dir: Path,
    vocab_path: Path,
    output_dir: Path,
    max_per_sign: int = 0,
) -> dict:
    with open(vocab_path, encoding="utf-8") as f:
        vocab = json.load(f)

    output_dir.mkdir(parents=True, exist_ok=True)
    detector = _make_detector()

    X_rows: list[np.ndarray] = []
    y_rows: list[int] = []
    meta_rows: list[dict] = []

    classes = [s["gloss"] for s in vocab["signs"]]
    class_map = {g: i for i, g in enumerate(classes)}

    skipped = 0
    for sign in vocab["signs"]:
        sign_dir = _find_sign_dir(dataset_dir, sign["category"], sign["id"])
        if not sign_dir:
            print(f"  [skip] missing folder: {sign['category']}/{sign['id']}")
            continue

        images = sorted(
            [p for p in sign_dir.iterdir() if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")]
        )
        if max_per_sign > 0:
            images = images[:max_per_sign]

        label = class_map[sign["gloss"]]
        for img_path in images:
            feat = _process_image(detector, img_path)
            if feat is None:
                skipped += 1
                continue
            X_rows.append(feat.astype(np.float32))
            y_rows.append(label)
            meta_rows.append(
                {
                    "gloss": sign["gloss"],
                    "image": str(img_path),
                    "category": sign["category"],
                }
            )

    if not X_rows:
        raise RuntimeError("No features extracted — check dataset paths and MediaPipe model.")

    X = np.vstack(X_rows)
    y = np.array(y_rows, dtype=np.int32)

    np.save(str(output_dir / "X.npy"), X)
    np.save(str(output_dir / "y.npy"), y)
    with open(output_dir / "classes.json", "w", encoding="utf-8") as f:
        json.dump(classes, f, indent=2)
    with open(output_dir / "metadata.json", "w", encoding="utf-8") as f:
        json.dump(meta_rows, f, indent=2)

    stats = {
        "samples": int(len(y)),
        "classes": len(classes),
        "skipped_images": skipped,
        "feature_dim": int(X.shape[1]),
    }
    with open(output_dir / "stats.json", "w", encoding="utf-8") as f:
        json.dump(stats, f, indent=2)

    print(f"Extracted {stats['samples']} samples, {stats['classes']} classes, dim={stats['feature_dim']}")
    return stats


def main():
    parser = argparse.ArgumentParser(description="Extract TSL features from sign images")
    parser.add_argument(
        "--dataset_dir",
        type=Path,
        default=Path("data/tsl-dataset-raw/(First ever) Tunisian Sign Language Dataset/Data"),
    )
    parser.add_argument("--vocab", type=Path, default=Path("data/tsl/vocabulary.json"))
    parser.add_argument("--output_dir", type=Path, default=Path("backend/ml/tsl_features"))
    parser.add_argument("--max_per_sign", type=int, default=0, help="Cap images per sign (0 = all)")
    args = parser.parse_args()

    extract_tsl_features(args.dataset_dir, args.vocab, args.output_dir, args.max_per_sign)


if __name__ == "__main__":
    main()
