# TRADUMust 🌐🤟

**TRADUMust** is an innovative Human-Computer Interaction (HCI) platform designed to bridge the communication gap between Deaf and hearing individuals using cutting-edge Web technologies and Machine Learning.

## ✨ Key Features

- **Live Sign Language Recognition (Edge ML)**  
  Perform signs into your webcam, and Google's **MediaPipe Tasks Vision** instantly classifies and translates your hand geometries with zero latency. Processing happens 100% locally in your browser to maintain total user privacy.
  
- **3D Sign Avatar Translation**  
  Type text into the system and watch an interactive **WebGL 3D Avatar** (powered by Three.js and React Three Fiber) accurately perform the associated American Sign Language (ASL) signs and fingerspelling in real-time.

- **Cultural Context Learning**  
  TRADUMust isn't just about direct word-for-word mapping. It integrates cultural HCI design elements teaching users about crucial non-manual markers (like raised eyebrows) and the distinct regional variations of Sign Language.

## 🚀 Tech Stack

- **Frontend Core:** Next.js 14, React 18, TypeScript, TailwindCSS
- **3D Graphics:** Three.js, `@react-three/fiber`, `@react-three/drei`
- **Machine Learning:** Google MediaPipe Tasks Vision (`gesture_recognizer` model)
- **Backend API:** FastAPI (Python), Uvicorn

## 🛠️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/R2W1cs/TRADUMust.git
   cd TRADUMust
   ```

2. **Start the Next.js Frontend:**
   ```bash
   npm install
   npm run dev
   ```
   *The frontend will start actively hosting on `http://localhost:1234`.*

3. **Start the FastAPI Backend (Optional API):**
   Open a secondary terminal:
   ```bash
   cd backend
   pip install fastapi uvicorn pydantic
   uvicorn main:app --reload --port 8000
   ```

## 🖥️ Demo & Usage

Navigate to `http://localhost:1234/sign` in your browser.

- **Mode A (Understand Sign):** Click "Start Camera". Grant camera permissions. The ML engine will automatically load, trace a skeleton over your hand via Canvas 2D, and output real-time recognized gestures!
- **Mode B (Express in Sign):** Simply type words like "hello", "thank you", or "please" to watch the standalone 3D hand smoothly articulate the ASL vocabulary!

## 🎓 HCI Considerations

This project was built primarily to emphasize an accessible interface. It acknowledges that Sign Language is space-and-motion-dependent. Translating text into an avatar properly requires precise joint articulation and visual clarity, which TRADUMust solves by scaling geometry dynamically and isolating complex movements into focused viewports.
