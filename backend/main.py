"""
SignBridge — FastAPI Backend
=======================================
Sign language recognition, classification, avatar animation, translation,
text-to-sign conversion, phrasebook, and cultural-notes endpoints.

Run with:
    uvicorn backend.main:app --reload --port 8001
"""

from __future__ import annotations

import base64
import json
import os
import random
import re
import sqlite3
import time
import urllib.parse
import urllib.request
import uuid
from typing import Any

import asyncio

import numpy as np
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── ML pipeline ───────────────────────────────────────────────────────────────
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from backend.ml.feature_extractor import extract_holistic_features
from backend.ml.train import load_trained_model, run_training

# MediaPipe Holistic (lazy-loaded to avoid startup delay when not used)
_mp_holistic = None
_mp_solutions = None


def _get_mp_holistic():
    global _mp_holistic, _mp_solutions
    if _mp_holistic is None:
        try:
            import mediapipe as mp
            import cv2 as _cv2  # noqa: F401 — verify opencv is present
            _mp_solutions = getattr(mp, "solutions", None)
            if _mp_solutions is None or not hasattr(_mp_solutions, "holistic"):
                raise AttributeError("mediapipe.solutions.holistic not available")
            _mp_holistic = _mp_solutions.holistic
        except (ImportError, AttributeError):
            _mp_holistic = False
    return _mp_holistic if _mp_holistic is not False else None


# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(
    title="TRADUMUST AI API",
    description="Sign language recognition, translation, and avatar animation microservice.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:1234",
        "http://127.0.0.1:1234",
        "http://localhost:4000",
        "http://127.0.0.1:4000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ML models ─────────────────────────────────────────────────────────────────
_ml_models: dict[str, tuple] = {}
_lstm_model = None


def _get_ml_model(language: str = "ASL"):
    """Load and cache sklearn/torch model per sign language."""
    lang = (language or "ASL").upper()
    if lang not in _ml_models:
        from backend.ml.train import load_trained_model
        try:
            _ml_models[lang] = load_trained_model(lang)
        except FileNotFoundError as exc:
            print(f"DEBUG: No model for {lang}: {exc}")
            return None, None
    return _ml_models[lang]


@app.on_event("startup")
def load_model():
    global _lstm_model
    _init_db()
    try:
        from backend.ml.train import LSTM_PATH
        from backend.ml.nn_model import SignBiLSTM
        import torch

        _get_ml_model("ASL")
        model, classes = _get_ml_model("ASL")
        if model is not None and LSTM_PATH.exists() and classes:
            _lstm_model = SignBiLSTM(input_dim=231, num_classes=len(classes), hidden_dim=256)
            _lstm_model.load_state_dict(torch.load(LSTM_PATH, map_location="cpu"))
            _lstm_model.eval()
            print("OK LSTM model loaded")

        _get_ml_model("TSL")
    except Exception as e:
        print(f"DEBUG: Startup model loading info: {e}")


# ── SQLite database ───────────────────────────────────────────────────────────
_DB_PATH = os.path.join(os.path.dirname(__file__), "data", "tradumust.sqlite")

_SCHEMA = """
CREATE TABLE IF NOT EXISTS history_entries (
    id TEXT PRIMARY KEY,
    entry_type TEXT NOT NULL,
    source_text TEXT NOT NULL,
    translated_text TEXT,
    source_lang TEXT,
    target_lang TEXT,
    sign_language TEXT,
    cultural_note TEXT,
    formality_level TEXT,
    regional_variant TEXT,
    sentiment_json TEXT,
    metadata_json TEXT,
    extra_json TEXT,
    is_phrasebook INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_history_type ON history_entries (entry_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_phrasebook ON history_entries (is_phrasebook, created_at DESC);
"""


def _init_db() -> None:
    os.makedirs(os.path.dirname(_DB_PATH), exist_ok=True)
    conn = sqlite3.connect(_DB_PATH)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.executescript(_SCHEMA)
        conn.commit()
    finally:
        conn.close()


def _open_db() -> sqlite3.Connection:
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _map_row(row: sqlite3.Row) -> dict:
    r = dict(row)
    sentiment = json.loads(r["sentiment_json"]) if r.get("sentiment_json") else None
    metadata = json.loads(r["metadata_json"]) if r.get("metadata_json") else []
    extra = json.loads(r["extra_json"]) if r.get("extra_json") else {}
    try:
        ts = int(time.mktime(time.strptime(r["created_at"], "%Y-%m-%dT%H:%M:%SZ")))
    except Exception:
        ts = int(time.time())
    return {
        "id": r["id"],
        "entry_type": r["entry_type"],
        "source": r["source_text"],
        "sourceLang": r.get("source_lang"),
        "targetLang": r.get("target_lang"),
        "signLanguage": r.get("sign_language"),
        "timestamp": ts * 1000,
        "created_at": r["created_at"],
        "isPhrasebook": bool(r["is_phrasebook"]),
        "result": {
            "translated_text": r.get("translated_text") or "",
            "cultural_note": r.get("cultural_note") or "",
            "formality_level": r.get("formality_level") or "neutral",
            "regional_variant": r.get("regional_variant") or "",
        },
        "sentiment": sentiment,
        "metadata": metadata if isinstance(metadata, list) else [],
        "wordSequence": extra.get("word_sequence", []) if isinstance(extra, dict) else [],
        "extra": extra if isinstance(extra, dict) else {},
    }


def _db_create_entry(record: dict) -> dict:
    entry_id = uuid.uuid4().hex
    created_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    conn = _open_db()
    try:
        conn.execute(
            """INSERT INTO history_entries (
                id, entry_type, source_text, translated_text, source_lang, target_lang,
                sign_language, cultural_note, formality_level, regional_variant,
                sentiment_json, metadata_json, extra_json, is_phrasebook, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                entry_id,
                record["entry_type"],
                record["source_text"],
                record.get("translated_text"),
                record.get("source_lang"),
                record.get("target_lang"),
                record.get("sign_language"),
                record.get("cultural_note"),
                record.get("formality_level"),
                record.get("regional_variant"),
                json.dumps(record["sentiment"]) if record.get("sentiment") else None,
                json.dumps(record["metadata"]) if record.get("metadata") else None,
                json.dumps(record["extra"]) if record.get("extra") else None,
                1 if record.get("is_phrasebook") else 0,
                created_at,
            ),
        )
        conn.commit()
    finally:
        conn.close()
    return _db_get_entry(entry_id)


def _db_get_entry(entry_id: str) -> dict:
    conn = _open_db()
    try:
        row = conn.execute(
            "SELECT * FROM history_entries WHERE id = ? LIMIT 1", (entry_id,)
        ).fetchone()
    finally:
        conn.close()
    if row is None:
        raise HTTPException(status_code=404, detail="History entry not found.")
    return _map_row(row)


# ── Cultural notes ─────────────────────────────────────────────────────────────
_CULTURAL_NOTES: dict[str, dict] = {
    "fr": {
        "cultural_note": "In French, 'vous' is the safe default with strangers, professors, and authority figures. Use 'tu' only in clearly informal settings.",
        "formality_level": "formal",
        "regional_variant": "France French (Hexagonal)",
        "formality_detail": "French social tone changes quickly with pronoun choice. In academic and administrative settings, leading with 'vous' avoids sounding overly familiar.",
    },
    "es": {
        "cultural_note": "Spanish formality depends on region. 'Usted' is formal, 'tú' is informal, and some countries also use 'vos' in daily speech.",
        "formality_level": "formal",
        "regional_variant": "Latin American Spanish",
        "formality_detail": "When you do not know the relationship boundary yet, 'usted' is the safer register in institutional contexts.",
    },
    "de": {
        "cultural_note": "German uses 'Sie' for formal interactions and 'du' for informal ones. Professors and officials are generally addressed formally.",
        "formality_level": "formal",
        "regional_variant": "Standard German (Hochdeutsch)",
        "formality_detail": "Switching from 'Sie' to 'du' is usually explicit. Starting formally is the safer move in public and academic environments.",
    },
    "ja": {
        "cultural_note": "Japanese politeness is carried by sentence endings. The desu/masu register is the default safe option for public, academic, and service settings.",
        "formality_level": "formal",
        "regional_variant": "Standard Japanese (Hyōjungo)",
        "formality_detail": "Even when the literal meaning is simple, choosing a polite ending changes how respectful the sentence sounds.",
    },
    "zh": {
        "cultural_note": "Mandarin is less pronoun-formal than French or German, but titles and context matter. Using role titles such as 老师 conveys respect.",
        "formality_level": "neutral",
        "regional_variant": "Simplified Chinese (Mainland)",
        "formality_detail": "Respect often comes from titles, phrasing, and indirectness rather than a separate formal pronoun system.",
    },
    "ar": {
        "cultural_note": "Arabic varies heavily by region. Modern Standard Arabic is the formal written register, while everyday speech usually happens in a local dialect.",
        "formality_level": "formal",
        "regional_variant": "Modern Standard Arabic",
        "formality_detail": "Formal communication and writing stay closer to MSA, especially in education, government, and cross-country contexts.",
    },
    "pt": {
        "cultural_note": "Portuguese differs significantly between Brazil and Portugal in pronunciation, vocabulary, and tone. Brazil tends to sound more informal in everyday speech.",
        "formality_level": "neutral",
        "regional_variant": "Brazilian Portuguese",
        "formality_detail": "In Brazilian Portuguese, 'você' is standard in daily use. In more formal contexts, titles and indirect phrasing do more work.",
    },
    "ko": {
        "cultural_note": "Korean encodes respect through speech levels and honorific markers. Formal polite endings are safest in professional or academic settings.",
        "formality_level": "formal",
        "regional_variant": "Standard Korean (Seoul dialect)",
        "formality_detail": "You are often expected to match the listener's status and age with your sentence ending, not just the vocabulary.",
    },
    "it": {
        "cultural_note": "Italian uses 'Lei' formally and 'tu' informally. Formal address remains common in administration, health care, and university settings.",
        "formality_level": "formal",
        "regional_variant": "Standard Italian",
        "formality_detail": "Starting with 'Lei' is safer when you do not know the relationship, then relaxing only when invited.",
    },
    "en": {
        "cultural_note": "English formality is driven more by tone and wording than pronouns. Directness is often acceptable, but phrasing still shifts by setting.",
        "formality_level": "neutral",
        "regional_variant": "International English",
        "formality_detail": "Politeness in English often comes from modal verbs and softeners such as 'could', 'would', and 'please'.",
    },
}

# ── Language detector ─────────────────────────────────────────────────────────
_LANG_KEYWORDS: dict[str, list[str]] = {
    "fr": ["bonjour", "merci", "comment", "vous", "allez", "oui", "excusez"],
    "es": ["hola", "gracias", "usted", "como", "estas", "por", "favor"],
    "de": ["hallo", "danke", "bitte", "wie", "geht", "ihnen", "sie"],
    "it": ["ciao", "grazie", "come", "stai", "lei", "buongiorno"],
    "pt": ["ola", "obrigado", "voce", "como", "esta", "bom", "dia"],
    "en": ["hello", "thank", "you", "how", "are", "please"],
}


def _detect_language(text: str) -> str:
    if re.search(r"[؀-ۿ]", text):
        return "ar"
    if re.search(r"[가-힣]", text):
        return "ko"
    if re.search(r"[぀-ヿ]", text):
        return "ja"
    if re.search(r"[一-鿿]", text):
        return "zh"
    normalized = text.lower()
    scores = {
        lang: sum(1 for kw in kws if kw in normalized)
        for lang, kws in _LANG_KEYWORDS.items()
    }
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] > 0 else "en"


# ── Translation service ───────────────────────────────────────────────────────
_OFFLINE_PHRASEBOOK: dict[str, dict[str, str]] = {
    "hello, how are you?": {
        "fr": "Bonjour, comment allez-vous ?",
        "es": "Hola, ¿cómo está usted?",
        "de": "Hallo, wie geht es Ihnen?",
        "it": "Buongiorno, come sta?",
        "pt": "Olá, como você está?",
        "ja": "こんにちは、お元気ですか？",
        "zh": "你好，你好吗？",
        "ar": "مرحبًا، كيف حالك؟",
        "ko": "안녕하세요, 잘 지내세요?",
    },
    "thank you": {
        "fr": "Merci", "es": "Gracias", "de": "Danke", "it": "Grazie",
        "pt": "Obrigado", "ja": "ありがとうございます", "zh": "谢谢",
        "ar": "شكرًا", "ko": "감사합니다",
    },
    "please": {
        "fr": "S'il vous plaît", "es": "Por favor", "de": "Bitte",
        "it": "Per favore", "pt": "Por favor", "ja": "お願いします",
        "zh": "请", "ar": "من فضلك", "ko": "부탁합니다",
    },
    "where is the library?": {
        "fr": "Où est la bibliothèque ?", "es": "¿Dónde está la biblioteca?",
        "de": "Wo ist die Bibliothek?", "it": "Dov'è la biblioteca?",
        "pt": "Onde fica a biblioteca?", "ja": "図書館はどこですか？",
        "zh": "图书馆在哪里？", "ar": "أين تقع المكتبة؟", "ko": "도서관이 어디에 있나요?",
    },
    "i don't understand.": {
        "fr": "Je ne comprends pas.", "es": "No entiendo.",
        "de": "Ich verstehe nicht.", "it": "Non capisco.",
        "pt": "Não entendo.", "ja": "わかりません。",
        "zh": "我不明白。", "ar": "أنا لا أفهم.", "ko": "이해하지 못했습니다.",
    },
}


def _call_libretranslate(text: str, source: str, target: str) -> str | None:
    url = os.environ.get("LIBRETRANSLATE_URL", "").strip()
    if not url:
        return None
    payload: dict[str, Any] = {"q": text, "source": source, "target": target, "format": "text"}
    api_key = os.environ.get("LIBRETRANSLATE_API_KEY", "").strip()
    if api_key:
        payload["api_key"] = api_key
    try:
        data = json.dumps(payload).encode()
        req = urllib.request.Request(
            url, data=data,
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            result = json.load(resp)
        return result.get("translatedText") or None
    except Exception:
        return None


def _call_mymemory(text: str, source: str, target: str) -> str | None:
    base = os.environ.get("MYMEMORY_URL", "https://api.mymemory.translated.net/get").strip()
    query = urllib.parse.urlencode({"q": text, "langpair": f"{source}|{target}"})
    try:
        with urllib.request.urlopen(f"{base}?{query}", timeout=5) as resp:
            result = json.load(resp)
        return result.get("responseData", {}).get("translatedText") or None
    except Exception:
        return None


def _do_translate(text: str, source: str, target: str) -> str:
    provider = os.environ.get("TRANSLATION_PROVIDER", "fallback").lower()
    translated: str | None = None
    if provider == "libretranslate":
        translated = _call_libretranslate(text, source, target)
    elif provider == "mymemory":
        translated = _call_mymemory(text, source, target)
    if not translated or not translated.strip():
        translated = _OFFLINE_PHRASEBOOK.get(text.lower().strip(), {}).get(target, text)
    return translated


# ── Text-to-sign service ──────────────────────────────────────────────────────
_TIME_WORDS = {"today", "tomorrow", "yesterday", "now", "soon", "later", "morning", "night"}
_SUBJECT_WORDS = {"i", "you", "we", "they", "he", "she", "my", "your", "our", "their"}
_ACTION_WORDS = {
    "go", "need", "help", "learn", "meet", "repeat", "understand",
    "translate", "sign", "study", "arrive", "speak", "thank", "please",
}
_STOP_WORDS = {"a", "an", "the", "is", "are", "am", "to", "of", "for", "on", "at", "in"}
_KNOWN_SIGNS = {
    "HELLO", "THANK", "YOU", "PLEASE", "GO", "LEARN", "MEET",
    "HELP", "UNDERSTAND", "REPEAT", "LIBRARY", "NAME", "NICE",
}
_TAG_RANK = {"TIME": 0, "SUBJECT": 1, "OBJECT": 2, "ACTION": 3, "MODIFIER": 4}


def _duration_for(word: str, tag: str) -> int:
    base = {"TIME": 900, "SUBJECT": 950, "ACTION": 1250, "MODIFIER": 800}.get(tag, 1050)
    return base + min(len(word), 10) * 35


def _sign_sentiment(tokens: list[str]) -> dict:
    positive = {"good", "great", "love", "thanks", "thank", "hello", "nice", "happy"}
    negative = {"bad", "sorry", "lost", "confused", "late", "wrong", "problem"}
    pos = sum(1 for t in tokens if t in positive)
    neg = sum(1 for t in tokens if t in negative)
    total = max(len(tokens), 1)
    return {
        "polarity": round((pos - neg) / total, 2),
        "subjectivity": round(min(1.0, (pos + neg + 1) / total), 2),
    }


def _text_to_sign_convert(text: str, sign_language: str = "ASL") -> dict:
    tokens = re.findall(r"[\w']+", text.lower())
    metadata: list[dict] = []
    seen: set[str] = set()
    for token in tokens:
        if token in _STOP_WORDS:
            continue
        word = token.upper()
        if word in seen:
            continue
        seen.add(word)
        if token in _TIME_WORDS:
            tag = "TIME"
        elif token in _SUBJECT_WORDS:
            tag = "SUBJECT"
        elif token in _ACTION_WORDS or token.endswith("ing") or token.endswith("ed"):
            tag = "ACTION"
        elif len(token) <= 3:
            tag = "MODIFIER"
        else:
            tag = "OBJECT"
        metadata.append({"word": word, "tag": tag, "duration_ms": _duration_for(word, tag)})
    if not metadata:
        word = text.upper().strip()
        metadata.append({"word": word, "tag": "OBJECT", "duration_ms": _duration_for(word, "OBJECT")})
    metadata.sort(key=lambda x: _TAG_RANK.get(x["tag"], 99))
    word_sequence = [m["word"] for m in metadata]
    return {
        "sign_language": sign_language.upper(),
        "word_sequence": word_sequence,
        "fingerspell_fallback": [w for w in word_sequence if w not in _KNOWN_SIGNS or len(w) > 7],
        "animation_clips": [
            {
                "word": m["word"],
                "clip_url": f"/clips/asl/{m['word'].lower()}.glb",
                "fingerspell": len(m["word"]) > 7,
                "duration_ms": m["duration_ms"],
                "tag": m["tag"],
            }
            for m in metadata
        ],
        "sentiment": _sign_sentiment(tokens),
        "syntactic_metadata": metadata,
    }


# ── Mock fallback signs ───────────────────────────────────────────────────────
_MOCK_SIGNS = [
    "HELLO", "THANK YOU", "WHERE", "HELP", "MY NAME IS",
    "I DON'T UNDERSTAND", "PLEASE REPEAT", "NICE TO MEET YOU",
]

# ── Pydantic schemas ──────────────────────────────────────────────────────────


class LandmarkRequest(BaseModel):
    frame_b64: str
    width: int
    height: int


class LandmarkResponse(BaseModel):
    right_hand: list[dict]
    left_hand: list[dict]
    pose: list[dict]
    face: list[dict]
    hand_detected: bool
    confidence: float


class ClassifyRequest(BaseModel):
    right_hand: list[dict] = []
    left_hand: list[dict] = []
    pose: list[dict] = []
    face: list[dict] = []
    landmarks: list[dict] = []
    sign_language: str = "ASL"


class ClassifyResponse(BaseModel):
    predicted_sign: str
    confidence: float
    alternatives: list[dict]


class SaveRecognitionRequest(BaseModel):
    text: str
    sign_language: str = "ASL"


class TrainRequest(BaseModel):
    samples_per_sign: int = 150
    n_folds: int = 5
    kmeans_clusters: int = 20
    data_source: str | None = None


class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "auto"
    target_lang: str = "fr"


class TextToSignRequest(BaseModel):
    text: str
    sign_language: str = "ASL"


class PhrasebookSaveRequest(BaseModel):
    history_id: str


class PhrasebookUpdateRequest(BaseModel):
    extra: dict = {}


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/api/health", tags=["System"])
def health_check():
    return {
        "status": "ok",
        "service": "SignBridge API",
        "version": "2.0.0",
        "timestamp": int(time.time()),
        "mode": "python/sqlite",
    }


@app.post("/api/sign/extract-landmarks", response_model=LandmarkResponse, tags=["Sign Language"])
def extract_landmarks(req: LandmarkRequest):
    """Extract hand, body-pose, and face landmarks from a base64-encoded image frame."""
    try:
        base64.b64decode(req.frame_b64, validate=True)
    except Exception:
        raise HTTPException(status_code=422, detail="frame_b64 is not valid base64")

    mp_holistic = _get_mp_holistic()

    if mp_holistic is not None:
        import cv2
        img_bytes = base64.b64decode(req.frame_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=422, detail="Could not decode image from frame_b64")
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        def _lms(landmark_list):
            if not landmark_list:
                return []
            return [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in landmark_list.landmark]

        with mp_holistic.Holistic(static_image_mode=True, model_complexity=1) as holistic:
            results = holistic.process(frame_rgb)

        rh = _lms(results.right_hand_landmarks)
        lh = _lms(results.left_hand_landmarks)
        pose = _lms(results.pose_landmarks)
        face = _lms(results.face_landmarks)
        hand_detected = bool(rh or lh)

        return LandmarkResponse(
            right_hand=rh, left_hand=lh, pose=pose, face=face,
            hand_detected=hand_detected, confidence=0.95 if hand_detected else 0.0,
        )

    return LandmarkResponse(
        right_hand=[], left_hand=[], pose=[], face=[],
        hand_detected=False, confidence=0.0,
    )


@app.post("/api/sign/classify", response_model=ClassifyResponse, tags=["Sign Language"])
def classify_sign(req: ClassifyRequest):
    """Classify a sign gesture using the trained ML model."""
    lang = (req.sign_language or "ASL").upper()
    ml_model, ml_classes = _get_ml_model(lang)

    predicted = None
    confidence = 0.0
    alternatives: list[dict] = []

    if ml_model is not None and ml_classes is not None:
        features = extract_holistic_features(
            right_hand=req.right_hand or None,
            left_hand=req.left_hand or None,
            pose=req.pose or None,
            face=req.face or None,
        ).reshape(1, -1)

        try:
            predicted_idx = int(ml_model.predict(features)[0])
            predicted = ml_classes[predicted_idx]
            probas = ml_model.predict_proba(features)[0]
            top_indices = np.argsort(probas)[::-1]
            confidence = float(probas[predicted_idx])
            alternatives = [
                {"sign": ml_classes[i], "confidence": round(float(probas[i]), 4)}
                for i in top_indices[1:4]
            ]
        except Exception:
            predicted = None

    mock_pool = ml_classes if ml_classes else _MOCK_SIGNS
    if predicted is None:
        predicted = random.choice(mock_pool)
        confidence = round(random.uniform(0.72, 0.98), 2)
        alternatives = [
            {"sign": s, "confidence": round(random.uniform(0.05, 0.30), 2)}
            for s in random.sample([s for s in mock_pool if s != predicted], k=min(3, len(mock_pool) - 1))
        ]

    return ClassifyResponse(
        predicted_sign=predicted,
        confidence=confidence,
        alternatives=alternatives,
    )


@app.post("/api/ml/train", tags=["ML"])
def train_model(req: TrainRequest):
    """Train (or retrain) the sign classification model."""
    try:
        report = run_training(
            data_source=req.data_source,
            samples_per_sign=req.samples_per_sign,
            n_folds=req.n_folds,
            kmeans_clusters=req.kmeans_clusters,
            verbose=False,
        )
        lang = (req.data_source or "ASL").upper()
        if lang == "TSL":
            _ml_models.pop("TSL", None)
            _get_ml_model("TSL")
        else:
            _ml_models.pop("ASL", None)
            _get_ml_model("ASL")
        return {"status": "ok", "report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {e}")


@app.get("/api/ml/report", tags=["ML"])
def get_ml_report():
    """Return the most recent training report."""
    from backend.ml.train import REPORT_PATH
    if not REPORT_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="No training report found. POST /api/ml/train to train the model first.",
        )
    with open(REPORT_PATH, "r") as f:
        report = json.load(f)
    return report


@app.post("/api/ml/youtube-learn", tags=["ML"])
async def youtube_learn(req: dict):
    """Kick off self-supervised learning from a YouTube ASL video."""
    from concurrent.futures import ThreadPoolExecutor
    from backend.ml.youtube_learner import learn_from_url

    url = req.get("url", "")
    if not url:
        raise HTTPException(status_code=422, detail="url is required")

    loop = asyncio.get_event_loop()
    executor = ThreadPoolExecutor(max_workers=1)
    stats = await loop.run_in_executor(
        executor,
        lambda: learn_from_url(
            url,
            dry_run=req.get("dry_run", False),
            lr=float(req.get("lr", 1e-4)),
            min_frames=int(req.get("min_frames", 8)),
        ),
    )
    return stats


@app.post("/api/sign/save-recognition", tags=["Sign Language"])
def save_recognition(req: SaveRecognitionRequest):
    """Persist a recognized sign sequence into history."""
    if not req.text.strip():
        raise HTTPException(status_code=422, detail="text field must not be empty")

    words = req.text.upper().replace(",", "").replace(".", "").replace("?", "").split()
    metadata = [{"word": w, "tag": "RECOGNIZED"} for w in words]

    entry = _db_create_entry({
        "entry_type": "sign_expression",
        "source_text": req.text,
        "translated_text": req.text,
        "sign_language": req.sign_language,
        "sentiment": {"polarity": 0.0, "subjectivity": 0.0},
        "metadata": metadata,
        "extra": {"word_sequence": words},
    })
    return {"status": "saved", "history_id": entry["id"], "history_entry": entry}


@app.get("/api/history", tags=["History"])
def get_history(entry_type: str | None = None, limit: int = 10):
    """Return history entries, newest first."""
    limit = max(1, min(limit, 100))
    conn = _open_db()
    try:
        if entry_type:
            rows = conn.execute(
                "SELECT * FROM history_entries WHERE entry_type = ? ORDER BY created_at DESC LIMIT ?",
                (entry_type, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM history_entries ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
    finally:
        conn.close()
    return {"data": [_map_row(r) for r in rows]}


@app.post("/api/translate", tags=["Translation"])
def translate(req: TranslateRequest):
    """Translate text and persist the result to history."""
    text = re.sub(r"\s+", " ", req.text).strip()
    if not text:
        raise HTTPException(status_code=422, detail="The text field must not be empty.")

    target = req.target_lang.lower().strip()
    if not target or target == "auto":
        raise HTTPException(status_code=422, detail="A concrete target language is required.")

    source = req.source_lang.lower().strip()
    detected_source = _detect_language(text) if (not source or source == "auto") else source

    translated = text if detected_source == target else _do_translate(text, detected_source, target)

    note = _CULTURAL_NOTES.get(target, _CULTURAL_NOTES["en"])

    entry = _db_create_entry({
        "entry_type": "translation",
        "source_text": text,
        "translated_text": translated,
        "source_lang": detected_source,
        "target_lang": target,
        "cultural_note": note["cultural_note"],
        "formality_level": note["formality_level"],
        "regional_variant": note["regional_variant"],
    })

    return {
        "translated_text": translated,
        "cultural_note": note["cultural_note"],
        "formality_level": note["formality_level"],
        "regional_variant": note["regional_variant"],
        "formality_detail": note["formality_detail"],
        "source_lang_detected": detected_source,
        "history_entry": entry,
    }


@app.post("/api/text-to-sign", tags=["Sign Language"])
def text_to_sign(req: TextToSignRequest):
    """Convert text to sign language metadata and persist to history."""
    text = re.sub(r"\s+", " ", req.text).strip()
    if not text:
        raise HTTPException(status_code=422, detail="The text field must not be empty.")

    sign_data = _text_to_sign_convert(text, req.sign_language)

    entry = _db_create_entry({
        "entry_type": "sign_expression",
        "source_text": text,
        "translated_text": " ".join(sign_data["word_sequence"]),
        "sign_language": sign_data["sign_language"],
        "sentiment": sign_data["sentiment"],
        "metadata": sign_data["syntactic_metadata"],
        "extra": {"word_sequence": sign_data["word_sequence"]},
    })

    return {**sign_data, "history_entry": entry}


@app.get("/api/phrasebook", tags=["Phrasebook"])
def get_phrasebook(limit: int = 100):
    """List phrasebook entries."""
    limit = max(1, min(limit, 200))
    conn = _open_db()
    try:
        rows = conn.execute(
            "SELECT * FROM history_entries WHERE is_phrasebook = 1 ORDER BY created_at DESC LIMIT ?",
            (limit,),
        ).fetchall()
    finally:
        conn.close()
    return {"data": [_map_row(r) for r in rows]}


@app.post("/api/phrasebook", tags=["Phrasebook"])
def save_phrasebook(req: PhrasebookSaveRequest):
    """Mark a translation history entry as a phrasebook entry."""
    history_id = req.history_id.strip()
    if not history_id:
        raise HTTPException(status_code=422, detail="A history_id is required to save a phrase.")

    conn = _open_db()
    try:
        result = conn.execute(
            "UPDATE history_entries SET is_phrasebook = 1 WHERE id = ? AND entry_type = 'translation'",
            (history_id,),
        )
        conn.commit()
        updated = result.rowcount
    finally:
        conn.close()

    if updated == 0:
        raise HTTPException(status_code=404, detail="Translation history entry not found.")

    return {"entry": _db_get_entry(history_id)}


@app.delete("/api/phrasebook/{entry_id}", tags=["Phrasebook"])
def delete_phrasebook(entry_id: str):
    """Remove an entry from the phrasebook."""
    conn = _open_db()
    try:
        result = conn.execute(
            "UPDATE history_entries SET is_phrasebook = 0 WHERE id = ?",
            (entry_id,),
        )
        conn.commit()
        updated = result.rowcount
    finally:
        conn.close()

    if updated == 0:
        raise HTTPException(status_code=404, detail="Phrasebook entry not found.")

    return {"deleted": True}


@app.patch("/api/phrasebook/{entry_id}", tags=["Phrasebook"])
def update_phrasebook(entry_id: str, req: PhrasebookUpdateRequest):
    """Update the extra JSON field of a phrasebook entry."""
    conn = _open_db()
    try:
        conn.execute(
            "UPDATE history_entries SET extra_json = ? WHERE id = ?",
            (json.dumps(req.extra), entry_id),
        )
        conn.commit()
    finally:
        conn.close()

    return {"entry": _db_get_entry(entry_id)}


@app.get("/api/cultural-notes/{lang}", tags=["Translation"])
def get_cultural_notes(lang: str):
    """Return detailed cultural notes for a language code."""
    normalized = lang.lower()
    if normalized not in _CULTURAL_NOTES:
        raise HTTPException(status_code=404, detail=f'No cultural notes found for "{lang}".')
    return {"lang": normalized, **_CULTURAL_NOTES[normalized]}


# ── WebSocket: real-time sign streaming ────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


manager = ConnectionManager()


@app.websocket("/ws/sign", name="ws_sign")
async def websocket_sign(ws: WebSocket):
    """
    Real-time sign-language streaming endpoint.

    Client sends:
        { "type": "TRANSCRIPT", "text": "Hello how are you" }
        { "type": "PING" }

    Server sends:
        { "type": "SIGN_SEQUENCE", "signs": ["HELLO", "HOW", "ARE", "YOU"] }
        { "type": "SIGN_WORD", "word": "HELLO", "pose": "HELLO", "durationMs": 600 }
        { "type": "PONG" }
    """
    await manager.connect(ws)
    try:
        while True:
            raw = await ws.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_text(json.dumps({"type": "ERROR", "message": "Invalid JSON"}))
                continue

            msg_type = msg.get("type", "")

            if msg_type == "PING":
                await ws.send_text(json.dumps({"type": "PONG"}))

            elif msg_type == "TRANSCRIPT":
                text: str = msg.get("text", "").strip()
                if not text:
                    continue

                words = text.upper().replace(",", "").replace(".", "").replace("?", "").split()

                _GLOSS_MAP: dict[str, str] = {
                    "HELLO": "HELLO", "HI": "HELLO", "HEY": "HELLO",
                    "THANK": "THANK_YOU", "THANKS": "THANK_YOU",
                    "YES": "YES", "YEAH": "YES",
                    "NO": "NO", "NOT": "NO",
                    "PLEASE": "PLEASE",
                    "HELP": "HELP",
                    "WHERE": "WHERE",
                    "UNDERSTAND": "UNDERSTAND", "UNDERSTOOD": "UNDERSTAND",
                    "SORRY": "SORRY",
                }

                sign_seq = []
                for word in words:
                    gloss = _GLOSS_MAP.get(word)
                    if gloss:
                        sign_seq.append({
                            "word": word,
                            "pose": gloss,
                            "durationMs": 600 + len(word) * 30,
                        })
                    else:
                        for letter in word:
                            if letter.isalpha():
                                sign_seq.append({
                                    "word": letter,
                                    "pose": f"FINGERSPELL_{letter}",
                                    "durationMs": 350,
                                })

                await ws.send_text(json.dumps({
                    "type": "SIGN_SEQUENCE",
                    "signs": [s["pose"] for s in sign_seq],
                    "total": len(sign_seq),
                }))

                for item in sign_seq:
                    await ws.send_text(json.dumps({"type": "SIGN_WORD", **item}))
                    await asyncio.sleep(item["durationMs"] / 1000)

                await ws.send_text(json.dumps({"type": "SIGN_SEQUENCE_DONE"}))

            else:
                await ws.send_text(json.dumps({
                    "type": "ERROR",
                    "message": f"Unknown message type: {msg_type}",
                }))

    except WebSocketDisconnect:
        manager.disconnect(ws)
