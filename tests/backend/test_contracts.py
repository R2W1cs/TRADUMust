"""
TRADUMUST — Contract / Schema Tests
=====================================
Validates that every API response matches the exact TypeScript
contract defined in lib/api-client.ts. If the frontend TypeScript
shape ever diverges from the Python backend, these tests catch it.

Run:
    python -m pytest tests/backend/test_contracts.py -v
"""

import sys
import os
import pytest
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../backend'))
from main import app, _history_store
from fastapi.testclient import TestClient

client = TestClient(app)


@pytest.fixture(autouse=True)
def clear():
    _history_store.clear()
    yield
    _history_store.clear()


# ─────────────────────────────────────────────────────────────────────────────
# Schema validators
# ─────────────────────────────────────────────────────────────────────────────

def assert_translation_result(obj: dict, label="TranslationResult"):
    """Matches lib/api-client.ts TranslationResult interface."""
    assert isinstance(obj.get("translated_text"),   str),  f"{label}.translated_text must be str"
    assert isinstance(obj.get("cultural_note"),      str),  f"{label}.cultural_note must be str"
    assert obj.get("formality_level") in ("formal","informal","neutral"), \
        f"{label}.formality_level must be enum"
    assert isinstance(obj.get("regional_variant"),   str),  f"{label}.regional_variant must be str"
    # optional fields
    # source_lang_detected?: string
    if "source_lang_detected" in obj:
        assert isinstance(obj["source_lang_detected"], str)


def assert_sign_sentiment(obj: dict, label="SignSentiment"):
    """Matches lib/api-client.ts SignSentiment interface."""
    assert isinstance(obj.get("polarity"),    (int, float)), f"{label}.polarity must be number"
    assert isinstance(obj.get("subjectivity"),(int, float)), f"{label}.subjectivity must be number"
    assert -1.0 <= obj["polarity"]    <= 1.0
    assert  0.0 <= obj["subjectivity"]<= 1.0


def assert_sign_metadata(obj: dict, label="SignMetadata"):
    """Matches lib/api-client.ts SignMetadata interface."""
    assert isinstance(obj.get("word"), str), f"{label}.word must be str"
    assert isinstance(obj.get("tag"),  str), f"{label}.tag must be str"
    if "duration_ms" in obj and obj["duration_ms"] is not None:
        assert isinstance(obj["duration_ms"], (int, float))


def assert_history_entry(obj: dict, label="HistoryEntry"):
    """Matches lib/api-client.ts HistoryEntry interface."""
    assert isinstance(obj.get("id"),           str),  f"{label}.id must be str"
    assert obj.get("entry_type") in ("translation","sign_expression"), \
        f"{label}.entry_type invalid"
    assert isinstance(obj.get("source"),       str),  f"{label}.source must be str"
    # sourceLang, targetLang, signLanguage: string | null
    for field in ("sourceLang","targetLang","signLanguage"):
        v = obj.get(field)
        assert v is None or isinstance(v, str), f"{label}.{field} must be str|null"
    assert isinstance(obj.get("timestamp"),    int),  f"{label}.timestamp must be int"
    assert isinstance(obj.get("created_at"),   str),  f"{label}.created_at must be str"
    # Validate ISO 8601 format
    try:
        datetime.strptime(obj["created_at"], "%Y-%m-%dT%H:%M:%SZ")
    except ValueError:
        pytest.fail(f"{label}.created_at is not ISO 8601: {obj['created_at']!r}")
    assert isinstance(obj.get("isPhrasebook"), bool), f"{label}.isPhrasebook must be bool"
    assert isinstance(obj.get("result"),        dict), f"{label}.result must be dict"
    # sentiment: SignSentiment | null
    s = obj.get("sentiment")
    if s is not None:
        assert_sign_sentiment(s, f"{label}.sentiment")
    assert isinstance(obj.get("metadata"),     list), f"{label}.metadata must be list"
    for m in obj["metadata"]:
        assert_sign_metadata(m, f"{label}.metadata[]")
    assert isinstance(obj.get("wordSequence"), list), f"{label}.wordSequence must be list"
    assert isinstance(obj.get("extra"),        dict), f"{label}.extra must be dict"


def assert_translate_response(obj: dict):
    """Matches lib/api-client.ts TranslateResponse (extends TranslationResult)."""
    assert_translation_result(obj, "TranslateResponse")
    assert "history_entry" in obj, "TranslateResponse must include history_entry"
    assert_history_entry(obj["history_entry"], "TranslateResponse.history_entry")


def assert_text_to_sign_response(obj: dict):
    """Matches lib/api-client.ts TextToSignResponse."""
    assert isinstance(obj.get("sign_language"),        str),  "sign_language must be str"
    assert isinstance(obj.get("word_sequence"),         list), "word_sequence must be list"
    assert isinstance(obj.get("fingerspell_fallback"),  list), "fingerspell_fallback must be list"
    assert isinstance(obj.get("animation_clips"),       list), "animation_clips must be list"
    assert isinstance(obj.get("syntactic_metadata"),    list), "syntactic_metadata must be list"
    # sentiment
    assert_sign_sentiment(obj.get("sentiment", {}), "TextToSignResponse.sentiment")
    # animation clips
    for clip in obj["animation_clips"]:
        assert isinstance(clip.get("word"),        str),  "clip.word must be str"
        assert isinstance(clip.get("clip_url"),    str),  "clip.clip_url must be str"
        assert isinstance(clip.get("fingerspell"), bool), "clip.fingerspell must be bool"
        assert isinstance(clip.get("duration_ms"), (int,float)), "clip.duration_ms must be number"
        assert isinstance(clip.get("tag"),         str),  "clip.tag must be str"
    # history_entry
    assert "history_entry" in obj, "TextToSignResponse must include history_entry"
    assert_history_entry(obj["history_entry"], "TextToSignResponse.history_entry")
    # syntactic_metadata
    for m in obj["syntactic_metadata"]:
        assert_sign_metadata(m, "TextToSignResponse.syntactic_metadata[]")


# ─────────────────────────────────────────────────────────────────────────────
# Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestTranslateContract:
    LANGS = ["fr","es","ja","de","zh","ar","ko","it","pt","en"]

    def test_translate_response_schema_all_langs(self):
        for lang in self.LANGS:
            r = client.post("/api/translate", json={"text": "Hello good morning", "target_lang": lang})
            assert r.status_code == 200, f"Non-200 for {lang}"
            assert_translate_response(r.json())

    def test_translate_history_entry_type_is_translation(self):
        r = client.post("/api/translate", json={"text": "Contract test", "target_lang": "fr"})
        assert r.json()["history_entry"]["entry_type"] == "translation"

    def test_translate_history_source_matches_input(self):
        text = "My unique contract test string"
        r = client.post("/api/translate", json={"text": text, "target_lang": "fr"})
        assert r.json()["history_entry"]["source"] == text

    def test_translate_history_target_lang_matches(self):
        r = client.post("/api/translate", json={"text": "Hello", "target_lang": "ja"})
        assert r.json()["history_entry"]["targetLang"] == "ja"

    def test_translate_history_sign_language_is_null(self):
        r = client.post("/api/translate", json={"text": "Hello", "target_lang": "fr"})
        assert r.json()["history_entry"]["signLanguage"] is None

    def test_translate_id_is_32_hex_chars(self):
        r = client.post("/api/translate", json={"text": "Hello", "target_lang": "fr"})
        entry_id = r.json()["history_entry"]["id"]
        assert len(entry_id) == 32
        assert all(c in "0123456789abcdef" for c in entry_id)


class TestTextToSignContract:
    def test_text_to_sign_schema(self):
        r = client.post("/api/text-to-sign", json={"text": "Hello I want to study", "sign_language": "ASL"})
        assert r.status_code == 200
        assert_text_to_sign_response(r.json())

    def test_text_to_sign_history_entry_type_sign_expression(self):
        r = client.post("/api/text-to-sign", json={"text": "Hello world"})
        assert r.json()["history_entry"]["entry_type"] == "sign_expression"

    def test_text_to_sign_history_sign_language_matches(self):
        r = client.post("/api/text-to-sign", json={"text": "Hello", "sign_language": "BSL"})
        assert r.json()["history_entry"]["signLanguage"] == "BSL"

    def test_text_to_sign_history_source_lang_null(self):
        r = client.post("/api/text-to-sign", json={"text": "Hello"})
        assert r.json()["history_entry"]["sourceLang"] is None

    def test_text_to_sign_extra_has_word_sequence(self):
        r = client.post("/api/text-to-sign", json={"text": "I want water"})
        extra = r.json()["history_entry"]["extra"]
        assert "word_sequence" in extra
        assert isinstance(extra["word_sequence"], list)

    def test_word_sequence_matches_extra(self):
        r = client.post("/api/text-to-sign", json={"text": "Hello my friend today"})
        body = r.json()
        assert body["word_sequence"] == body["history_entry"]["extra"]["word_sequence"]


class TestHistoryContract:
    def test_history_entry_schema(self):
        client.post("/api/translate", json={"text": "History schema test", "target_lang": "fr"})
        entries = client.get("/api/history").json()["data"]
        assert len(entries) > 0
        for entry in entries:
            assert_history_entry(entry, "GET /api/history[]")

    def test_phrasebook_schema_after_save(self):
        r   = client.post("/api/translate", json={"text": "Phrasebook schema", "target_lang": "de"})
        hid = r.json()["history_entry"]["id"]
        client.post("/api/phrasebook", json={"history_id": hid})
        entries = client.get("/api/phrasebook").json()["data"]
        for entry in entries:
            assert_history_entry(entry, "GET /api/phrasebook[]")
            assert entry["isPhrasebook"] is True

    def test_patch_response_schema(self):
        r   = client.post("/api/translate", json={"text": "Patch schema test", "target_lang": "fr"})
        hid = r.json()["history_entry"]["id"]
        client.post("/api/phrasebook", json={"history_id": hid})
        patch_r = client.patch(
            f"/api/phrasebook/{hid}",
            json={"extra": {"srs": {"interval": 1, "easiness": 2.5, "repetitions": 0}}}
        )
        assert patch_r.status_code == 200
        assert_history_entry(patch_r.json()["entry"], "PATCH /api/phrasebook/{id}.entry")
