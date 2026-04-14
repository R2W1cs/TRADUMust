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
N_HAND_FEATURES  = N_HAND_LANDMARKS * 3   # x, y, z per landmark = 63
N_FEATURES       = N_HAND_FEATURES * 2    # right + left = 126

# MediaPipe pose landmark indices
_POSE_LEFT_SHOULDER  = 11
_POSE_RIGHT_SHOULDER = 12


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


def _normalize_hand(arr: np.ndarray, mid: np.ndarray, width: float) -> np.ndarray:
    """Center and scale a 63-dim hand array by shoulder pose parameters."""
    out = arr.copy()
    for i in range(0, N_HAND_FEATURES, 3):
        out[i]     = (arr[i]     - mid[0]) / width
        out[i + 1] = (arr[i + 1] - mid[1]) / width
        out[i + 2] = (arr[i + 2] - mid[2]) / width
    return out


def extract_holistic_features(
    right_hand: list[dict] | None,
    left_hand:  list[dict] | None,
    pose:       list[dict] | None = None,
) -> np.ndarray:
    """
    Convert MediaPipe Holistic output to a normalized 126-feature vector.

    Parameters
    ----------
    right_hand : list of 21 dicts {x, y, z} or None
    left_hand  : list of 21 dicts {x, y, z} or None
    pose       : list of 33 dicts {x, y, z} or None (used for normalization)

    Returns
    -------
    np.ndarray shape (126,), dtype float32
        [0:63]   right-hand landmarks (x,y,z × 21), normalized
        [63:126] left-hand landmarks  (x,y,z × 21), normalized
        Missing hand → zero block for that half (NOT normalized)

    Note: normalization is applied independently per hand and only when
    the hand is actually present. Missing-hand zero blocks are never
    transformed, so they remain invariant to pose parameters.
    """
    rh_present = bool(right_hand and len(right_hand) >= N_HAND_LANDMARKS)
    lh_present = bool(left_hand  and len(left_hand)  >= N_HAND_LANDMARKS)

    rh = _hand_to_array(right_hand)
    lh = _hand_to_array(left_hand)

    # Apply pose normalization only to present hands
    params = _pose_params(pose) if pose else None
    if params is not None:
        mid, width = params
        if rh_present:
            rh = _normalize_hand(rh, mid, width)
        if lh_present:
            lh = _normalize_hand(lh, mid, width)

    return np.concatenate([rh, lh]).astype(np.float32)


def pool_frame_sequence(frames: list[np.ndarray]) -> np.ndarray:
    """
    Temporal aggregation: reduce a variable-length sequence of per-frame
    feature vectors to a fixed-length 252-feature representation.

    Method: concatenate [mean, std] across frames — captures both the
    average pose (WHAT sign) and the spread/motion (HOW it moves).

    Parameters
    ----------
    frames : list of np.ndarray, each shape (126,)
        Per-frame features extracted by extract_holistic_features().
        Should be 8–32 frames (0.25–1.0 s at 30 fps).

    Returns
    -------
    np.ndarray shape (252,), dtype float32
    """
    if not frames:
        return np.zeros(N_FEATURES * 2, dtype=np.float32)

    mat = np.stack(frames, axis=0)   # (n_frames, 126)
    mean = mat.mean(axis=0)          # (126,)
    std  = mat.std(axis=0)           # (126,)
    return np.concatenate([mean, std]).astype(np.float32)   # (252,)


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
