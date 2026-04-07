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
from typing import Literal

import asyncio
import json

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── App setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="TRADUMUST API",
    description="Translation, cultural context, and sign-language bridge endpoints.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:1234",  # Next.js dev server (TRADUMUST)
        "http://127.0.0.1:1234",
        "http://localhost:3000",  # fallback
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Pydantic schemas ─────────────────────────────────────────────────────────

class TranslateRequest(BaseModel):
    text: str
    source_lang: str = "auto"
    target_lang: str = "fr"


class TranslateResponse(BaseModel):
    translated_text: str
    cultural_note: str
    formality_level: Literal["formal", "informal", "neutral"]
    regional_variant: str
    source_lang_detected: str


class LandmarkRequest(BaseModel):
    """Base64-encoded JPEG/PNG frame from the webcam."""
    frame_b64: str
    width: int
    height: int


class LandmarkResponse(BaseModel):
    landmarks: list[dict]  # list of {x, y, z, visibility} for each of 21 hand keypoints
    hand_detected: bool
    confidence: float


class ClassifyRequest(BaseModel):
    landmarks: list[dict]


class ClassifyResponse(BaseModel):
    predicted_sign: str
    confidence: float
    alternatives: list[dict]  # [{"sign": "...", "confidence": 0.x}]


class TextToSignRequest(BaseModel):
    text: str
    sign_language: str = "ASL"


class TextToSignResponse(BaseModel):
    sign_language: str
    word_sequence: list[str]           # words to animate in order
    fingerspell_fallback: list[str]    # words with no known sign gloss -> fingerspell
    animation_clips: list[dict]        # [{"word": "hello", "clip_url": "/clips/hello.glb"}]


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

# A minimal mock translation dictionary (real: call LibreTranslate or Google Translate API)
_MOCK_TRANSLATIONS: dict[tuple[str, str], str] = {
    ("en", "fr"): "Bonjour, comment allez-vous ?",
    ("en", "es"): "Hola, ¿cómo está usted?",
    ("en", "de"): "Hallo, wie geht es Ihnen?",
    ("en", "ja"): "こんにちは、お元気ですか？",
    ("en", "zh"): "你好，你好吗？",
    ("en", "ar"): "مرحباً، كيف حالك؟",
    ("en", "pt"): "Olá, como vai você?",
    ("en", "ko"): "안녕하세요, 어떻게 지내세요?",
    ("en", "it"): "Ciao, come sta?",
}

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


@app.post("/api/translate", response_model=TranslateResponse, tags=["Translation"])
def translate_text(req: TranslateRequest):
    """
    Translate text and return cultural context.

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

    detected_source = req.source_lang if req.source_lang != "auto" else "en"
    target = req.target_lang

    # Mock translation lookup
    translated = _MOCK_TRANSLATIONS.get(
        (detected_source, target),
        req.text  # fallback: echo input (indicates unsupported pair in mock)
    )

    # Cultural note for target language
    note_data = _CULTURAL_NOTES.get(target, _CULTURAL_NOTES["en"])

    return TranslateResponse(
        translated_text=translated,
        cultural_note=note_data["cultural_note"],
        formality_level=note_data["formality_level"],  # type: ignore[arg-type]
        regional_variant=note_data["regional_variant"],
        source_lang_detected=detected_source,
    )


@app.post("/api/sign/extract-landmarks", response_model=LandmarkResponse, tags=["Sign Language"])
def extract_landmarks(req: LandmarkRequest):
    """
    Extract MediaPipe hand landmarks from a base64-encoded image frame.

    PRODUCTION SWAP:
        import mediapipe as mp
        import numpy as np
        import cv2

        mp_hands = mp.solutions.hands
        img_bytes = base64.b64decode(req.frame_b64)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        with mp_hands.Hands(static_image_mode=True, max_num_hands=1) as hands:
            results = hands.process(frame_rgb)
            if results.multi_hand_landmarks:
                lms = [{"x": lm.x, "y": lm.y, "z": lm.z, "visibility": 1.0}
                       for lm in results.multi_hand_landmarks[0].landmark]
                return LandmarkResponse(landmarks=lms, hand_detected=True, confidence=0.95)

        return LandmarkResponse(landmarks=[], hand_detected=False, confidence=0.0)
    """
    # Validate base64 (minimal check)
    try:
        base64.b64decode(req.frame_b64, validate=True)
    except Exception:
        raise HTTPException(status_code=422, detail="frame_b64 is not valid base64")

    # Mock: 21 landmark points with random normalized coordinates
    mock_landmarks = [
        {"x": round(random.uniform(0.3, 0.7), 4),
         "y": round(random.uniform(0.2, 0.8), 4),
         "z": round(random.uniform(-0.1, 0.1), 4),
         "visibility": 1.0}
        for _ in range(21)
    ]

    return LandmarkResponse(
        landmarks=mock_landmarks,
        hand_detected=True,
        confidence=round(random.uniform(0.80, 0.99), 2),
    )


@app.post("/api/sign/classify", response_model=ClassifyResponse, tags=["Sign Language"])
def classify_sign(req: ClassifyRequest):
    """
    Classify a sign gesture from MediaPipe landmarks.

    PRODUCTION SWAP:
        Load a trained TFLite / PyTorch model:
            import numpy as np
            import tflite_runtime.interpreter as tflite

            interpreter = tflite.Interpreter(model_path="sign_classifier.tflite")
            interpreter.allocate_tensors()
            input_details = interpreter.get_input_details()
            output_details = interpreter.get_output_details()

            features = np.array([[lm["x"], lm["y"], lm["z"]] for lm in req.landmarks],
                                 dtype=np.float32).flatten()
            interpreter.set_tensor(input_details[0]["index"], [features])
            interpreter.invoke()
            output = interpreter.get_tensor(output_details[0]["index"])[0]
            predicted_idx = int(np.argmax(output))
            # map predicted_idx -> ASL gloss from your label list
    """
    if not req.landmarks:
        raise HTTPException(status_code=422, detail="landmarks list is empty")

    predicted = random.choice(_MOCK_SIGNS)
    confidence = round(random.uniform(0.72, 0.98), 2)
    alternatives = [
        {"sign": s, "confidence": round(random.uniform(0.05, 0.30), 2)}
        for s in random.sample([s for s in _MOCK_SIGNS if s != predicted], k=3)
    ]

    return ClassifyResponse(
        predicted_sign=predicted,
        confidence=confidence,
        alternatives=alternatives,
    )


@app.post("/api/text-to-sign", response_model=TextToSignResponse, tags=["Sign Language"])
def text_to_sign(req: TextToSignRequest):
    """
    Convert text to a sequence of ASL sign animation triggers.

    Returns word-level sign gloss and flags words that need fingerspelling.

    PRODUCTION SWAP:
        Use a sign language lexicon / gloss dictionary to map English words to ASL glosses.
        Words without a direct sign should fall back to fingerspelling.
        animation_clips should point to real GLB file URLs served from your CDN/storage.
    """
    if not req.text.strip():
        raise HTTPException(status_code=422, detail="text field must not be empty")

    words = req.text.strip().split()
    # Mock: words > 6 chars are treated as needing fingerspelling
    word_sequence = [w.upper() for w in words]
    fingerspell_fallback = [w.upper() for w in words if len(w) > 6]

    animation_clips = [
        {
            "word": w.upper(),
            "clip_url": f"/clips/asl/{w.lower()}.glb",  # placeholder URL
            "fingerspell": len(w) > 6,
            "duration_ms": 800 + len(w) * 60,
        }
        for w in words
    ]

    return TextToSignResponse(
        sign_language=req.sign_language,
        word_sequence=word_sequence,
        fingerspell_fallback=fingerspell_fallback,
        animation_clips=animation_clips,
    )


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
