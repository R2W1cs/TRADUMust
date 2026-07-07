"""
extract_hf_poses.py — Auto-extract 3D Avatar Poses from Hugging Face ASL Dataset

Dataset: ZahidYasinMittha/American-Sign-Language-Dataset (~108K videos, 2,208 unique words)
Pipeline:
  1. Stream dataset via Hugging Face `datasets`.
  2. For each unique ASL word video, decode frames using OpenCV.
  3. Extract pose landmarks using MediaPipe Tasks PoseLandmarker + HandLandmarker.
  4. Calculate Rig Euler bone rotations (UpperArm, ForeArm, Hand, Fingers).
  5. Export directly to pose library JSON.

Usage:
  python tools/extract_hf_poses.py --max-words 50 --output backend/data/hf_poses.json
"""

import argparse
import json
import math
import os
import tempfile
import time
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np

from mediapipe.tasks import python as mptasks
from mediapipe.tasks.python import vision as mpvision

try:
    from datasets import load_dataset
except ImportError:
    raise ImportError("Please install datasets: pip install datasets huggingface-hub")

ROOT = Path(__file__).parent.parent
OUTPUT_DIR = ROOT / "backend" / "data"
MODELS_DIR = OUTPUT_DIR / "models"

# MediaPipe landmark indices for pose
# https://developers.google.com/mediapipe/solutions/vision/pose_landmarker
_POSE_IDX = {
    "LEFT_SHOULDER":  11,
    "RIGHT_SHOULDER": 12,
    "LEFT_ELBOW":     13,
    "RIGHT_ELBOW":    14,
    "LEFT_WRIST":     15,
    "RIGHT_WRIST":    16,
}

# ── 3D Landmark to Rig Euler Math ─────────────────────────────────────────────

def _vec3(lm):
    return np.array([lm.x, lm.y, lm.z], dtype=float)

def calculate_arm_euler(shoulder_lm, elbow_lm, wrist_lm, side="Right"):
    """
    Given 3D world positions from MediaPipe Tasks PoseLandmarker
    (x right, y down, z back), return approximate Rig Euler rotations (rad).
    """
    se = _vec3(elbow_lm) - _vec3(shoulder_lm)
    norm = np.linalg.norm(se)
    if norm < 1e-6:
        default_ua = (0.35, 0.3 if side == "Right" else -0.3, 1.25 if side == "Right" else -1.25)
        return default_ua, (1.3, 0.0, 0.0), (0.0, 0.0, 0.0)
    se = se / norm

    ua_z = math.asin(float(np.clip(se[1], -1.0, 1.0)))
    if side == "Right":
        ua_z = -ua_z - 0.2
        ua_x = math.atan2(float(se[2]), float(se[0])) + 0.3
        ua_y = 0.2
    else:
        ua_z = ua_z + 0.2
        ua_x = math.atan2(float(se[2]), -float(se[0])) - 0.3
        ua_y = -0.2

    ew = _vec3(wrist_lm) - _vec3(elbow_lm)
    ew_norm = np.linalg.norm(ew)
    if ew_norm > 1e-6:
        ew = ew / ew_norm
        dot = float(np.clip(np.dot(se, ew), -1.0, 1.0))
        fa_x = float(np.clip(math.acos(dot), 0.1, 2.2))
    else:
        fa_x = 0.5

    return (round(ua_x, 2), round(ua_y, 2), round(ua_z, 2)), \
           (round(fa_x, 2), 0.0, 0.0), \
           (0.0, 0.0, 0.0)


def calculate_finger_rotations(hand_result_landmarks):
    """
    Estimate finger curl from hand landmark list (mediapipe Tasks format).
    Returns (index, middle, ring, pinky, thumb) curl rotation dicts.
    """
    open_rot = {"x": 0.0, "y": 0.0, "z": 0.0}
    if not hand_result_landmarks:
        return open_rot, open_rot, open_rot, open_rot, open_rot

    lms = hand_result_landmarks  # list of NormalizedLandmark
    palm = np.array([lms[0].x, lms[0].y, lms[0].z])

    def curl_rot(tip_idx):
        tip = np.array([lms[tip_idx].x, lms[tip_idx].y, lms[tip_idx].z])
        dist = np.linalg.norm(tip - palm)
        curl_val = float(np.clip(1.5 - (dist * 3.0), 0.0, 1.5))
        return {"x": 0.0, "y": 0.0, "z": round(curl_val, 2)}

    # tip indices: index=8, middle=12, ring=16, pinky=20, thumb=4
    return curl_rot(8), curl_rot(12), curl_rot(16), curl_rot(20), curl_rot(4)


# ── Landmarker setup ──────────────────────────────────────────────────────────

def create_pose_landmarker():
    pose_model = str(MODELS_DIR / "pose_landmarker.task")
    if not Path(pose_model).exists():
        raise FileNotFoundError(f"Pose model not found: {pose_model}")
    base_options = mptasks.BaseOptions(model_asset_path=pose_model)
    options = mpvision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=mpvision.RunningMode.IMAGE,
        num_poses=1,
        min_pose_detection_confidence=0.4,
        output_segmentation_masks=False,
    )
    return mpvision.PoseLandmarker.create_from_options(options)

def create_hand_landmarker():
    hand_model = str(MODELS_DIR / "hand_landmarker.task")
    if not Path(hand_model).exists():
        raise FileNotFoundError(f"Hand model not found: {hand_model}")
    base_options = mptasks.BaseOptions(model_asset_path=hand_model)
    options = mpvision.HandLandmarkerOptions(
        base_options=base_options,
        running_mode=mpvision.RunningMode.IMAGE,
        num_hands=2,
        min_hand_detection_confidence=0.4,
    )
    return mpvision.HandLandmarker.create_from_options(options)


# ── Video Processing ──────────────────────────────────────────────────────────

def process_video_bytes(video_bytes, pose_landmarker, hand_landmarker):
    """
    Decodes video bytes, runs landmarkers frame-by-frame, picks the best frame,
    and returns a pose dict or None.
    """
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    cap = cv2.VideoCapture(tmp_path)
    best_frame = None
    best_score = -1
    frame_idx = 0

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            # Only process every 3rd frame for speed
            frame_idx += 1
            if frame_idx % 3 != 0:
                continue

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

            pose_result = pose_landmarker.detect(mp_image)
            if not pose_result.pose_landmarks:
                continue

            hand_result = hand_landmarker.detect(mp_image)

            # Score: prefer frames with both hands visible
            hand_count = len(hand_result.hand_landmarks) if hand_result.hand_landmarks else 0
            score = hand_count * 10 + 1  # baseline score for any pose detected

            if score > best_score:
                best_score = score
                best_frame = (pose_result, hand_result)

    finally:
        cap.release()
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    if not best_frame:
        return None

    pose_result, hand_result = best_frame
    pose_lms = pose_result.pose_world_landmarks[0] if pose_result.pose_world_landmarks else pose_result.pose_landmarks[0]

    r_sh = pose_lms[_POSE_IDX["RIGHT_SHOULDER"]]
    r_el = pose_lms[_POSE_IDX["RIGHT_ELBOW"]]
    r_wr = pose_lms[_POSE_IDX["RIGHT_WRIST"]]
    l_sh = pose_lms[_POSE_IDX["LEFT_SHOULDER"]]
    l_el = pose_lms[_POSE_IDX["LEFT_ELBOW"]]
    l_wr = pose_lms[_POSE_IDX["LEFT_WRIST"]]

    rua, rfa, rh = calculate_arm_euler(r_sh, r_el, r_wr, side="Right")
    lua, lfa, lh = calculate_arm_euler(l_sh, l_el, l_wr, side="Left")

    # Map hand chirality labels to landmarks
    right_hand_lms = None
    left_hand_lms  = None
    if hand_result.hand_landmarks and hand_result.handedness:
        for i, hand_lms in enumerate(hand_result.hand_landmarks):
            if i < len(hand_result.handedness):
                label = hand_result.handedness[i][0].category_name  # 'Left' or 'Right'
                if label == "Right" and right_hand_lms is None:
                    right_hand_lms = hand_lms
                elif label == "Left" and left_hand_lms is None:
                    left_hand_lms = hand_lms

    ri, rm, rr, rp, rt = calculate_finger_rotations(right_hand_lms)
    li, lm, lr, lp, lt = calculate_finger_rotations(left_hand_lms)

    pose_obj = {
        "RightUpperArm": {"x": rua[0], "y": rua[1], "z": rua[2]},
        "RightForeArm":  {"x": rfa[0], "y": rfa[1], "z": rfa[2]},
        "RightHand":     {"x": rh[0],  "y": rh[1],  "z": rh[2]},
        "RightIndex1": ri, "RightMiddle1": rm, "RightRing1": rr, "RightPinky1": rp, "RightThumb1": rt,
        "LeftUpperArm":  {"x": lua[0], "y": lua[1], "z": lua[2]},
        "LeftForeArm":   {"x": lfa[0], "y": lfa[1], "z": lfa[2]},
        "LeftHand":      {"x": lh[0],  "y": lh[1],  "z": lh[2]},
        "LeftIndex1": li, "LeftMiddle1": lm, "LeftRing1": lr, "LeftPinky1": lp, "LeftThumb1": lt,
    }
    return pose_obj


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Extract 3D poses from Hugging Face ASL dataset")
    parser.add_argument("--max-words", type=int, default=100, help="Max unique words to extract")
    parser.add_argument("--output", type=str, default=str(OUTPUT_DIR / "hf_extracted_poses.json"))
    args = parser.parse_args()

    os.makedirs(os.path.dirname(args.output), exist_ok=True)

    print("Loading MediaPipe landmarkers...")
    pose_landmarker = create_pose_landmarker()
    hand_landmarker = create_hand_landmarker()

    print("Connecting to Hugging Face dataset (huggingface_hub)...")
    from huggingface_hub import list_repo_files, hf_hub_download
    
    repo_id = "ZahidYasinMittha/American-Sign-Language-Dataset"
    all_files = list_repo_files(repo_id, repo_type="dataset")
    
    # Map word -> file path
    word_to_file = {}
    for f in all_files:
        if not f.endswith(".mp4"): continue
        # Example filename: part_1/000017451997373907346-LIBRARY.mp4
        basename = os.path.basename(f)
        if "-" in basename:
            word = basename.split("-", 1)[1].replace(".mp4", "").strip()
            clean_word = word.upper().replace(" ", "_")
            if clean_word and clean_word not in word_to_file:
                word_to_file[clean_word] = f

    print(f"Found {len(word_to_file)} unique ASL words in repository.")
    
    extracted_poses = {}
    word_count = 0
    start_time = time.time()

    print(f"Starting extraction for up to {args.max_words} words...\n")

    try:
        import urllib.request
        for clean_word, filepath in word_to_file.items():
            if clean_word in extracted_poses:
                continue

            # Download video directly to memory
            url = f"https://huggingface.co/datasets/{repo_id}/resolve/main/{filepath.replace(' ', '%20')}"
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                with urllib.request.urlopen(req) as response:
                    video_bytes = response.read()
            except Exception as e:
                print(f"  [FAIL] {clean_word} -- Download failed: {e}")
                continue

            pose = process_video_bytes(video_bytes, pose_landmarker, hand_landmarker)
            if pose:
                extracted_poses[clean_word] = pose
                word_count += 1
                elapsed = round(time.time() - start_time, 1)
                print(f"[{word_count}/{args.max_words}] [OK] {clean_word} ({elapsed}s)")
            else:
                print(f"  [FAIL] {clean_word} -- no landmarks detected, skipping")

            if word_count >= args.max_words:
                break

    except KeyboardInterrupt:
        print("\nInterrupted by user.")
    except Exception as e:
        print(f"\nError during streaming: {e}")

    pose_landmarker.close()
    hand_landmarker.close()

    # Save JSON
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(extracted_poses, f, indent=2, ensure_ascii=False)

    elapsed_total = round(time.time() - start_time, 1)
    print(f"\nExtracted {len(extracted_poses)} poses in {elapsed_total}s")
    print(f"   Saved -> {args.output}")


if __name__ == "__main__":
    main()
