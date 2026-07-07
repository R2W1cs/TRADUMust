"""
SignBridge ML — Production Feature Extractor
=============================================
Replaces the 12-feature synthetic vector with a proper 126-feature
normalized representation derived from MediaPipe Holistic landmarks.

Feature vector layout (126 dimensions):
  [0:63]   Right hand — 21 landmarks × (x, y, z)
  [63:126] Left hand  — 21 landmarks × (x, y, z)

Normalization (cross-signer invariant):
  - Coordinates are centered on the shoulder midpoint
  - Scaled by shoulder-width (distance between left/right shoulder landmarks)
  - Result: invariant to camera distance, signer height, and body position

Temporal aggregation (for sequence clips):
  pool_frame_sequence(frames) → 252-feature vector (mean + std across frames)
  This encodes motion as statistics without needing an LSTM.

MediaPipe Holistic pose landmark indices used for normalization:
  11 = LEFT_SHOULDER
  12 = RIGHT_SHOULDER
"""

from __future__ import annotations
import numpy as np


# Number of hand landmarks (MediaPipe hand model)
N_HAND_LANDMARKS = 21
N_FACE_LANDMARKS = 20  # Selected landmarks for mouth and eyebrows
N_POSE_LANDMARKS = 15  # Upper body: shoulders, elbows, wrists, hips (indices below)
N_HAND_FEATURES  = N_HAND_LANDMARKS * 3   # x, y, z per landmark = 63
N_FACE_FEATURES  = N_FACE_LANDMARKS * 3   # 60
N_POSE_FEATURES  = N_POSE_LANDMARKS * 3   # 45  — always visible, high signal
N_FEATURES       = (N_HAND_FEATURES * 2) + N_FACE_FEATURES + N_POSE_FEATURES  # 231

# MediaPipe pose landmark indices used for normalization
_POSE_LEFT_SHOULDER  = 11
_POSE_RIGHT_SHOULDER = 12

# Upper-body pose landmark indices included as features
# 11=L_shoulder, 12=R_shoulder, 13=L_elbow, 14=R_elbow,
# 15=L_wrist, 16=R_wrist, 17=L_pinky, 18=R_pinky,
# 19=L_index, 20=R_index, 23=L_hip, 24=R_hip,
# 0=nose, 7=L_ear, 8=R_ear
POSE_FEATURE_INDICES = [0, 7, 8, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 23, 24]

# MediaPipe face landmark indices (approximate indices for mouth and eyebrows)
# Reference: https://github.com/google/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png
FACE_LANDMARK_INDICES = [
    # Mouth outer
    61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 61,
    # Eyebrows
    70, 63, 105, 66, 107,  # Left
    336, 296, 334, 293, 300 # Right
]

def _pose_to_array(landmarks: list[dict] | None) -> np.ndarray:
    """Extract upper-body pose landmarks as a flat (45,) float32 array."""
    if not landmarks or len(landmarks) <= max(POSE_FEATURE_INDICES):
        return np.zeros(N_POSE_FEATURES, dtype=np.float32)
    arr = np.array(
        [[landmarks[i].get('x', 0.0), landmarks[i].get('y', 0.0), landmarks[i].get('z', 0.0)]
         for i in POSE_FEATURE_INDICES],
        dtype=np.float32,
    ).flatten()
    return arr


def _hand_to_array(landmarks: list[dict] | None) -> np.ndarray:
    """
    Convert a list of 21 MediaPipe hand landmarks ({x, y, z}) to a flat
    (63,) float32 array. Returns zeros if landmarks is None or empty.
    """
    if not landmarks or len(landmarks) < N_HAND_LANDMARKS:
        return np.zeros(N_HAND_FEATURES, dtype=np.float32)

    arr = np.array(
        [[lm.get('x', 0.0), lm.get('y', 0.0), lm.get('z', 0.0)]
         for lm in landmarks[:N_HAND_LANDMARKS]],
        dtype=np.float32,
    ).flatten()   # shape (63,)
    return arr

def _face_to_array(landmarks: list[dict] | None) -> np.ndarray:
    """
    Extract specific face landmarks (mouth, eyebrows) into a flat array.
    """
    if not landmarks or len(landmarks) < 468: # Standard MediaPipe face mesh size
        return np.zeros(N_FACE_FEATURES, dtype=np.float32)
    
    selected = []
    for idx in FACE_LANDMARK_INDICES[:N_FACE_LANDMARKS]:
        lm = landmarks[idx]
        selected.append([lm.get('x', 0.0), lm.get('y', 0.0), lm.get('z', 0.0)])
    
    return np.array(selected, dtype=np.float32).flatten()

def _pose_params(pose: list[dict]) -> tuple[np.ndarray, float] | None:
    """
    Extract (shoulder_midpoint, shoulder_width) from pose landmarks.
    Returns None if pose is too short or shoulder_width is degenerate.
    """
    if not pose or len(pose) <= _POSE_RIGHT_SHOULDER:
        return None
    ls = pose[_POSE_LEFT_SHOULDER]
    rs = pose[_POSE_RIGHT_SHOULDER]
    mid = np.array([
        (ls.get('x', 0.0) + rs.get('x', 0.0)) / 2.0,
        (ls.get('y', 0.0) + rs.get('y', 0.0)) / 2.0,
        (ls.get('z', 0.0) + rs.get('z', 0.0)) / 2.0,
    ], dtype=np.float32)
    width = float(np.sqrt(
        (rs.get('x', 0.0) - ls.get('x', 0.0)) ** 2 +
        (rs.get('y', 0.0) - ls.get('y', 0.0)) ** 2
    ))
    if width < 1e-6:
        return None
    return mid, width


def _normalize_points(arr: np.ndarray, mid: np.ndarray, width: float) -> np.ndarray:
    """Center and scale a flattened array of points (3D) by pose parameters."""
    out = arr.copy()
    for i in range(0, len(arr), 3):
        out[i]     = (arr[i]     - mid[0]) / width
        out[i + 1] = (arr[i + 1] - mid[1]) / width
        out[i + 2] = (arr[i + 2] - mid[2]) / width
    return out


def extract_holistic_features(
    right_hand: list[dict] | None,
    left_hand:  list[dict] | None,
    pose:       list[dict] | None = None,
    face:       list[dict] | None = None,
) -> np.ndarray:
    """
    Convert MediaPipe Holistic output to a normalized 231-feature vector.

    Parameters
    ----------
    right_hand : list of 21 dicts {x, y, z} or None
    left_hand  : list of 21 dicts {x, y, z} or None
    pose       : list of 33 dicts {x, y, z} or None
    face       : list of 468+ dicts {x, y, z} or None

    Returns
    -------
    np.ndarray shape (231,), dtype float32
        [0:63]    right-hand landmarks, normalized
        [63:126]  left-hand landmarks, normalized
        [126:186] face landmarks (mouth/eyebrows), normalized
        [186:231] upper-body pose landmarks, normalized  ← always non-zero
    """
    rh_present   = bool(right_hand and len(right_hand) >= N_HAND_LANDMARKS)
    lh_present   = bool(left_hand  and len(left_hand)  >= N_HAND_LANDMARKS)
    face_present = bool(face and len(face) >= 468)
    pose_present = bool(pose and len(pose) > max(POSE_FEATURE_INDICES))

    rh = _hand_to_array(right_hand)
    lh = _hand_to_array(left_hand)
    fa = _face_to_array(face)
    po = _pose_to_array(pose)

    # Apply pose normalization (center on shoulder midpoint, scale by shoulder width)
    params = _pose_params(pose) if pose else None
    if params is not None:
        mid, width = params
        if rh_present:
            rh = _normalize_points(rh, mid, width)
        if lh_present:
            lh = _normalize_points(lh, mid, width)
        if face_present:
            fa = _normalize_points(fa, mid, width)
        if pose_present:
            po = _normalize_points(po, mid, width)

    return np.concatenate([rh, lh, fa, po]).astype(np.float32)


def pool_frame_sequence(frames: list[np.ndarray]) -> np.ndarray:
    """
    Temporal aggregation: reduce a variable-length sequence of per-frame
    feature vectors to a fixed-length (N_FEATURES * 2) representation.
    Mean + std encodes both the average pose and the motion variance.
    """
    if not frames:
        return np.zeros(N_FEATURES * 2, dtype=np.float32)

    mat = np.stack(frames, axis=0)   # (n_frames, 186)
    mean = mat.mean(axis=0)          # (186,)
    std  = mat.std(axis=0)           # (186,)
    return np.concatenate([mean, std]).astype(np.float32)   # (372,)


def encode_landmarks_legacy(landmarks: list[dict]) -> np.ndarray:
    """
    DEPRECATED — compatibility shim for the old 12-feature encode_landmarks().

    Maps the flat 21-landmark list from /api/sign/extract-landmarks (old format)
    to the new 126-feature vector by treating all landmarks as right-hand data
    and padding the left-hand block with zeros.

    Use extract_holistic_features() for new code.
    """
    if not landmarks or len(landmarks) < 21:
        return np.zeros(N_FEATURES, dtype=np.float32)

    return extract_holistic_features(
        right_hand=landmarks[:21],
        left_hand=None,
        pose=None,
    )
