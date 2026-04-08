# TRADUMust

TRADUMust is a real-time translation and sign-language bridge application for inclusive communication. The frontend is built with Next.js, and the active backend is now a PHP API with persistent history storage.

## Features

- Real-time text translation with cultural context notes
- Persistent translation history and phrasebook storage in SQLite
- Client-side sign recognition with MediaPipe
- Text-to-sign avatar flow with stored sign-session history
- Phrasebook review and practice mode

## Tech Stack

- Frontend: Next.js 14, React 18, TypeScript, Tailwind CSS
- 3D / Sign UX: Three.js, `@react-three/fiber`, `@react-three/drei`, MediaPipe Tasks Vision
- Backend API: PHP 8.2+ with a lightweight router
- Database: SQLite with automatic schema bootstrap on first run

## Requirements

- Node.js 20+
- PHP 8.2+ with PDO SQLite enabled

## Local Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the PHP backend:
   ```bash
   npm run backend
   ```
   The API listens on `http://127.0.0.1:8000` and creates `api/storage/tradumust.sqlite` automatically.

3. Start the Next.js frontend:
   ```bash
   npm run dev
   ```
   The app runs on `http://localhost:1234`.

## Configuration

Backend settings live in `api/.env`.

- `DB_DATABASE` controls the SQLite database path
- `TRANSLATION_PROVIDER=fallback` keeps the app working offline with a small built-in phrase set
- `TRANSLATION_PROVIDER=libretranslate` enables a production translation provider when `LIBRETRANSLATE_URL` is configured
- `TRANSLATION_PROVIDER=mymemory` enables the MyMemory HTTP API

For local development, the Next.js app proxies `/api/*` to the PHP service. In production, serve the PHP app directly at `/api/*`.

## API Surface

- `POST /api/translate`
- `POST /api/text-to-sign`
- `GET /api/history`
- `GET /api/phrasebook`
- `POST /api/phrasebook`
- `DELETE /api/phrasebook/{id}`
- `GET /api/health`

## Verification

The frontend production build passes:

```bash
npm run build
```

The legacy FastAPI prototype remains in `backend/` for reference, but the active backend path is now PHP.
