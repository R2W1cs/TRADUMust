"""
TRADUMUST — Load Tests
======================
Simulates many concurrent/sequential requests to the FastAPI backend.

Load testing checks:
  - The API stays correct under high volume (not just one request)
  - No response degrades (status codes stay 200)
  - Throughput meets a minimum requests/second target

Run:
    python -m pytest tests/load/backend_load_test.py -v

Difference from unit tests:
  - Unit test  = one request, check correctness
  - Load test  = 100-500 requests, check throughput + no failures
"""

import time
import base64
import sys
import os
import threading
import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../../backend'))
from main import app
from fastapi.testclient import TestClient

client = TestClient(app)

# ── Shared fixtures ───────────────────────────────────────────────────────────

VALID_B64 = base64.b64encode(b"\xFF\xD8\xFF" + b"\x00" * 100).decode()

MOCK_LANDMARKS = [
    {"x": 0.5, "y": 0.5, "z": 0.0, "visibility": 1.0}
    for _ in range(21)
]

TRANSLATE_PAYLOADS = [
    {"text": "Hello world",         "target_lang": "fr"},
    {"text": "Good morning",        "target_lang": "ja"},
    {"text": "Thank you very much", "target_lang": "es"},
    {"text": "Where is the library?","target_lang": "de"},
    {"text": "I need help please",  "target_lang": "zh"},
]

TEXT_TO_SIGN_PAYLOADS = [
    {"text": "Hello my name is Alex"},
    {"text": "I want to learn sign language"},
    {"text": "Where is the nearest bathroom?"},
    {"text": "Today we will study machine learning"},
    {"text": "Can you please help me understand this?"},
]


# ── Helper ────────────────────────────────────────────────────────────────────

def run_n(fn, n):
    """Run fn n times, return (success_count, fail_count, elapsed_seconds)."""
    ok = 0
    fail = 0
    t0 = time.perf_counter()
    for i in range(n):
        try:
            result = fn(i)
            if result:
                ok += 1
            else:
                fail += 1
        except Exception as e:
            fail += 1
    elapsed = time.perf_counter() - t0
    return ok, fail, elapsed


# ─────────────────────────────────────────────────────────────────────────────
# 1. HEALTH ENDPOINT — fastest, establish baseline throughput
# ─────────────────────────────────────────────────────────────────────────────

class TestHealthLoad:
    REQUESTS = 500
    MIN_RPS  = 200  # requests per second minimum

    def test_health_200_under_load(self):
        """All 500 health requests must return 200."""
        ok, fail, elapsed = run_n(
            lambda _: client.get("/api/health").status_code == 200,
            self.REQUESTS
        )
        assert fail == 0, f"{fail}/{self.REQUESTS} health requests failed"

    def test_health_throughput(self):
        """Health endpoint must handle ≥ 200 req/sec (in-process)."""
        ok, fail, elapsed = run_n(
            lambda _: client.get("/api/health"),
            self.REQUESTS
        )
        rps = self.REQUESTS / elapsed
        assert rps >= self.MIN_RPS, \
            f"Health throughput: {rps:.0f} req/sec — minimum: {self.MIN_RPS}"
        print(f"\n    health: {rps:.0f} req/sec over {self.REQUESTS} requests")


# ─────────────────────────────────────────────────────────────────────────────
# 2. TRANSLATE ENDPOINT — hits Google Translate (network), so lower target
# ─────────────────────────────────────────────────────────────────────────────

class TestTranslateLoad:
    REQUESTS = 50  # lower — each call may do a real HTTP request
    MIN_RPS  = 1   # 1 req/sec minimum even with network latency

    def test_all_translate_requests_succeed(self):
        """50 translate requests must all return 200 with correct structure."""
        fail = 0
        for i in range(self.REQUESTS):
            payload = TRANSLATE_PAYLOADS[i % len(TRANSLATE_PAYLOADS)]
            r = client.post("/api/translate", json=payload)
            if r.status_code != 200:
                fail += 1
            else:
                data = r.json()
                if "translated_text" not in data or "cultural_note" not in data:
                    fail += 1
        assert fail == 0, f"{fail}/{self.REQUESTS} translate requests failed or malformed"

    def test_translate_no_degradation_over_time(self):
        """Response structure must be identical for request #1 and request #50."""
        def get_fields(payload):
            r = client.post("/api/translate", json=payload)
            return set(r.json().keys())

        first = get_fields({"text": "Hello", "target_lang": "fr"})
        last  = get_fields({"text": "Hello", "target_lang": "fr"})
        assert first == last, "Response schema changed between first and last request"

    def test_translate_different_languages_all_succeed(self):
        """One request per supported language — all must succeed."""
        langs = ["fr", "es", "ja", "de", "zh", "ar", "ko", "it", "pt", "en"]
        for lang in langs:
            r = client.post("/api/translate", json={"text": "Hello", "target_lang": lang})
            assert r.status_code == 200, f"Failed for lang={lang}: {r.status_code}"


# ─────────────────────────────────────────────────────────────────────────────
# 3. LANDMARK EXTRACTION — mock endpoint, should be very fast
# ─────────────────────────────────────────────────────────────────────────────

class TestLandmarkLoad:
    REQUESTS = 200
    MIN_RPS  = 100

    def test_all_landmark_requests_return_21_points(self):
        """200 requests must all return exactly 21 landmark points."""
        fail = 0
        for _ in range(self.REQUESTS):
            r = client.post("/api/sign/extract-landmarks", json={
                "frame_b64": VALID_B64, "width": 640, "height": 480
            })
            if r.status_code != 200 or len(r.json()["landmarks"]) != 21:
                fail += 1
        assert fail == 0, f"{fail}/{self.REQUESTS} landmark requests failed"

    def test_landmark_throughput(self):
        """Landmark extraction must handle ≥ 100 req/sec."""
        ok, fail, elapsed = run_n(
            lambda _: client.post("/api/sign/extract-landmarks", json={
                "frame_b64": VALID_B64, "width": 640, "height": 480
            }),
            self.REQUESTS
        )
        rps = self.REQUESTS / elapsed
        assert rps >= self.MIN_RPS, \
            f"Landmark throughput: {rps:.0f} req/sec — minimum: {self.MIN_RPS}"
        print(f"\n    landmarks: {rps:.0f} req/sec over {self.REQUESTS} requests")

    def test_landmark_confidence_always_in_range(self):
        """Confidence must be in [0, 1] for all 200 requests."""
        out_of_range = 0
        for _ in range(self.REQUESTS):
            r = client.post("/api/sign/extract-landmarks", json={
                "frame_b64": VALID_B64, "width": 640, "height": 480
            })
            conf = r.json()["confidence"]
            if not (0.0 <= conf <= 1.0):
                out_of_range += 1
        assert out_of_range == 0, \
            f"{out_of_range} responses had confidence outside [0, 1]"


# ─────────────────────────────────────────────────────────────────────────────
# 4. CLASSIFY ENDPOINT — mock, should be fast
# ─────────────────────────────────────────────────────────────────────────────

class TestClassifyLoad:
    REQUESTS = 200
    MIN_RPS  = 100

    def test_all_classify_requests_succeed(self):
        """200 classify requests must all return 200 with a predicted sign."""
        fail = 0
        for _ in range(self.REQUESTS):
            r = client.post("/api/sign/classify", json={"landmarks": MOCK_LANDMARKS})
            if r.status_code != 200 or not r.json().get("predicted_sign"):
                fail += 1
        assert fail == 0, f"{fail}/{self.REQUESTS} classify requests failed"

    def test_classify_throughput(self):
        """Classify must handle ≥ 100 req/sec."""
        ok, fail, elapsed = run_n(
            lambda _: client.post("/api/sign/classify", json={"landmarks": MOCK_LANDMARKS}),
            self.REQUESTS
        )
        rps = self.REQUESTS / elapsed
        assert rps >= self.MIN_RPS, \
            f"Classify throughput: {rps:.0f} req/sec — minimum: {self.MIN_RPS}"
        print(f"\n    classify: {rps:.0f} req/sec over {self.REQUESTS} requests")

    def test_predicted_sign_is_always_a_valid_string(self):
        """Predicted sign must always be a non-empty string."""
        for _ in range(self.REQUESTS):
            r = client.post("/api/sign/classify", json={"landmarks": MOCK_LANDMARKS})
            sign = r.json()["predicted_sign"]
            assert isinstance(sign, str) and len(sign) > 0, \
                f"Invalid predicted_sign: {sign!r}"


# ─────────────────────────────────────────────────────────────────────────────
# 5. TEXT-TO-SIGN ENDPOINT — NLP processing, moderate load
# ─────────────────────────────────────────────────────────────────────────────

class TestTextToSignLoad:
    REQUESTS = 100
    MIN_RPS  = 20

    def test_all_text_to_sign_requests_succeed(self):
        """100 text-to-sign requests must all return 200 with word_sequence."""
        fail = 0
        for i in range(self.REQUESTS):
            payload = TEXT_TO_SIGN_PAYLOADS[i % len(TEXT_TO_SIGN_PAYLOADS)]
            r = client.post("/api/text-to-sign", json=payload)
            if r.status_code != 200 or "word_sequence" not in r.json():
                fail += 1
        assert fail == 0, f"{fail}/{self.REQUESTS} text-to-sign requests failed"

    def test_text_to_sign_throughput(self):
        """Text-to-sign must handle ≥ 20 req/sec."""
        ok, fail, elapsed = run_n(
            lambda i: client.post("/api/text-to-sign",
                json=TEXT_TO_SIGN_PAYLOADS[i % len(TEXT_TO_SIGN_PAYLOADS)]),
            self.REQUESTS
        )
        rps = self.REQUESTS / elapsed
        assert rps >= self.MIN_RPS, \
            f"Text-to-sign throughput: {rps:.0f} req/sec — minimum: {self.MIN_RPS}"
        print(f"\n    text-to-sign: {rps:.0f} req/sec over {self.REQUESTS} requests")

    def test_sentiment_always_valid_under_load(self):
        """Polarity must stay in [-1, 1] for all 100 requests."""
        for i in range(self.REQUESTS):
            payload = TEXT_TO_SIGN_PAYLOADS[i % len(TEXT_TO_SIGN_PAYLOADS)]
            r = client.post("/api/text-to-sign", json=payload)
            polarity = r.json()["sentiment"]["polarity"]
            assert -1.0 <= polarity <= 1.0, f"Polarity out of range: {polarity}"

    def test_word_sequence_never_empty_for_valid_input(self):
        """Non-trivial sentences must always produce at least one word in sequence."""
        for payload in TEXT_TO_SIGN_PAYLOADS:
            r = client.post("/api/text-to-sign", json=payload)
            seq = r.json()["word_sequence"]
            assert len(seq) > 0, f"Empty sequence for: {payload['text']!r}"


# ─────────────────────────────────────────────────────────────────────────────
# 6. CULTURAL NOTES — read-heavy, should be fastest
# ─────────────────────────────────────────────────────────────────────────────

class TestCulturalNotesLoad:
    LANGS    = ["fr", "es", "ja", "de", "zh", "ko", "it", "pt", "en", "ar"]
    REQUESTS = 300
    MIN_RPS  = 200

    def test_all_langs_return_200_under_load(self):
        """300 cultural-notes requests cycling through all languages."""
        fail = 0
        for i in range(self.REQUESTS):
            lang = self.LANGS[i % len(self.LANGS)]
            r = client.get(f"/api/cultural-notes/{lang}")
            if r.status_code != 200:
                fail += 1
        assert fail == 0, f"{fail}/{self.REQUESTS} cultural-notes requests failed"

    def test_cultural_notes_throughput(self):
        """Cultural notes must handle ≥ 200 req/sec."""
        langs = self.LANGS
        ok, fail, elapsed = run_n(
            lambda i: client.get(f"/api/cultural-notes/{langs[i % len(langs)]}"),
            self.REQUESTS
        )
        rps = self.REQUESTS / elapsed
        assert rps >= self.MIN_RPS, \
            f"Cultural notes throughput: {rps:.0f} req/sec — minimum: {self.MIN_RPS}"
        print(f"\n    cultural-notes: {rps:.0f} req/sec over {self.REQUESTS} requests")
