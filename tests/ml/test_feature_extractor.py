"""
SignBridge — Feature Extractor Tests
======================================
Tests for the production 126-feature holistic extractor and temporal pooling.

Run with:
    .venv/Scripts/python -m pytest tests/ml/test_feature_extractor.py -v
"""

from __future__ import annotations
import numpy as np
import pytest
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from backend.ml.feature_extractor import (
    extract_holistic_features,
    pool_frame_sequence,
    encode_landmarks_legacy,
    N_FEATURES,
    N_HAND_FEATURES,
)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_hand(n=21, x=0.5, y=0.5, z=0.0):
    return [{"x": x, "y": y, "z": z} for _ in range(n)]

def _make_pose(n=33):
    """Pose with shoulders at indices 11 (left) and 12 (right)."""
    lms = [{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(n)]
    lms[11] = {"x": 0.4, "y": 0.5, "z": 0.0}   # left shoulder
    lms[12] = {"x": 0.6, "y": 0.5, "z": 0.0}   # right shoulder  (width = 0.2)
    return lms


# ── Shape and dtype ───────────────────────────────────────────────────────────

class TestShape:
    def test_output_shape(self):
        feat = extract_holistic_features(_make_hand(), _make_hand())
        assert feat.shape == (N_FEATURES,), f"Expected ({N_FEATURES},), got {feat.shape}"

    def test_output_dtype(self):
        feat = extract_holistic_features(_make_hand(), _make_hand())
        assert feat.dtype == np.float32

    def test_right_hand_only(self):
        feat = extract_holistic_features(_make_hand(), None)
        assert feat.shape == (N_FEATURES,)
        # Left-hand block should be zeros
        assert (feat[N_HAND_FEATURES:] == 0).all()

    def test_left_hand_only(self):
        feat = extract_holistic_features(None, _make_hand())
        assert feat.shape == (N_FEATURES,)
        # Right-hand block should be zeros
        assert (feat[:N_HAND_FEATURES] == 0).all()

    def test_both_hands_missing(self):
        feat = extract_holistic_features(None, None)
        assert feat.shape == (N_FEATURES,)
        assert (feat == 0).all()

    def test_empty_lists(self):
        feat = extract_holistic_features([], [])
        assert feat.shape == (N_FEATURES,)
        assert (feat == 0).all()

    def test_partial_hand_landmarks(self):
        # Fewer than 21 landmarks → treated as missing
        feat = extract_holistic_features(_make_hand(n=5), _make_hand())
        assert feat.shape == (N_FEATURES,)
        assert (feat[:N_HAND_FEATURES] == 0).all()


# ── Normalization ─────────────────────────────────────────────────────────────

class TestNormalization:
    def test_no_pose_returns_unnormalized(self):
        hand = _make_hand(x=0.5, y=0.5, z=0.0)
        feat_no_pose  = extract_holistic_features(hand, None, pose=None)
        feat_none_pose = extract_holistic_features(hand, None, pose=None)
        np.testing.assert_array_equal(feat_no_pose, feat_none_pose)

    def test_pose_normalization_changes_values(self):
        hand = _make_hand(x=0.5, y=0.5, z=0.0)
        pose = _make_pose()
        feat_raw  = extract_holistic_features(hand, None, pose=None)
        feat_norm = extract_holistic_features(hand, None, pose=pose)
        # With valid pose, coordinates are centered & scaled — values differ
        assert not np.allclose(feat_raw[:N_HAND_FEATURES], feat_norm[:N_HAND_FEATURES])

    def test_scale_invariance(self):
        """Doubling the signer's apparent size should give the same features."""
        # Simulate signer 2x farther from camera: all coords scaled by 0.5 toward center (0.5,0.5)
        def scale_hand(scale):
            return [{"x": 0.5 + (0.5 - 0.5) * scale,
                     "y": 0.5 + (0.4 - 0.5) * scale,
                     "z": 0.0}
                    for _ in range(21)]

        def scale_pose(scale):
            lms = [{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(33)]
            lms[11] = {"x": 0.5 + (0.4 - 0.5) * scale, "y": 0.5, "z": 0.0}
            lms[12] = {"x": 0.5 + (0.6 - 0.5) * scale, "y": 0.5, "z": 0.0}
            return lms

        feat1 = extract_holistic_features(scale_hand(1.0), None, pose=scale_pose(1.0))
        feat2 = extract_holistic_features(scale_hand(0.5), None, pose=scale_pose(0.5))
        np.testing.assert_allclose(feat1, feat2, atol=1e-5,
                                   err_msg="Features should be scale-invariant")

    def test_degenerate_pose_no_crash(self):
        """Zero-width shoulders (degenerate pose) should not raise."""
        pose = _make_pose()
        pose[11] = pose[12] = {"x": 0.5, "y": 0.5, "z": 0.0}  # same point → width=0
        feat = extract_holistic_features(_make_hand(), None, pose=pose)
        assert feat.shape == (N_FEATURES,)
        assert not np.any(np.isnan(feat))
        assert not np.any(np.isinf(feat))

    def test_short_pose_falls_back_gracefully(self):
        """Pose with fewer than 13 landmarks should not crash."""
        feat = extract_holistic_features(_make_hand(), None, pose=[{"x": 0.5, "y": 0.5, "z": 0.0}] * 5)
        assert feat.shape == (N_FEATURES,)


# ── Temporal pooling ──────────────────────────────────────────────────────────

class TestPoolFrameSequence:
    def test_output_shape(self):
        frames = [np.zeros(N_FEATURES, dtype=np.float32) for _ in range(16)]
        pooled = pool_frame_sequence(frames)
        assert pooled.shape == (N_FEATURES * 2,)

    def test_output_dtype(self):
        frames = [np.random.rand(N_FEATURES).astype(np.float32) for _ in range(8)]
        pooled = pool_frame_sequence(frames)
        assert pooled.dtype == np.float32

    def test_empty_frames(self):
        pooled = pool_frame_sequence([])
        assert pooled.shape == (N_FEATURES * 2,)
        assert (pooled == 0).all()

    def test_mean_block(self):
        frames = [np.full(N_FEATURES, float(i), dtype=np.float32) for i in range(4)]
        pooled = pool_frame_sequence(frames)
        expected_mean = np.mean([0, 1, 2, 3])
        np.testing.assert_allclose(pooled[:N_FEATURES], expected_mean, atol=1e-5)

    def test_std_block(self):
        frames = [np.full(N_FEATURES, float(i), dtype=np.float32) for i in range(4)]
        pooled = pool_frame_sequence(frames)
        expected_std = np.std([0.0, 1.0, 2.0, 3.0])
        np.testing.assert_allclose(pooled[N_FEATURES:], expected_std, atol=1e-5)

    def test_static_sign_zero_std(self):
        """All identical frames should give zero std (no motion)."""
        frame = np.random.rand(N_FEATURES).astype(np.float32)
        frames = [frame.copy() for _ in range(10)]
        pooled = pool_frame_sequence(frames)
        np.testing.assert_allclose(pooled[N_FEATURES:], 0.0, atol=1e-5)

    def test_single_frame(self):
        frame = np.random.rand(N_FEATURES).astype(np.float32)
        pooled = pool_frame_sequence([frame])
        assert pooled.shape == (N_FEATURES * 2,)


# ── Legacy shim ───────────────────────────────────────────────────────────────

class TestLegacyShim:
    def test_shape(self):
        lms = _make_hand(n=21)
        feat = encode_landmarks_legacy(lms)
        assert feat.shape == (N_FEATURES,)

    def test_left_block_zeros(self):
        lms = _make_hand(n=21)
        feat = encode_landmarks_legacy(lms)
        # Left hand should be zeros (no left-hand data in legacy format)
        assert (feat[N_HAND_FEATURES:] == 0).all()

    def test_empty_input(self):
        feat = encode_landmarks_legacy([])
        assert feat.shape == (N_FEATURES,)
        assert (feat == 0).all()

    def test_short_input(self):
        feat = encode_landmarks_legacy(_make_hand(n=5))
        assert feat.shape == (N_FEATURES,)
        assert (feat == 0).all()


# ── API integration ───────────────────────────────────────────────────────────

class TestAPIIntegration:
    @pytest.fixture(scope="class")
    def client(self):
        from fastapi.testclient import TestClient
        from backend.main import app
        return TestClient(app)

    def test_classify_holistic_format(self, client):
        hand = _make_hand()
        resp = client.post("/api/sign/classify", json={
            "right_hand": hand,
            "left_hand":  hand,
            "pose":       _make_pose(),
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "predicted_sign" in data
        assert 0.0 <= data["confidence"] <= 1.0

    def test_classify_legacy_format(self, client):
        resp = client.post("/api/sign/classify", json={
            "landmarks": _make_hand(),
        })
        assert resp.status_code == 200

    def test_classify_empty_raises_422(self, client):
        resp = client.post("/api/sign/classify", json={})
        assert resp.status_code == 422

    def test_landmark_response_shape(self, client):
        """extract-landmarks returns right_hand/left_hand/pose fields."""
        import base64, struct
        # Minimal 1×1 white JPEG
        tiny_jpeg = (
            b'\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00'
            b'\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t'
            b'\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a'
            b'\x1f\x1e\x1d\x1a\x1c\x1c $.\' ",#\x1c\x1c(7),01444\x1f\'9=82<.342\x1e\x1e'
            b'=49=\x16\x00\x01\x01\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01'
            b'\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01'
            b'\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08'
            b'\t\n\x0b\xff\xc4\x00\xb5\x10\x00\x02\x01\x03\x03\x02\x04\x03\x05'
            b'\x05\x04\x04\x00\x00\x01}\x01\x02\x03\x00\x04\x11\x05\x12!'
            b'1A\x06\x13Qa\x07"q\x142\x81\x91\xa1\x08#B\xb1\xc1\x15R\xd1'
            b'\xf0$3br\x82\t\n\x16\x17\x18\x19\x1a%&\'()*456789:CDEFGHIJ'
            b'STUVWXYZ\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xfb\xd4P\x00\x00\x00\xff\xd9'
        )
        b64 = base64.b64encode(tiny_jpeg).decode()
        resp = client.post("/api/sign/extract-landmarks", json={
            "frame_b64": b64, "width": 1, "height": 1,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "right_hand" in data
        assert "left_hand"  in data
        assert "pose"       in data
        assert "hand_detected" in data
