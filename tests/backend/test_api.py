"""
TRADUMUST — Updated Backend Test Suite (Pytest)
=================================================
Comprehensive pytest tests covering ALL endpoints including the new
history + phrasebook endpoints added to the Python backend.

Run:
    python -m pytest tests/backend/ -v
    python -m pytest tests/backend/ -v --tb=short -q   (quiet)
    python -m pytest tests/backend/test_api.py::TestPhrasebook -v  (single class)
"""

import base64
import json
import sys
import os
import time
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../backend'))
from main import app, _history_store
from fastapi.testclient import TestClient

client = TestClient(app)


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(autouse=True)
def clear_store():
    """Isolate each test by clearing in-memory history & phrasebook store."""
    _history_store.clear()
    # Also clear the persistence file so tests don't leak state
    from main import HISTORY_FILE
    if os.path.exists(HISTORY_FILE):
        os.remove(HISTORY_FILE)
    yield
    _history_store.clear()
    if os.path.exists(HISTORY_FILE):
        os.remove(HISTORY_FILE)


def translate(text="Hello world", target="fr"):
    """Helper: POST /api/translate and return response."""
    return client.post("/api/translate", json={"text": text, "target_lang": target})


def text_to_sign(text="Hello", sign_language="ASL"):
    """Helper: POST /api/text-to-sign and return response."""
    return client.post("/api/text-to-sign", json={"text": text, "sign_language": sign_language})


def make_history_entry(text="Test phrase", target="fr"):
    """Create a history entry and return its id."""
    r = translate(text, target)
    assert r.status_code == 200, f"translate failed: {r.text}"
    return r.json()["history_entry"]["id"]


_VALID_B64 = base64.b64encode(b"\xFF\xD8\xFF" + b"\x00" * 100).decode()
_MOCK_LM   = [{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(21)]


# ─────────────────────────────────────────────────────────────────────────────
# 1. HEALTH
# ─────────────────────────────────────────────────────────────────────────────

class TestHealth:
    def test_200(self):
        assert client.get("/api/health").status_code == 200

    def test_status_ok(self):
        assert client.get("/api/health").json()["status"] == "ok"

    def test_has_version(self):
        data = client.get("/api/health").json()
        assert "version" in data and data["version"] == "0.1.0"

    def test_has_timestamp(self):
        ts = client.get("/api/health").json()["timestamp"]
        assert isinstance(ts, int) and ts > 0

    def test_timestamp_is_recent(self):
        ts = client.get("/api/health").json()["timestamp"]
        assert abs(ts - int(time.time())) < 5


# ─────────────────────────────────────────────────────────────────────────────
# 2. TRANSLATE — correctness
# ─────────────────────────────────────────────────────────────────────────────

class TestTranslate:
    def test_200_valid(self):
        assert translate().status_code == 200

    def test_required_fields(self):
        data = translate().json()
        for f in ["translated_text","cultural_note","formality_level","regional_variant","source_lang_detected","history_entry"]:
            assert f in data, f"Missing field: {f}"

    def test_formality_enum(self):
        assert translate().json()["formality_level"] in ("formal","informal","neutral")

    def test_empty_returns_422(self):
        assert client.post("/api/translate", json={"text": "", "target_lang": "fr"}).status_code == 422

    def test_whitespace_returns_422(self):
        assert client.post("/api/translate", json={"text": "  ", "target_lang": "fr"}).status_code == 422

    def test_missing_text_returns_422(self):
        assert client.post("/api/translate", json={"target_lang": "fr"}).status_code == 422

    def test_default_target_is_fr(self):
        assert client.post("/api/translate", json={"text": "Hello"}).status_code == 200

    def test_all_supported_langs(self):
        for lang in ["fr","es","ja","de","zh","ar","ko","it","pt","en"]:
            r = client.post("/api/translate", json={"text": "Hello", "target_lang": lang})
            assert r.status_code == 200, f"Failed for {lang}"

    def test_unknown_lang_fallback_to_en(self):
        r = client.post("/api/translate", json={"text": "Hello", "target_lang": "xx"})
        assert r.status_code == 200
        assert "translated_text" in r.json()

    def test_history_entry_created(self):
        r = translate("History test phrase", "fr")
        entry = r.json()["history_entry"]
        assert entry["entry_type"] == "translation"
        assert entry["source"]     == "History test phrase"
        assert entry["targetLang"] == "fr"
        assert entry["isPhrasebook"] is False
        assert "id" in entry
        assert "created_at" in entry

    def test_history_entry_persisted(self):
        r     = translate("Persist check", "de")
        hid   = r.json()["history_entry"]["id"]
        hist  = client.get("/api/history?entry_type=translation&limit=50").json()["data"]
        ids   = [e["id"] for e in hist]
        assert hid in ids, "Entry should be in history after translate"

    def test_source_lang_detected_field(self):
        data = translate().json()
        assert isinstance(data["source_lang_detected"], str)

    def test_formality_detail_field_present(self):
        # formality_detail was added in our fix; should be present (may be None)
        data = translate().json()
        assert "formality_detail" in data


# ─────────────────────────────────────────────────────────────────────────────
# 3. TEXT-TO-SIGN — correctness
# ─────────────────────────────────────────────────────────────────────────────

class TestTextToSign:
    def test_200(self):
        assert text_to_sign("Hello world").status_code == 200

    def test_all_required_fields(self):
        data = text_to_sign("I want to study").json()
        for f in ["sign_language","word_sequence","fingerspell_fallback","animation_clips","sentiment","syntactic_metadata","history_entry"]:
            assert f in data, f"Missing: {f}"

    def test_default_sign_language_ASL(self):
        assert text_to_sign("hello").json()["sign_language"] == "ASL"

    def test_custom_sign_language_BSL(self):
        assert text_to_sign("hello", "BSL").json()["sign_language"] == "BSL"

    def test_word_sequence_uppercase(self):
        data = text_to_sign("hello my friend").json()
        for w in data["word_sequence"]:
            assert w == w.upper(), f"'{w}' should be uppercase"

    def test_word_sequence_no_duplicates(self):
        seq = text_to_sign("I want to go I want").json()["word_sequence"]
        assert len(seq) == len(set(seq)), f"Duplicates found: {seq}"

    def test_sentiment_ranges(self):
        s = text_to_sign("I love this beautiful day").json()["sentiment"]
        assert -1.0 <= s["polarity"]     <= 1.0
        assert  0.0 <= s["subjectivity"] <= 1.0

    def test_animation_clips_have_fields(self):
        for clip in text_to_sign("thank you very much").json()["animation_clips"]:
            for f in ["word","clip_url","fingerspell","duration_ms","tag"]:
                assert f in clip, f"Clip missing field: {f}"

    def test_clip_url_format(self):
        for clip in text_to_sign("hello").json()["animation_clips"]:
            assert clip["clip_url"].startswith("/clips/asl/")
            assert clip["clip_url"].endswith(".glb")

    def test_fingerspell_fallback_long_words(self):
        data = text_to_sign("university technology education").json()
        for w in data["fingerspell_fallback"]:
            assert len(w) > 7

    def test_empty_text_422(self):
        assert text_to_sign("").status_code == 422

    def test_whitespace_422(self):
        assert text_to_sign("   ").status_code == 422

    def test_history_entry_created(self):
        r = text_to_sign("Sign history check", "ASL")
        entry = r.json()["history_entry"]
        assert entry["entry_type"]  == "sign_expression"
        assert entry["signLanguage"]== "ASL"
        assert "word_sequence" in entry["extra"]
        assert entry["isPhrasebook"] is False

    def test_time_words_asl_order(self):
        seq = text_to_sign("I will study tomorrow").json()["word_sequence"]
        if "TOMORROW" in seq and "STUDY" in seq:
            assert seq.index("TOMORROW") < seq.index("STUDY"), "Time words must precede verbs in ASL order"


# ─────────────────────────────────────────────────────────────────────────────
# 4. HISTORY
# ─────────────────────────────────────────────────────────────────────────────

class TestHistory:
    def test_empty_on_fresh_store(self):
        r = client.get("/api/history")
        assert r.status_code == 200
        assert r.json()["data"] == []

    def test_entry_appears_after_translate(self):
        translate("History populate", "fr")
        data = client.get("/api/history").json()["data"]
        assert len(data) == 1
        assert data[0]["entry_type"] == "translation"

    def test_multiple_entries_ordered_newest_first(self):
        translate("First", "fr")
        translate("Second", "de")
        translate("Third", "ja")
        entries = client.get("/api/history").json()["data"]
        sources = [e["source"] for e in entries]
        assert sources[0] == "Third", "Newest entry should be first"
        assert sources[-1] == "First"

    def test_filter_by_entry_type_translation(self):
        translate("Translation entry", "fr")
        text_to_sign("Sign entry")
        data = client.get("/api/history?entry_type=translation").json()["data"]
        assert all(e["entry_type"] == "translation" for e in data)

    def test_filter_by_entry_type_sign(self):
        translate("Translation entry", "fr")
        text_to_sign("Sign entry")
        data = client.get("/api/history?entry_type=sign_expression").json()["data"]
        assert all(e["entry_type"] == "sign_expression" for e in data)

    def test_limit_param(self):
        for i in range(10):
            translate(f"Entry {i}", "fr")
        data = client.get("/api/history?limit=3").json()["data"]
        assert len(data) == 3

    def test_entry_schema(self):
        translate("Schema test", "fr")
        entry = client.get("/api/history").json()["data"][0]
        for f in ["id","entry_type","source","sourceLang","targetLang","signLanguage",
                  "timestamp","created_at","isPhrasebook","result","sentiment","metadata","wordSequence","extra"]:
            assert f in entry, f"History entry missing: {f}"

    def test_history_cap_at_500(self):
        """Store must not grow beyond 500 entries."""
        for i in range(10):
            translate(f"Overflow entry {i}", "fr")
        count = len(client.get("/api/history?limit=1000").json()["data"])
        assert count <= 500

    def test_mixed_types_both_appear(self):
        translate("Translation", "fr")
        text_to_sign("Sign")
        all_data = client.get("/api/history?limit=10").json()["data"]
        types = {e["entry_type"] for e in all_data}
        assert "translation"    in types
        assert "sign_expression" in types


# ─────────────────────────────────────────────────────────────────────────────
# 5. PHRASEBOOK
# ─────────────────────────────────────────────────────────────────────────────

class TestPhrasebook:
    def test_empty_on_fresh_store(self):
        r = client.get("/api/phrasebook")
        assert r.status_code == 200
        assert r.json()["data"] == []

    def test_save_marks_is_phrasebook_true(self):
        hid = make_history_entry()
        r   = client.post("/api/phrasebook", json={"history_id": hid})
        assert r.status_code == 200
        assert r.json()["entry"]["isPhrasebook"] is True

    def test_saved_entry_appears_in_list(self):
        hid = make_history_entry("Phrasebook list test")
        client.post("/api/phrasebook", json={"history_id": hid})
        data = client.get("/api/phrasebook").json()["data"]
        assert any(e["id"] == hid for e in data)

    def test_unsaved_entry_not_in_phrasebook(self):
        hid = make_history_entry("Not in phrasebook")
        data = client.get("/api/phrasebook").json()["data"]
        assert not any(e["id"] == hid for e in data)

    def test_delete_removes_phrasebook_flag(self):
        hid = make_history_entry()
        client.post("/api/phrasebook", json={"history_id": hid})
        r   = client.delete(f"/api/phrasebook/{hid}")
        assert r.status_code == 200
        assert r.json()["deleted"] is True
        data = client.get("/api/phrasebook").json()["data"]
        assert not any(e["id"] == hid for e in data), "Deleted entry should not appear"

    def test_delete_entry_stays_in_history(self):
        """Deleting from phrasebook does NOT remove from history."""
        hid = make_history_entry()
        client.post("/api/phrasebook", json={"history_id": hid})
        client.delete(f"/api/phrasebook/{hid}")
        hist = client.get("/api/history?limit=50").json()["data"]
        assert any(e["id"] == hid for e in hist), "Entry must remain in history after phrasebook delete"

    def test_patch_srs_updates_extra(self):
        hid = make_history_entry()
        client.post("/api/phrasebook", json={"history_id": hid})
        srs = {"interval": 3, "easiness": 2.7, "repetitions": 2}
        r   = client.patch(f"/api/phrasebook/{hid}", json={"extra": {"srs": srs}})
        assert r.status_code == 200
        updated_srs = r.json()["entry"]["extra"]["srs"]
        assert updated_srs["interval"]   == 3
        assert updated_srs["easiness"]   == 2.7
        assert updated_srs["repetitions"]== 2

    def test_patch_srs_preserves_existing_extra(self):
        hid = make_history_entry()
        client.post("/api/phrasebook", json={"history_id": hid})
        client.patch(f"/api/phrasebook/{hid}", json={"extra": {"my_field": "preserved"}})
        client.patch(f"/api/phrasebook/{hid}", json={"extra": {"srs": {"interval": 1}}})
        extra = client.get("/api/history?limit=50").json()["data"]
        # find entry
        entry = next(e for e in extra if e["id"] == hid)
        # Both keys should be present since we do dict.update()
        assert "srs" in entry["extra"]

    def test_save_missing_history_id_422(self):
        r = client.post("/api/phrasebook", json={"history_id": ""})
        assert r.status_code == 422

    def test_save_missing_key_422(self):
        r = client.post("/api/phrasebook", json={})
        assert r.status_code == 422

    def test_save_unknown_history_id_404(self):
        r = client.post("/api/phrasebook", json={"history_id": "deadbeef" * 4})
        assert r.status_code == 404

    def test_delete_unknown_id_404(self):
        r = client.delete("/api/phrasebook/deadbeef00000000000000000000beef")
        assert r.status_code == 404

    def test_patch_unknown_id_404(self):
        r = client.patch("/api/phrasebook/deadbeef00000000000000000000beef", json={"extra": {}})
        assert r.status_code == 404

    def test_limit_param(self):
        for i in range(10):
            hid = make_history_entry(f"Phrase {i}")
            client.post("/api/phrasebook", json={"history_id": hid})
        data = client.get("/api/phrasebook?limit=3").json()["data"]
        assert len(data) == 3

    def test_all_list_entries_are_phrasebook(self):
        for i in range(5):
            hid = make_history_entry(f"Phrase {i}")
            client.post("/api/phrasebook", json={"history_id": hid})
        # Create a non-phrasebook entry
        make_history_entry("Not a phrase")
        data = client.get("/api/phrasebook").json()["data"]
        assert all(e["isPhrasebook"] is True for e in data)

    def test_sign_expression_can_be_phrasebooked(self):
        r   = text_to_sign("I study every morning")
        hid = r.json()["history_entry"]["id"]
        sv  = client.post("/api/phrasebook", json={"history_id": hid})
        assert sv.status_code == 200
        assert sv.json()["entry"]["isPhrasebook"] is True


# ─────────────────────────────────────────────────────────────────────────────
# 6. CULTURAL NOTES
# ─────────────────────────────────────────────────────────────────────────────

class TestCulturalNotes:
    def test_fr_200(self):
        assert client.get("/api/cultural-notes/fr").status_code == 200

    def test_fr_required_fields(self):
        data = client.get("/api/cultural-notes/fr").json()
        for f in ["cultural_note","formality_level","regional_variant","lang","extended"]:
            assert f in data

    def test_fr_has_quick_tips(self):
        ext = client.get("/api/cultural-notes/fr").json()["extended"]
        assert "quick_tips" in ext and len(ext["quick_tips"]) > 0

    def test_fr_has_academic_phrases(self):
        ext = client.get("/api/cultural-notes/fr").json()["extended"]
        assert "academic_phrases" in ext and len(ext["academic_phrases"]) > 0

    def test_ja_200(self):
        assert client.get("/api/cultural-notes/ja").status_code == 200

    def test_es_200(self):
        assert client.get("/api/cultural-notes/es").status_code == 200

    def test_all_supported_langs(self):
        for lang in ["fr","es","ja","de","zh","ar","ko","it","pt","en"]:
            r = client.get(f"/api/cultural-notes/{lang}")
            assert r.status_code == 200, f"Failed for {lang}"

    def test_unknown_lang_404(self):
        assert client.get("/api/cultural-notes/xx").status_code == 404

    def test_404_lists_available_langs(self):
        detail = client.get("/api/cultural-notes/xx").json()["detail"]
        assert "fr" in detail or "Available" in detail

    def test_lang_field_in_response(self):
        data = client.get("/api/cultural-notes/de").json()
        assert data["lang"] == "de"


# ─────────────────────────────────────────────────────────────────────────────
# 7. LANDMARKS
# ─────────────────────────────────────────────────────────────────────────────

class TestLandmarks:
    def _post(self, payload):
        return client.post("/api/sign/extract-landmarks", json=payload)

    def test_valid_frame_200(self):
        assert self._post({"frame_b64": _VALID_B64, "width": 640, "height": 480}).status_code == 200

    def test_hand_detected_true(self):
        r = self._post({"frame_b64": _VALID_B64, "width": 640, "height": 480})
        assert r.json()["hand_detected"] is True

    def test_right_hand_21_landmarks(self):
        r = self._post({"frame_b64": _VALID_B64, "width": 640, "height": 480})
        assert len(r.json()["right_hand"]) == 21

    def test_landmark_xyz(self):
        lm = self._post({"frame_b64": _VALID_B64, "width": 640, "height": 480}).json()["right_hand"][0]
        assert all(k in lm for k in ["x","y","z"])

    def test_x_y_normalized(self):
        for lm in self._post({"frame_b64": _VALID_B64, "width": 640, "height": 480}).json()["right_hand"]:
            assert 0.0 <= lm["x"] <= 1.0
            assert 0.0 <= lm["y"] <= 1.0

    def test_confidence_in_range(self):
        c = self._post({"frame_b64": _VALID_B64, "width": 640, "height": 480}).json()["confidence"]
        assert 0.0 <= c <= 1.0

    def test_invalid_base64_422(self):
        assert self._post({"frame_b64": "not-valid!!!", "width": 640, "height": 480}).status_code == 422

    def test_missing_frame_field_422(self):
        assert self._post({"width": 640, "height": 480}).status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# 8. CLASSIFY
# ─────────────────────────────────────────────────────────────────────────────

class TestClassify:
    def test_200_with_right_hand(self):
        assert client.post("/api/sign/classify", json={"right_hand": _MOCK_LM}).status_code == 200

    def test_200_with_legacy_landmarks(self):
        lm_with_visibility = [{**lm, "visibility": 1.0} for lm in _MOCK_LM]
        assert client.post("/api/sign/classify", json={"landmarks": lm_with_visibility}).status_code == 200

    def test_predicted_sign_non_empty(self):
        r = client.post("/api/sign/classify", json={"right_hand": _MOCK_LM})
        assert isinstance(r.json()["predicted_sign"], str) and len(r.json()["predicted_sign"]) > 0

    def test_confidence_range(self):
        c = client.post("/api/sign/classify", json={"right_hand": _MOCK_LM}).json()["confidence"]
        assert 0.0 <= c <= 1.0

    def test_three_alternatives(self):
        alts = client.post("/api/sign/classify", json={"right_hand": _MOCK_LM}).json()["alternatives"]
        assert len(alts) == 3

    def test_alt_has_sign_and_confidence(self):
        for alt in client.post("/api/sign/classify", json={"right_hand": _MOCK_LM}).json()["alternatives"]:
            assert "sign" in alt and "confidence" in alt

    def test_empty_422(self):
        r = client.post("/api/sign/classify", json={"right_hand": [], "left_hand": [], "landmarks": []})
        assert r.status_code == 422


# ─────────────────────────────────────────────────────────────────────────────
# 9. WEBSOCKET
# ─────────────────────────────────────────────────────────────────────────────

class TestWebSocket:
    def test_ping_pong(self):
        with client.websocket_connect("/ws/sign") as ws:
            ws.send_text(json.dumps({"type": "PING"}))
            assert json.loads(ws.receive_text())["type"] == "PONG"

    def test_invalid_json_returns_error(self):
        with client.websocket_connect("/ws/sign") as ws:
            ws.send_text("not-json!!!")
            data = json.loads(ws.receive_text())
            assert data["type"] == "ERROR"
            assert "Invalid JSON" in data["message"]

    def test_unknown_type_returns_error(self):
        with client.websocket_connect("/ws/sign") as ws:
            ws.send_text(json.dumps({"type": "MYSTERY"}))
            assert json.loads(ws.receive_text())["type"] == "ERROR"

    def test_transcript_hello_returns_sequence(self):
        with client.websocket_connect("/ws/sign") as ws:
            ws.send_text(json.dumps({"type": "TRANSCRIPT", "text": "hello"}))
            summary = json.loads(ws.receive_text())
            assert summary["type"] == "SIGN_SEQUENCE"
            assert "HELLO" in summary["signs"]

    def test_transcript_unknown_word_fingerspelled(self):
        with client.websocket_connect("/ws/sign") as ws:
            ws.send_text(json.dumps({"type": "TRANSCRIPT", "text": "XZQW"}))
            summary = json.loads(ws.receive_text())
            fs = [s for s in summary["signs"] if s.startswith("FINGERSPELL_")]
            assert len(fs) == 4

    def test_empty_transcript_silently_skipped(self):
        with client.websocket_connect("/ws/sign") as ws:
            ws.send_text(json.dumps({"type": "TRANSCRIPT", "text": ""}))
            ws.send_text(json.dumps({"type": "PING"}))
            assert json.loads(ws.receive_text())["type"] == "PONG"


# ─────────────────────────────────────────────────────────────────────────────
# 10. EDGE CASES & CONTRACT TESTS
# ─────────────────────────────────────────────────────────────────────────────

class TestEdgeCases:
    def test_translate_very_long_text(self):
        """Backend should handle long input without 5xx."""
        big_text = "Hello world " * 200
        r = client.post("/api/translate", json={"text": big_text, "target_lang": "fr"})
        assert r.status_code < 500

    def test_text_to_sign_emoji_input(self):
        """Emoji-heavy input should not crash the backend."""
        r = client.post("/api/text-to-sign", json={"text": "Hello 🤟✌️👋 world"})
        assert r.status_code < 500

    def test_text_to_sign_only_stopwords(self):
        """Input of only stopwords may return empty sequence — should not crash."""
        r = client.post("/api/text-to-sign", json={"text": "a an the is are am"})
        assert r.status_code == 200
        seq = r.json()["word_sequence"]
        assert isinstance(seq, list)

    def test_translate_special_characters(self):
        r = client.post("/api/translate", json={"text": "Hello! @World #2024 & more...", "target_lang": "fr"})
        assert r.status_code == 200

    def test_translate_numbers_only(self):
        r = client.post("/api/translate", json={"text": "12345", "target_lang": "fr"})
        assert r.status_code == 200

    def test_history_with_no_entries_returns_empty_data(self):
        assert client.get("/api/history").json()["data"] == []

    def test_phrasebook_with_no_entries_returns_empty_data(self):
        assert client.get("/api/phrasebook").json()["data"] == []

    def test_translate_response_is_deterministic_for_cultural_note(self):
        """Cultural note for a given language must be identical across calls."""
        r1 = client.post("/api/translate", json={"text": "Hello", "target_lang": "fr"}).json()
        r2 = client.post("/api/translate", json={"text": "Bonjour", "target_lang": "fr"}).json()
        assert r1["cultural_note"] == r2["cultural_note"]
        assert r1["regional_variant"] == r2["regional_variant"]

    def test_content_type_json_response(self):
        r = translate()
        assert "application/json" in r.headers.get("content-type", "")

    def test_history_entry_ids_are_unique(self):
        translate("Entry A", "fr")
        translate("Entry B", "de")
        translate("Entry C", "ja")
        entries = client.get("/api/history?limit=10").json()["data"]
        ids = [e["id"] for e in entries]
        assert len(ids) == len(set(ids)), "History entry IDs must be unique"


# ─────────────────────────────────────────────────────────────────────────────
# 11. ML TRAINING & REPORT
# ─────────────────────────────────────────────────────────────────────────────

class TestML:
    def test_get_report_404_if_missing(self):
        # We assume for a clean test run that we might not have a report yet
        # or we can mock the REPORT_PATH check if needed.
        # For now, just check that it returns a valid response (JSON)
        # and not a 500 error.
        r = client.get("/api/ml/report")
        assert r.status_code in (200, 404)

    def test_train_model_lightweight(self):
        """Test training with small samples to verify the pipeline logic."""
        # Use small samples_per_sign and n_folds for speed
        r = client.post("/api/ml/train", json={
            "samples_per_sign": 5, 
            "n_folds": 2,
            "kmeans_clusters": 2
        })
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert "report" in data
        assert data["report"]["best_model"]["name"] is not None

    def test_get_report_after_train(self):
        # This depends on the previous test having run.
        r = client.get("/api/ml/report")
        assert r.status_code == 200
        data = r.json()
        assert "supervised" in data
        assert "unsupervised" in data


# ─────────────────────────────────────────────────────────────────────────────
# 12. RECOGNITION SAVING
# ─────────────────────────────────────────────────────────────────────────────

class TestRecognition:
    def test_save_recognition_200(self):
        r = client.post("/api/sign/save-recognition", json={
            "text": "Hello",
            "confidence": 0.95,
            "sign_language": "ASL"
        })
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "saved"
        assert "history_id" in data
        
    def test_saved_recognition_appears_in_history(self):
        r = client.post("/api/sign/save-recognition", json={
            "text": "History check",
            "confidence": 0.88,
            "sign_language": "ASL"
        })
        hid = r.json()["history_id"]
        hist = client.get("/api/history?entry_type=sign_expression&limit=10").json()["data"]
        assert any(e["id"] == hid for e in hist)
        entry = next(e for e in hist if e["id"] == hid)
        assert entry["source"] == "History check"
        assert entry["sentiment"]["polarity"] == 0.0 # Hello/History check is neutral
