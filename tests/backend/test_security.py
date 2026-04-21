"""
TRADUMUST — Security & Input Validation Tests
==============================================
Tests for injection attacks, path traversal, header manipulation,
oversized payloads, malformed JSON, and CORS behaviour.

Run:
    python -m pytest tests/backend/test_security.py -v
"""

import sys
import os
import json
import pytest

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
# 1. SQL INJECTION ATTEMPTS
# ─────────────────────────────────────────────────────────────────────────────

class TestSQLInjection:
    SQL_PAYLOADS = [
        "'; DROP TABLE history; --",
        "' OR '1'='1",
        "\" OR \"1\"=\"1",
        "1; EXEC xp_cmdshell('dir')",
        "UNION SELECT * FROM users",
        "'; INSERT INTO admin VALUES('hacked','hacked'); --",
    ]

    def test_translate_sql_injection_no_500(self):
        for sql in self.SQL_PAYLOADS:
            r = client.post("/api/translate", json={"text": sql, "target_lang": "fr"})
            assert r.status_code < 500, f"500 on SQL payload: {sql!r}"

    def test_text_to_sign_sql_injection_no_500(self):
        for sql in self.SQL_PAYLOADS:
            r = client.post("/api/text-to-sign", json={"text": sql})
            assert r.status_code < 500, f"500 on SQL payload: {sql!r}"

    def test_phrasebook_sql_injection_id_no_500(self):
        for sql in self.SQL_PAYLOADS:
            r = client.post("/api/phrasebook", json={"history_id": sql})
            assert r.status_code in (404, 422), f"Unexpected status for SQL in history_id: {r.status_code}"


# ─────────────────────────────────────────────────────────────────────────────
# 2. XSS INJECTION ATTEMPTS
# ─────────────────────────────────────────────────────────────────────────────

class TestXSSInjection:
    XSS_PAYLOADS = [
        "<script>alert('xss')</script>",
        "<img src=x onerror=alert(1)>",
        "javascript:alert(1)",
        "<svg onload=alert(1)>",
        "';alert(String.fromCharCode(88,83,83))//",
    ]

    def test_translate_xss_does_not_execute(self):
        """XSS input must be converted to text, not cause 500s."""
        for xss in self.XSS_PAYLOADS:
            r = client.post("/api/translate", json={"text": xss, "target_lang": "fr"})
            assert r.status_code < 500, f"500 on XSS: {xss!r}"

    def test_text_to_sign_xss_no_crash(self):
        for xss in self.XSS_PAYLOADS:
            r = client.post("/api/text-to-sign", json={"text": xss})
            assert r.status_code < 500

    def test_response_does_not_reflect_script_tags_unescaped(self):
        """The response body itself should not be an unescaped HTML page."""
        r = client.post("/api/translate", json={"text": "<script>alert(1)</script>", "target_lang": "fr"})
        assert r.headers.get("content-type", "").startswith("application/json"), \
            "Response must be JSON, not HTML (which would allow XSS)"


# ─────────────────────────────────────────────────────────────────────────────
# 3. PATH TRAVERSAL
# ─────────────────────────────────────────────────────────────────────────────

class TestPathTraversal:
    def test_cultural_notes_path_traversal(self):
        """Path traversal in lang code should return 404, not 500 or file content."""
        attacks = ["../../../etc/passwd", "..\\..\\windows\\system32", "../backend/main"]
        for attack in attacks:
            r = client.get(f"/api/cultural-notes/{attack}")
            assert r.status_code in (404, 422, 400), \
                f"Unexpected status {r.status_code} for path traversal: {attack!r}"

    def test_phrasebook_id_path_traversal(self):
        attacks = ["../admin", "../../etc/passwd", "%2e%2e%2f"]
        for attack in attacks:
            r = client.delete(f"/api/phrasebook/{attack}")
            assert r.status_code in (404, 422, 405), f"Status {r.status_code} for {attack!r}"


# ─────────────────────────────────────────────────────────────────────────────
# 4. OVERSIZED PAYLOADS
# ─────────────────────────────────────────────────────────────────────────────

class TestOversizedPayloads:
    def test_translate_1mb_text_no_500(self):
        big = "Hello world " * 90_000  # ~1 MB
        r = client.post("/api/translate", json={"text": big, "target_lang": "fr"})
        assert r.status_code < 500, "A 1 MB payload must not crash the server"

    def test_text_to_sign_1mb_text_no_500(self):
        big = "I study " * 130_000
        r = client.post("/api/text-to-sign", json={"text": big})
        assert r.status_code < 500

    def test_classify_excessive_landmarks_no_500(self):
        """Sending 1000 landmarks (expected 21) should not crash."""
        lm = [{"x": 0.5, "y": 0.5, "z": 0.0} for _ in range(1000)]
        r = client.post("/api/sign/classify", json={"right_hand": lm})
        assert r.status_code < 500


# ─────────────────────────────────────────────────────────────────────────────
# 5. MALFORMED JSON
# ─────────────────────────────────────────────────────────────────────────────

class TestMalformedJSON:
    BAD_JSON_STRINGS = [
        b"{not json",
        b'{"text": }',
        b'[1,2,3]',     # array instead of object
        b'null',
        b'',
        b'  ',
    ]

    def test_translate_bad_json_no_500(self):
        for bad in self.BAD_JSON_STRINGS:
            r = client.post(
                "/api/translate",
                content=bad,
                headers={"Content-Type": "application/json"},
            )
            assert r.status_code < 500, f"500 on bad JSON: {bad!r}"

    def test_phrasebook_bad_json_no_500(self):
        for bad in self.BAD_JSON_STRINGS:
            r = client.post(
                "/api/phrasebook",
                content=bad,
                headers={"Content-Type": "application/json"},
            )
            assert r.status_code < 500


# ─────────────────────────────────────────────────────────────────────────────
# 6. CORS HEADERS
# ─────────────────────────────────────────────────────────────────────────────

class TestCORSHeaders:
    ORIGINS = [
        "http://localhost:1234",
        "http://127.0.0.1:1234",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    def test_allowed_origins_get_cors_header(self):
        for origin in self.ORIGINS:
            r = client.get("/api/health", headers={"Origin": origin})
            acao = r.headers.get("access-control-allow-origin", "")
            assert origin in acao or acao == "*", \
                f"Origin {origin} not reflected in CORS header"

    def test_preflight_options_200(self):
        r = client.options(
            "/api/translate",
            headers={
                "Origin": "http://localhost:1234",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type",
            },
        )
        assert r.status_code in (200, 204)


# ─────────────────────────────────────────────────────────────────────────────
# 7. IDEMPOTENCY & ISOLATION
# ─────────────────────────────────────────────────────────────────────────────

class TestIdempotency:
    def test_get_history_is_idempotent(self):
        """Calling GET /api/history twice returns same count."""
        client.post("/api/translate", json={"text": "Idempotency test", "target_lang": "fr"})
        r1 = client.get("/api/history").json()["data"]
        r2 = client.get("/api/history").json()["data"]
        assert len(r1) == len(r2)

    def test_get_phrasebook_is_idempotent(self):
        r1 = client.get("/api/phrasebook").json()["data"]
        r2 = client.get("/api/phrasebook").json()["data"]
        assert len(r1) == len(r2)

    def test_health_multiple_calls_consistent(self):
        results = [client.get("/api/health").json()["status"] for _ in range(5)]
        assert all(s == "ok" for s in results)

    def test_double_save_to_phrasebook_is_safe(self):
        """Saving the same entry twice should not cause an error."""
        r   = client.post("/api/translate", json={"text": "Double save", "target_lang": "fr"})
        hid = r.json()["history_entry"]["id"]
        r1  = client.post("/api/phrasebook", json={"history_id": hid})
        r2  = client.post("/api/phrasebook", json={"history_id": hid})
        assert r1.status_code == 200
        assert r2.status_code == 200

    def test_double_delete_from_phrasebook_is_safe(self):
        r   = client.post("/api/translate", json={"text": "Double delete", "target_lang": "fr"})
        hid = r.json()["history_entry"]["id"]
        client.post("/api/phrasebook", json={"history_id": hid})
        r1  = client.delete(f"/api/phrasebook/{hid}")
        r2  = client.delete(f"/api/phrasebook/{hid}")
        assert r1.status_code == 200
        # Second delete: entry exists but isPhrasebook=False already — still 200
        assert r2.status_code == 200
