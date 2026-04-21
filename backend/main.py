"""
TRADUMUST — FastAPI Backend
=======================================
MVP: All sign-language endpoints are mocked.
Swap in real MediaPipe / model inference under PRODUCTION sections.

Run with:
    pip install fastapi uvicorn python-multipart
    uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import base64
import random
import time
import uuid
from typing import Any, Literal
from collections import OrderedDict

import asyncio
import json

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from deep_translator import GoogleTranslator
from textblob import TextBlob, Word

# ── ML pipeline ───────────────────────────────────────────────────────────────
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from backend.ml.feature_extractor import extract_holistic_features
from backend.ml.train   import load_trained_model, run_training

import numpy as np

# MediaPipe Holistic (lazy-loaded to avoid startup delay when not used)
_mp_holistic  = None
_mp_solutions = None

def _get_mp_holistic():
    """
    Lazy-load MediaPipe Holistic.
    Returns the holistic module on success, or None if unavailable.
    mediapipe >= 0.10.9 removed the legacy solutions API — we fall back
    gracefully to mock landmarks when it's missing.
    """
    global _mp_holistic, _mp_solutions
    if _mp_holistic is None:
        try:
            import mediapipe as mp
            import cv2 as _cv2  # noqa: F401 — verify opencv is present
            _mp_solutions = getattr(mp, 'solutions', None)
            if _mp_solutions is None or not hasattr(_mp_solutions, 'holistic'):
                raise AttributeError("mediapipe.solutions.holistic not available")
            _mp_holistic = _mp_solutions.holistic
        except (ImportError, AttributeError):
            _mp_holistic = False   # sentinel: tried but unavailable
    return _mp_holistic if _mp_holistic is not False else None

# ── App setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="TRADUMUST API",
    description="Translation, cultural context, and sign-language bridge endpoints.",
    version="0.1.0",
    mode="MVP (mock data — swap in real APIs for production)",
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
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load trained model at startup (non-blocking — falls back to mock if missing)
_ml_model   = None
_ml_classes = None
_lstm_model = None

@app.on_event("startup")
def load_model():
    global _ml_model, _ml_classes, _lstm_model
    try:
        from backend.ml.train import load_trained_model, LSTM_PATH
        from backend.ml.lstm_model import SignLanguageLSTM
        import torch
        
        _ml_model, _ml_classes = load_trained_model()
        
        if LSTM_PATH.exists():
            _lstm_model = SignLanguageLSTM(input_size=186, num_classes=len(_ml_classes))
            _lstm_model.load_state_dict(torch.load(LSTM_PATH, map_location='cpu'))
            _lstm_model.eval()
            print("OK LSTM model loaded")
            
    except Exception as e:
        print(f"DEBUG: Startup model loading info: {e}")

# ── In-memory history & phrasebook store ─────────────────────────────────────
# Keyed by entry id (32-char hex). OrderedDict preserves insertion order.
# Persisted to backend/data/history.json to survive hot-reloads.
HISTORY_FILE = os.path.join(os.path.dirname(__file__), "data", "history.json")

def _load_history_store() -> OrderedDict[str, dict]:
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                pairs = json.load(f)
                return OrderedDict(pairs)
        except Exception as e:
            print(f"DEBUG: Could not load persistence file: {e}")
    return OrderedDict()

_history_store: OrderedDict[str, dict] = _load_history_store()

def _save_history_store():
    try:
        with open(HISTORY_FILE, "w", encoding="utf-8") as f:
            # Save as list of [id, entry] pairs to preserve OrderedDict order in JSON
            json.dump(list(_history_store.items()), f, indent=2)
    except Exception as e:
        print(f"DEBUG: Could not save persistence file: {e}")


def _make_entry(
    entry_type: str,
    source: str,
    source_lang: str | None,
    target_lang: str | None,
    sign_language: str | None,
    result: dict,
    sentiment: dict | None = None,
    metadata: list | None = None,
    word_sequence: list | None = None,
    extra: dict | None = None,
) -> dict:
    """Create and persist a new history entry, returned as a plain dict."""
    entry_id = uuid.uuid4().hex  # 32 hex chars
    ts = int(time.time())
    entry: dict[str, Any] = {
        "id": entry_id,
        "entry_type": entry_type,
        "source": source,
        "sourceLang": source_lang,
        "targetLang": target_lang,
        "signLanguage": sign_language,
        "timestamp": ts,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(ts)),
        "isPhrasebook": False,
        "result": result,
        "sentiment": sentiment,
        "metadata": metadata or [],
        "wordSequence": word_sequence or [],
        "extra": extra or {},
    }
    _history_store[entry_id] = entry
    # Keep at most 500 entries to avoid unbounded memory growth
    while len(_history_store) > 500:
        _history_store.popitem(last=False)
    
    _save_history_store()
    return entry


# ── Pydantic schemas ─────────────────────────────────────────────────────────

class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "auto"
    target_lang: str = "fr"


class LandmarkRequest(BaseModel):
    """Base64-encoded JPEG/PNG frame from the webcam."""
    frame_b64: str
    width: int
    height: int


class LandmarkResponse(BaseModel):
    # Holistic output — separate arrays so classify can use all three
    right_hand: list[dict]   # 21 landmarks {x,y,z} or []
    left_hand:  list[dict]   # 21 landmarks {x,y,z} or []
    pose:       list[dict]   # 33 landmarks {x,y,z} or []
    face:       list[dict]   # 468 landmarks {x,y,z} or []
    hand_detected: bool
    confidence: float


class ClassifyRequest(BaseModel):
    # New holistic format (preferred)
    right_hand: list[dict] = []   # 21 landmarks {x,y,z}
    left_hand:  list[dict] = []   # 21 landmarks {x,y,z}
    pose:       list[dict] = []   # 33 pose landmarks for normalization
    face:       list[dict] = []   # 468+ face landmarks
    # Legacy flat format (still accepted for backwards compatibility)
    landmarks:  list[dict] = []   # old: flat 21-landmark list


class ClassifyResponse(BaseModel):
    predicted_sign: str
    confidence: float
    alternatives: list[dict]  # [{"sign": "...", "confidence": 0.x}]


class TextToSignRequest(BaseModel):
    text: str
    sign_language: str = "ASL"


class SaveRecognitionRequest(BaseModel):
    text: str
    sign_language: str = "ASL"


# ── Mock data ─────────────────────────────────────────────────────────────────

_CULTURAL_NOTES: dict[str, dict] = {
    "fr": {
        "cultural_note": (
            "In French, 'vous' is the polite/formal second-person pronoun used with strangers, "
            "professors, and authority figures. Use 'tu' only with close friends or peers who "
            "have explicitly invited it. Getting this wrong can seem rude or overly familiar."
        ),
        "formality_level": "formal",
        "regional_variant": "France French (Hexagonal)",
    },
    "es": {
        "cultural_note": (
            "Spanish has two words for 'you': 'usted' (formal) and 'tú' (informal). "
            "In Latin America, 'ustedes' covers both formal and informal plural. "
            "In Spain, 'vosotros' is informal plural. Formality expectations differ by country — "
            "Argentina uses 'vos' instead of 'tú'."
        ),
        "formality_level": "formal",
        "regional_variant": "Latin American Spanish",
    },
    "ja": {
        "cultural_note": (
            "Japanese embeds formality into verb endings. 'Desu/masu' forms are polite and safe "
            "for exchange students in all academic settings. 'Keigo' (honorific speech) has three "
            "levels — teineigo (polite), sonkeigo (respectful), and kenjōgo (humble). "
            "Mastering teineigo covers most daily interactions."
        ),
        "formality_level": "formal",
        "regional_variant": "Standard Japanese (Hyōjungo)",
    },
    "de": {
        "cultural_note": (
            "German uses 'Sie' (capitalized, formal) and 'du' (informal). In German universities, "
            "it is standard to address professors as 'Herr/Frau [Last Name]'. Switching to 'du' "
            "is always the other person's invitation to make — never assume it."
        ),
        "formality_level": "formal",
        "regional_variant": "Standard German (Hochdeutsch)",
    },
    "zh": {
        "cultural_note": (
            "Mandarin Chinese is less pronoun-formal than European languages but highly "
            "context-sensitive. Titles are important: address professors as 'Lǎoshī' (老师). "
            "Refusing food or gifts at first offering is polite — hosts expect you to accept "
            "on the second or third offer."
        ),
        "formality_level": "neutral",
        "regional_variant": "Simplified Chinese (Mainland)",
    },
    "ar": {
        "cultural_note": (
            "Arabic has significant diglossia: Modern Standard Arabic (MSA) is used in education "
            "and formal writing, while each region has a spoken dialect. In academic contexts, "
            "MSA is expected in writing. Greetings often include religious expressions "
            "('As-salamu alaykum') — it's respectful to use them."
        ),
        "formality_level": "formal",
        "regional_variant": "Modern Standard Arabic (MSA)",
    },
    "ko": {
        "cultural_note": (
            "Korean has a formal speech level system called 'Gyeongeo'. The '-시-' honorific "
            "infix elevates the subject. Use the formal polite ending '-습니다/ㅂ니다' in academic "
            "or professional contexts. Addressing seniors by their role title is common."
        ),
        "formality_level": "formal",
        "regional_variant": "Standard Korean (Seoul dialect)",
    },
    "it": {
        "cultural_note": (
            "Italian uses 'Lei' (formal) and 'tu' (informal). In academic settings, use 'Lei' "
            "with professors. Italy has strong regional dialects — what you learn as 'standard "
            "Italian' is based on Florentine-Tuscan, though Rome and Milan accents dominate media."
        ),
        "formality_level": "formal",
        "regional_variant": "Standard Italian",
    },
    "pt": {
        "cultural_note": (
            "Portuguese from Brazil (PT-BR) and Portugal (PT-PT) differ notably in pronunciation, "
            "vocabulary, and formality. Brazilian Portuguese is generally more informal in daily "
            "speech. The word 'você' (you) is standard in Brazil; in Portugal, 'o senhor/a senhora' "
            "is used formally."
        ),
        "formality_level": "neutral",
        "regional_variant": "Brazilian Portuguese (PT-BR)",
    },
    "en": {
        "cultural_note": (
            "English is widely used as a lingua franca in international academic settings. "
            "British, American, and Australian English have subtle vocabulary differences "
            "(e.g. 'lift' vs 'elevator', 'maths' vs 'math'). Tone and context matter more "
            "than strict pronoun formality."
        ),
        "formality_level": "neutral",
        "regional_variant": "International English",
    },
}

# No mock translations! We will use deep-translator.

_MOCK_SIGNS = [
    "HELLO",
    "THANK YOU",
    "WHERE",
    "HELP",
    "MY NAME IS",
    "I DON'T UNDERSTAND",
    "PLEASE REPEAT",
    "NICE TO MEET YOU",
]

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/api/health", tags=["System"])
def health_check():
    """Returns service health and timestamp."""
    return {
        "status": "ok",
        "service": "TRADUMUST API",
        "version": "0.1.0",
        "timestamp": int(time.time()),
        "mode": "MVP (mock data — swap in real APIs for production)",
    }


@app.post("/api/translate", tags=["Translation"])
def translate_text(req: TranslateRequest):
    """
    Translate text and return cultural context + a persisted history entry.

    PRODUCTION SWAP:
        Replace the mock lookup below with a call to LibreTranslate:
            import httpx
            resp = httpx.post("http://localhost:5000/translate", json={
                "q": req.text, "source": req.source_lang, "target": req.target_lang
            })
        Or Google Cloud Translation API:
            from google.cloud import translate_v2
            client = translate_v2.Client()
            result = client.translate(req.text, target_language=req.target_lang)
    """
    if not req.text.strip():
        raise HTTPException(status_code=422, detail="text field must not be empty")

    detected_source = req.source_lang if req.source_lang != "auto" else "auto"
    target = req.target_lang

    try:
        translated = GoogleTranslator(source=detected_source, target=target).translate(req.text)
    except Exception:
        # Fallback if connection fails
        translated = req.text

    # Cultural note for target language
    note_data = _CULTURAL_NOTES.get(target, _CULTURAL_NOTES["en"])

    result = {
        "translated_text": translated,
        "cultural_note": note_data["cultural_note"],
        "formality_level": note_data["formality_level"],
        "regional_variant": note_data["regional_variant"],
        "source_lang_detected": detected_source,
        "formality_detail": None,
    }

    entry = _make_entry(
        entry_type="translation",
        source=req.text,
        source_lang=detected_source,
        target_lang=target,
        sign_language=None,
        result=result,
    )

    return {**result, "history_entry": entry}


@app.post("/api/sign/extract-landmarks", response_model=LandmarkResponse, tags=["Sign Language"])
def extract_landmarks(req: LandmarkRequest):
    """
    Extract hand, body-pose, and face landmarks from a base64-encoded image frame.
    """
    try:
        base64.b64decode(req.frame_b64, validate=True)
    except Exception:
        raise HTTPException(status_code=422, detail="frame_b64 is not valid base64")

    mp_holistic = _get_mp_holistic()

    if mp_holistic is not None:
        import cv2
        img_bytes = base64.b64decode(req.frame_b64)
        nparr     = np.frombuffer(img_bytes, np.uint8)
        frame     = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if frame is None:
            raise HTTPException(status_code=422, detail="Could not decode image from frame_b64")
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        def _lms(landmark_list):
            if not landmark_list: return []
            return [{"x": lm.x, "y": lm.y, "z": lm.z} for lm in landmark_list.landmark]

        with mp_holistic.Holistic(static_image_mode=True, model_complexity=1) as holistic:
            results = holistic.process(frame_rgb)

        rh   = _lms(results.right_hand_landmarks)
        lh   = _lms(results.left_hand_landmarks)
        pose = _lms(results.pose_landmarks)
        face = _lms(results.face_landmarks)

        hand_detected = bool(rh or lh)
        confidence    = 0.95 if hand_detected else 0.0

        return LandmarkResponse(
            right_hand=rh, left_hand=lh, pose=pose, face=face,
            hand_detected=hand_detected, confidence=confidence,
        )

    return LandmarkResponse(
        right_hand=[], left_hand=[], pose=[], face=[],
        hand_detected=False, confidence=0.0,
    )


@app.post("/api/sign/classify", response_model=ClassifyResponse, tags=["Sign Language"])
def classify_sign(req: ClassifyRequest):
    """
    Classify a sign gesture using either the Classic Sklearn model or the new LSTM PyTorch model.
    """
    global _ml_model, _ml_classes
    
    # In a real scenario, we might receive a sequence of frames. 
    # For this endpoint, we'll handle the single-frame classification using the best available model.
    
    predicted   = None
    confidence  = 0.0
    alternatives = []

    # Check if we have an LSTM model (requires sequences, but we can mock a sequence of 1 for now)
    # or use the classic model on a single frame.
    
    if _ml_model is not None and _ml_classes is not None:
        features = extract_holistic_features(
            right_hand=req.right_hand or None,
            left_hand=req.left_hand  or None,
            pose=req.pose            or None,
            face=req.face            or None,
        ).reshape(1, -1)

        try:
            # For now, we still use the classic model for the single-frame endpoint
            # but it now uses the 186-dim feature vector.
            predicted_idx = int(_ml_model.predict(features)[0])
            predicted     = _ml_classes[predicted_idx]
            probas        = _ml_model.predict_proba(features)[0]
            top_indices   = np.argsort(probas)[::-1]
            confidence    = float(probas[predicted_idx])
            alternatives  = [
                {"sign": _ml_classes[i], "confidence": round(float(probas[i]), 4)}
                for i in top_indices[1:4]
            ]
        except Exception:
            predicted = None

    if predicted is None:
        predicted   = random.choice(_MOCK_SIGNS)
        confidence  = round(random.uniform(0.72, 0.98), 2)
        alternatives = [
            {"sign": s, "confidence": round(random.uniform(0.05, 0.30), 2)}
            for s in random.sample([s for s in _MOCK_SIGNS if s != predicted], k=3)
        ]

    return ClassifyResponse(
        predicted_sign=predicted,
        confidence=confidence,
        alternatives=alternatives,
    )


# ── ML training endpoints ─────────────────────────────────────────────────────

class TrainRequest(BaseModel):
    samples_per_sign: int = 150
    n_folds: int = 5
    kmeans_clusters: int = 20


@app.post("/api/ml/train", tags=["ML"])
def train_model(req: TrainRequest):
    """
    Train (or retrain) the sign classification model.

    Runs the full pipeline:
      1. Generate synthetic dataset from signs_data.json
      2. Train KNN, RandomForest, SVM with 5-fold cross-validation
      3. Run K-Means + PCA unsupervised analysis
      4. Save the best model to trained_model.pkl
      5. Save the full metrics report to training_report.json

    Returns the full training report (accuracy, CV scores, cluster metrics, etc.)
    """
    global _ml_model, _ml_classes
    try:
        report = run_training(
            samples_per_sign=req.samples_per_sign,
            n_folds=req.n_folds,
            kmeans_clusters=req.kmeans_clusters,
            verbose=False,
        )
        # Reload the freshly trained model into memory
        _ml_model, _ml_classes = load_trained_model()
        return {"status": "ok", "report": report}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {e}")


@app.get("/api/ml/report", tags=["ML"])
def get_ml_report():
    """
    Return the most recent training report (training_report.json).

    Includes:
      - Dataset statistics (samples, classes, features)
      - Per-model cross-validation scores (accuracy, F1, overfit gap)
      - Best model name and test accuracy
      - K-Means cluster evaluation (ARI, NMI, purity)
      - PCA explained variance
      - Learning curve data
    """
    from backend.ml.train import REPORT_PATH
    if not REPORT_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="No training report found. POST /api/ml/train to train the model first.",
        )
    with open(REPORT_PATH, "r") as f:
        report = json.load(f)
    return report


@app.post("/api/text-to-sign", tags=["Sign Language"])
def text_to_sign(req: TextToSignRequest):
    """
    Convert text to a sequence of ASL sign animation triggers.

    Returns word-level sign gloss, fingerspelling flags, and a persisted history entry.

    PRODUCTION SWAP:
        Use a sign language lexicon / gloss dictionary to map English words to ASL glosses.
        Words without a direct sign should fall back to fingerspelling.
        animation_clips should point to real GLB file URLs served from your CDN/storage.
    """
    if not req.text.strip():
        raise HTTPException(status_code=422, detail="text field must not be empty")

    blob = TextBlob(req.text)

    # 1. Sentiment Analysis
    sentiment = {
        "polarity": round(blob.sentiment.polarity, 2),
        "subjectivity": round(blob.sentiment.subjectivity, 2)
    }

    # 2. Advanced ASL Glossing Logic
    # ASL Structure Target: TIME + SUBJECT + OBJECT + VERB
    # We use POS tags: NN (Noun), VB (Verb), JJ (Adj), RB (Adv), PRP (Pronoun), etc.

    tags = blob.tags
    time_words: list[dict] = []
    subjects:   list[dict] = []
    objects:    list[dict] = []
    verbs:      list[dict] = []
    others:     list[dict] = []

    time_keywords = {"tomorrow", "yesterday", "today", "now", "soon", "later", "morning", "night"}

    for word, tag in tags:
        w_lower = word.lower()
        # Lemmatize all words to their root form (e.g., "going" -> "go")
        lemma = Word(w_lower).lemmatize("v") if "VB" in tag else Word(w_lower).lemmatize()
        upper_lemma = lemma.upper()

        if w_lower in time_keywords or tag == "RB":
            time_words.append({"word": upper_lemma, "tag": "TIME"})
        elif tag in ["PRP", "NNP"] or (tag == "NN" and not subjects):
            subjects.append({"word": upper_lemma, "tag": "SUBJECT"})
        elif tag in ["NN", "NNS"]:
            objects.append({"word": upper_lemma, "tag": "OBJECT"})
        elif "VB" in tag:
            verbs.append({"word": upper_lemma, "tag": "ACTION"})
        else:
            if upper_lemma not in ["A", "AN", "THE", "AM", "IS", "ARE", "BE"]:
                others.append({"word": upper_lemma, "tag": "MODIFIER"})

    # Reconstruct in ASL logic order
    ordered_metadata = time_words + subjects + objects + verbs + others

    # Filter uniques while preserving order
    unique_meta: list[dict] = []
    seen: set[str] = set()
    for item in ordered_metadata:
        if item["word"] not in seen:
            unique_meta.append(item)
            seen.add(item["word"])

    word_sequence = [item["word"] for item in unique_meta]
    fingerspell_fallback = [w for w in word_sequence if len(w) > 7]

    animation_clips = [
        {
            "word": item["word"],
            "clip_url": f"/clips/asl/{item['word'].lower()}.glb",
            "fingerspell": len(item["word"]) > 7,
            "duration_ms": 700 + len(item["word"]) * 50,
            "tag": item["tag"]
        }
        for item in unique_meta
    ]

    entry = _make_entry(
        entry_type="sign_expression",
        source=req.text,
        source_lang=None,
        target_lang=None,
        sign_language=req.sign_language,
        result={
            "translated_text": " ".join(word_sequence),
            "cultural_note": "",
            "formality_level": "neutral",
            "regional_variant": "",
        },
        sentiment=sentiment,
        metadata=unique_meta,
        word_sequence=word_sequence,
        extra={"word_sequence": word_sequence},
    )

    return {
        "sign_language": req.sign_language,
        "word_sequence": word_sequence,
        "fingerspell_fallback": fingerspell_fallback,
        "animation_clips": animation_clips,
        "sentiment": sentiment,
        "syntactic_metadata": unique_meta,
        "history_entry": entry,
    }


@app.post("/api/sign/save-recognition", tags=["Sign Language"])
def save_recognition(req: SaveRecognitionRequest):
    """
    Persist a recognized sign sequence into history.
    This allows recognized phrases to be added to the phrasebook.
    """
    if not req.text.strip():
        raise HTTPException(status_code=422, detail="text field must not be empty")

    words = req.text.upper().replace(",", "").replace(".", "").replace("?", "").split()

    # Simple mock metadata for recognition entries
    unique_meta = [{"word": w, "tag": "RECOGNIZED"} for w in words]

    entry = _make_entry(
        entry_type="sign_expression",  # Use sign_expression to be compatible with signs tab
        source=req.text,
        source_lang=None,
        target_lang=None,
        sign_language=req.sign_language,
        result={
            "translated_text": req.text,
            "cultural_note": "Persisted from AI Sign Recognition.",
            "formality_level": "neutral",
            "regional_variant": "",
        },
        sentiment={"polarity": 0.0, "subjectivity": 0.0},
        metadata=unique_meta,
        word_sequence=words,
        extra={"word_sequence": words},
    )

    return {"status": "saved", "history_id": entry["id"], "history_entry": entry}


@app.get("/api/cultural-notes/{lang}", tags=["Translation"])
def get_cultural_notes(lang: str):
    """
    Returns comprehensive cultural and linguistic educational content for a target language.
    Used to populate the sidebar educational panel and collapsible 'Why this translation works' section.
    """
    lang = lang.lower()
    note_data = _CULTURAL_NOTES.get(lang)
    if not note_data:
        raise HTTPException(
            status_code=404,
            detail=f"No cultural notes found for language code '{lang}'. "
                   f"Available: {list(_CULTURAL_NOTES.keys())}",
        )

    # Extended educational content keyed by language
    extended: dict[str, dict] = {
        "fr": {
            "quick_tips": [
                "Always say 'Bonjour' when entering a shop — it's expected politeness.",
                "Avoid asking 'How much do you earn?' — considered very personal in France.",
                "La bise (cheek-kiss greeting) varies by region: 1 to 4 kisses.",
            ],
            "academic_phrases": [
                {"phrase": "Excusez-moi, pourriez-vous répéter ?", "meaning": "Excuse me, could you repeat that?"},
                {"phrase": "Je n'ai pas compris.", "meaning": "I didn't understand."},
                {"phrase": "Comment dit-on... en français ?", "meaning": "How do you say ... in French?"},
            ],
        },
        "ja": {
            "quick_tips": [
                "Remove shoes when entering homes — look for the genkan (entryway).",
                "Bow instead of handshake as a default greeting.",
                "Never stick chopsticks upright in rice — funeral association.",
            ],
            "academic_phrases": [
                {"phrase": "もう一度言っていただけますか？", "meaning": "Could you say that again, please?"},
                {"phrase": "分かりません。", "meaning": "I don't understand."},
                {"phrase": "日本語で何と言いますか？", "meaning": "How do you say it in Japanese?"},
            ],
        },
        "es": {
            "quick_tips": [
                "Meal times are later in Spain: lunch 2–4 PM, dinner 9–11 PM.",
                "'Señor/Señora' with last name is standard professional address.",
                "Direct eye contact during conversation is a sign of respect.",
            ],
            "academic_phrases": [
                {"phrase": "¿Podría repetir eso, por favor?", "meaning": "Could you repeat that, please?"},
                {"phrase": "No entendí.", "meaning": "I didn't understand."},
                {"phrase": "¿Cómo se dice... en español?", "meaning": "How do you say ... in Spanish?"},
            ],
        },
    }

    return {
        "lang": lang,
        **note_data,
        "extended": extended.get(lang, {}),
    }


# ── WebSocket: real-time sign streaming ────────────────────────────────────────

# Simple in-memory connection manager
class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        self.active.discard(ws) if hasattr(self.active, "discard") else None
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
        { "type": "ERROR", "message": "..." }

    PRODUCTION SWAP:
        Replace mock sign lookup with a trained NLP → ASL gloss model.
        e.g. run text through a seq2seq model that maps English to ASL gloss order.
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

                # Build sign sequence from transcript
                words = text.upper().replace(",", "").replace(".", "").replace("?", "").split()

                # Mock word → ASL gloss mapping
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
                        # Fingerspell unknown words
                        for letter in word:
                            if letter.isalpha():
                                sign_seq.append({
                                    "word": letter,
                                    "pose": f"FINGERSPELL_{letter}",
                                    "durationMs": 350,
                                })

                # Send full sequence summary first
                await ws.send_text(json.dumps({
                    "type": "SIGN_SEQUENCE",
                    "signs": [s["pose"] for s in sign_seq],
                    "total": len(sign_seq),
                }))

                # Then stream word-by-word with timing so the client can sync
                for item in sign_seq:
                    await ws.send_text(json.dumps({
                        "type": "SIGN_WORD",
                        **item,
                    }))
                    await asyncio.sleep(item["durationMs"] / 1000)

                await ws.send_text(json.dumps({"type": "SIGN_SEQUENCE_DONE"}))

            else:
                await ws.send_text(json.dumps({
                    "type": "ERROR",
                    "message": f"Unknown message type: {msg_type}",
                }))

    except WebSocketDisconnect:
        manager.disconnect(ws)

@app.get("/api/history", tags=["History"])
def get_history(entry_type: str | None = None, limit: int = 10):
    """
    Return history entries from the in-memory store, newest first.
    Optionally filter by entry_type ('translation' or 'sign_expression').
    """
    entries = list(reversed(list(_history_store.values())))
    if entry_type:
        entries = [e for e in entries if e["entry_type"] == entry_type]
    return {"data": entries[:limit]}


# ── Phrasebook endpoints ───────────────────────────────────────────────────────

@app.get("/api/phrasebook", tags=["Phrasebook"])
def get_phrasebook(limit: int = 100):
    """Return all phrasebook-flagged history entries, newest first."""
    entries = [
        e for e in reversed(list(_history_store.values()))
        if e.get("isPhrasebook")
    ]
    return {"data": entries[:limit]}


@app.post("/api/phrasebook", tags=["Phrasebook"])
def save_phrasebook(payload: dict):
    """Mark an existing history entry as a phrasebook item."""
    history_id = str(payload.get("history_id", "")).strip()
    if not history_id:
        raise HTTPException(status_code=422, detail="A history_id is required to save a phrase.")
    entry = _history_store.get(history_id)
    if entry is None:
        raise HTTPException(status_code=404, detail=f"History entry '{history_id}' not found.")
    entry["isPhrasebook"] = True
    _save_history_store()
    return {"entry": entry}


@app.delete("/api/phrasebook/{entry_id}", tags=["Phrasebook"])
def delete_phrasebook(entry_id: str):
    """Remove the phrasebook flag from a history entry."""
    entry = _history_store.get(entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail=f"Entry '{entry_id}' not found.")
    entry["isPhrasebook"] = False
    _save_history_store()
    return {"deleted": True}


@app.patch("/api/phrasebook/{entry_id}", tags=["Phrasebook"])
def patch_phrasebook_srs(entry_id: str, payload: dict):
    """Update the SRS extra data on a phrasebook entry."""
    entry = _history_store.get(entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail=f"Entry '{entry_id}' not found.")
    extra = entry.get("extra", {})
    extra.update(payload.get("extra", {}))
    entry["extra"] = extra
    _save_history_store()
    return {"entry": entry}
