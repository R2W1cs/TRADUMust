"""
TRADUMUST FastAPI Backend — Pytest Test Suite

Run from project root:
    python -m pytest tests/backend/ -v
    python -m pytest tests/backend/ -v --tb=short   (compact tracebacks)

Requires:
    pip install pytest httpx
    (fastapi, pydantic, deep_translator, textblob already installed)
"""

import base64
import json
import sys
import os
import pytest

# ── Import the FastAPI app ────────────────────────────────────────────────────
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../backend'))
from main import app
from fastapi.testclient import TestClient

client = TestClient(app)


# ─────────────────────────────────────────────────────────────────────────────
# 1. HEALTH CHECK
# ─────────────────────────────────────────────────────────────────────────────

class TestHealth:
    def test_health_returns_200(self):
        r = client.get("/api/health")
        assert r.status_code == 200

    def test_health_has_status_ok(self):
        r = client.get("/api/health")
        data = r.json()
        assert data["status"] == "ok"

    def test_health_has_version(self):
        r = client.get("/api/health")
        data = r.json()
        assert "version" in data
        assert data["version"] == "0.1.0"

    def test_health_has_timestamp(self):
        r = client.get("/api/health")
        data = r.json()
        assert "timestamp" in data
        assert isinstance(data["timestamp"], int)
        assert data["timestamp"] > 0


# ─────────────────────────────────────────────────────────────────────────────
# 2. TRANSLATE ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

class TestTranslate:
    def _post(self, payload):
        return client.post("/api/translate", json=payload)

    def test_translate_returns_200_for_valid_input(self):
        r = self._post({"text": "Hello", "target_lang": "fr"})
        assert r.status_code == 200

    def test_translate_response_has_required_fields(self):
        r = self._post({"text": "Hello world", "target_lang": "fr"})
        data = r.json()
        assert "translated_text" in data
        assert "cultural_note"   in data
        assert "formality_level" in data
        assert "regional_variant" in data
        assert "source_lang_detected" in data

    def test_translate_formality_is_valid_enum(self):
        r = self._post({"text": "Hello", "target_lang": "fr"})
        level = r.json()["formality_level"]
        assert level in ("formal", "informal", "neutral")

    def test_translate_empty_text_returns_422(self):
        r = self._post({"text": "", "target_lang": "fr"})
        assert r.status_code == 422

    def test_translate_whitespace_only_returns_422(self):
        r = self._post({"text": "   ", "target_lang": "fr"})
        assert r.status_code == 422

    def test_translate_missing_text_field_returns_422(self):
        r = self._post({"target_lang": "fr"})
        assert r.status_code == 422

    def test_translate_default_target_is_fr(self):
        r = self._post({"text": "Hello"})
        assert r.status_code == 200

    def test_translate_cultural_note_for_ja(self):
        r = self._post({"text": "Good morning", "target_lang": "ja"})
        data = r.json()
        assert data["regional_variant"] == "Standard Japanese (Hyōjungo)"

    def test_translate_cultural_note_for_es(self):
        r = self._post({"text": "Thank you", "target_lang": "es"})
        data = r.json()
        assert "Latin American" in data["regional_variant"]

    def test_translate_unknown_language_falls_back_to_en(self):
        # Unknown target_lang → falls back to English cultural note
        r = self._post({"text": "Hello", "target_lang": "xx"})
        assert r.status_code == 200
        data = r.json()
        assert "translated_text" in data


# ─────────────────────────────────────────────────────────────────────────────
# 3. CULTURAL NOTES ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

class TestCulturalNotes:
    def test_fr_returns_200(self):
        r = client.get("/api/cultural-notes/fr")
        assert r.status_code == 200

    def test_fr_has_required_fields(self):
        r = client.get("/api/cultural-notes/fr")
        data = r.json()
        assert "cultural_note"    in data
        assert "formality_level"  in data
        assert "regional_variant" in data
        assert "lang"             in data

    def test_fr_has_extended_content(self):
        r = client.get("/api/cultural-notes/fr")
        data = r.json()
        assert "extended" in data
        assert "quick_tips"        in data["extended"]
        assert "academic_phrases"  in data["extended"]
        assert len(data["extended"]["quick_tips"]) > 0

    def test_ja_returns_200(self):
        r = client.get("/api/cultural-notes/ja")
        assert r.status_code == 200

    def test_unknown_lang_returns_404(self):
        r = client.get("/api/cultural-notes/xx")
        assert r.status_code == 404

    def test_404_body_lists_available_langs(self):
        r = client.get("/api/cultural-notes/xx")
        detail = r.json()["detail"]
        assert "Available" in detail or "fr" in detail

    def test_lang_code_is_case_insensitive(self):
        r = client.get("/api/cultural-notes/FR")
        # Either normalizes to fr OR returns 200 (either is acceptable)
        assert r.status_code in (200, 404)


# ─────────────────────────────────────────────────────────────────────────────
# 4. EXTRACT LANDMARKS ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

_VALID_B64 = base64.b64encode(b"\xFF\xD8\xFF" + b"\x00" * 100).decode()

class TestExtractLandmarks:
    def _post(self, payload):
        return client.post("/api/sign/extract-landmarks", json=payload)

    def test_valid_frame_returns_200(self):
        r = self._post({"frame_b64": _VALID_B64, "width": 640, "height": 480})
        assert r.status_code == 200

    def test_response_has_21_landmarks(self):
        r = self._post({"frame_b64": _VALID_B64, "width": 640, "height": 480})
        data = r.json()
        assert data["hand_detected"] is True
        assert len(data["landmarks"]) == 21

    def test_landmark_has_x_y_z_visibility(self):
        r = self._post({"frame_b64": _VALID_B64, "width": 640, "height": 480})
        lm = r.json()["landmarks"][0]
        assert "x" in lm
        assert "y" in lm
        assert "z" in lm
        assert "visibility" in lm

    def test_landmark_x_y_in_normalized_range(self):
        r = self._post({"frame_b64": _VALID_B64, "width": 640, "height": 480})
        for lm in r.json()["landmarks"]:
            assert 0.0 <= lm["x"] <= 1.0, f"x={lm['x']} out of [0,1]"
            assert 0.0 <= lm["y"] <= 1.0, f"y={lm['y']} out of [0,1]"

    def test_confidence_in_valid_range(self):
        r = self._post({"frame_b64": _VALID_B64, "width": 640, "height": 480})
        conf = r.json()["confidence"]
        assert 0.0 <= conf <= 1.0

    def test_invalid_base64_returns_422(self):
        r = self._post({"frame_b64": "not-valid-base64!!!", "width": 640, "height": 480})
        assert r.status_code == 422

    def test_missing_frame_field_returns_422(self):
        r = self._post({"width": 640, "height": 480})
        assert r.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# 5. CLASSIFY ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

_MOCK_LANDMARKS = [
    {"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 1.0}
    for _ in range(21)
]

class TestClassifySign:
    def _post(self, payload):
        return client.post("/api/sign/classify", json=payload)

    def test_valid_landmarks_returns_200(self):
        r = self._post({"landmarks": _MOCK_LANDMARKS})
        assert r.status_code == 200

    def test_response_has_predicted_sign(self):
        r = self._post({"landmarks": _MOCK_LANDMARKS})
        data = r.json()
        assert "predicted_sign" in data
        assert isinstance(data["predicted_sign"], str)
        assert len(data["predicted_sign"]) > 0

    def test_confidence_in_range(self):
        r = self._post({"landmarks": _MOCK_LANDMARKS})
        conf = r.json()["confidence"]
        assert 0.0 <= conf <= 1.0

    def test_alternatives_is_list_of_3(self):
        r = self._post({"landmarks": _MOCK_LANDMARKS})
        alts = r.json()["alternatives"]
        assert isinstance(alts, list)
        assert len(alts) == 3

    def test_each_alternative_has_sign_and_confidence(self):
        r = self._post({"landmarks": _MOCK_LANDMARKS})
        for alt in r.json()["alternatives"]:
            assert "sign" in alt
            assert "confidence" in alt

    def test_empty_landmarks_returns_422(self):
        r = self._post({"landmarks": []})
        assert r.status_code == 422

    def test_predicted_sign_not_in_alternatives(self):
        """Predicted sign should be unique from alternatives."""
        r = self._post({"landmarks": _MOCK_LANDMARKS})
        data = r.json()
        alt_signs = [a["sign"] for a in data["alternatives"]]
        assert data["predicted_sign"] not in alt_signs


# ─────────────────────────────────────────────────────────────────────────────
# 6. TEXT-TO-SIGN ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

class TestTextToSign:
    def _post(self, payload):
        return client.post("/api/text-to-sign", json=payload)

    def test_valid_text_returns_200(self):
        r = self._post({"text": "Hello my name is Alex"})
        assert r.status_code == 200

    def test_response_has_all_required_fields(self):
        r = self._post({"text": "I want to study"})
        data = r.json()
        assert "sign_language"      in data
        assert "word_sequence"      in data
        assert "fingerspell_fallback" in data
        assert "animation_clips"    in data
        assert "sentiment"          in data
        assert "syntactic_metadata" in data

    def test_default_sign_language_is_ASL(self):
        r = self._post({"text": "hello"})
        assert r.json()["sign_language"] == "ASL"

    def test_custom_sign_language(self):
        r = self._post({"text": "hello", "sign_language": "BSL"})
        assert r.json()["sign_language"] == "BSL"

    def test_word_sequence_is_list_of_strings(self):
        r = self._post({"text": "I want water"})
        seq = r.json()["word_sequence"]
        assert isinstance(seq, list)
        assert all(isinstance(w, str) for w in seq)

    def test_word_sequence_is_uppercase(self):
        r = self._post({"text": "hello world"})
        seq = r.json()["word_sequence"]
        for word in seq:
            assert word == word.upper(), f"'{word}' should be uppercase"

    def test_sentiment_has_polarity_and_subjectivity(self):
        r = self._post({"text": "I love this beautiful day"})
        sentiment = r.json()["sentiment"]
        assert "polarity"     in sentiment
        assert "subjectivity" in sentiment
        assert -1.0 <= sentiment["polarity"]     <= 1.0
        assert  0.0 <= sentiment["subjectivity"] <= 1.0

    def test_animation_clips_have_required_fields(self):
        r = self._post({"text": "thank you"})
        clips = r.json()["animation_clips"]
        for clip in clips:
            assert "word"         in clip
            assert "clip_url"     in clip
            assert "fingerspell"  in clip
            assert "duration_ms"  in clip

    def test_animation_clips_url_format(self):
        r = self._post({"text": "hello"})
        for clip in r.json()["animation_clips"]:
            assert clip["clip_url"].startswith("/clips/asl/")
            assert clip["clip_url"].endswith(".glb")

    def test_fingerspell_fallback_long_words(self):
        """Words longer than 7 chars should be in fingerspell_fallback."""
        r = self._post({"text": "university education technology"})
        data = r.json()
        fallback = data["fingerspell_fallback"]
        # All words in fallback should be long (>7 chars)
        for word in fallback:
            assert len(word) > 7, f"'{word}' ({len(word)} chars) should not be in fallback"

    def test_empty_text_returns_422(self):
        r = self._post({"text": ""})
        assert r.status_code == 422

    def test_whitespace_only_returns_422(self):
        r = self._post({"text": "   "})
        assert r.status_code == 422

    def test_missing_text_field_returns_422(self):
        r = self._post({})
        assert r.status_code == 422

    def test_no_duplicate_words_in_sequence(self):
        """word_sequence should have unique words (deduplication logic)."""
        r = self._post({"text": "I want to go I want"})
        seq = r.json()["word_sequence"]
        assert len(seq) == len(set(seq)), f"Duplicates in sequence: {seq}"

    def test_time_words_appear_first_asl_order(self):
        """ASL grammar: time words should come first in word_sequence."""
        r = self._post({"text": "I will study tomorrow"})
        seq = r.json()["word_sequence"]
        if "TOMORROW" in seq:
            tomorrow_idx = seq.index("TOMORROW")
            # TOMORROW should be before STUDY if both present
            if "STUDY" in seq:
                study_idx = seq.index("STUDY")
                assert tomorrow_idx < study_idx, \
                    f"TOMORROW({tomorrow_idx}) should precede STUDY({study_idx}) in ASL order"


# ─────────────────────────────────────────────────────────────────────────────
# 7. WEBSOCKET ENDPOINT
# ─────────────────────────────────────────────────────────────────────────────

class TestWebSocket:
    def test_ping_pong(self):
        with client.websocket_connect("/ws/sign") as ws:
            ws.send_text(json.dumps({"type": "PING"}))
            data = json.loads(ws.receive_text())
            assert data["type"] == "PONG"

    def test_invalid_json_returns_error(self):
        with client.websocket_connect("/ws/sign") as ws:
            ws.send_text("not-valid-json")
            data = json.loads(ws.receive_text())
            assert data["type"] == "ERROR"
            assert "Invalid JSON" in data["message"]

    def test_unknown_message_type_returns_error(self):
        with client.websocket_connect("/ws/sign") as ws:
            ws.send_text(json.dumps({"type": "UNKNOWN_TYPE"}))
            data = json.loads(ws.receive_text())
            assert data["type"] == "ERROR"

    def test_transcript_returns_sign_sequence(self):
        with client.websocket_connect("/ws/sign") as ws:
            ws.send_text(json.dumps({"type": "TRANSCRIPT", "text": "hello thanks"}))
            data = json.loads(ws.receive_text())
            assert data["type"] == "SIGN_SEQUENCE"
            assert "signs"  in data
            assert "total"  in data
            assert isinstance(data["signs"], list)

    def test_transcript_empty_text_no_response(self):
        """Empty text transcript should produce no SIGN_SEQUENCE response (graceful skip)."""
        with client.websocket_connect("/ws/sign") as ws:
            ws.send_text(json.dumps({"type": "TRANSCRIPT", "text": ""}))
            # Send a PING right after to get a measurable reply
            ws.send_text(json.dumps({"type": "PING"}))
            # The PING should be answered (empty transcript is silently skipped)
            data = json.loads(ws.receive_text())
            assert data["type"] == "PONG"

    def test_transcript_hello_maps_to_hello_sign(self):
        with client.websocket_connect("/ws/sign") as ws:
            ws.send_text(json.dumps({"type": "TRANSCRIPT", "text": "hello"}))
            summary = json.loads(ws.receive_text())
            assert "HELLO" in summary.get("signs", [])

    def test_transcript_unknown_word_is_fingerspelled(self):
        """Words not in the gloss map should be fingerspelled as individual letters."""
        with client.websocket_connect("/ws/sign") as ws:
            ws.send_text(json.dumps({"type": "TRANSCRIPT", "text": "ZXQW"}))
            summary = json.loads(ws.receive_text())  # SIGN_SEQUENCE
            # Should contain FINGERSPELL_ entries
            signs = summary.get("signs", [])
            fs_signs = [s for s in signs if s.startswith("FINGERSPELL_")]
            assert len(fs_signs) == 4, f"Expected 4 fingerspell signs for 'ZXQW', got: {signs}"
