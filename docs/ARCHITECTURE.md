# TRADUMUST Architecture

## Overview

TRADUMUST is a multi-service accessibility platform for communication between hearing and Deaf/hard-of-hearing people.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Next.js    │────▶│  Express API │────▶│  PostgreSQL     │
│  Frontend   │     │  (port 4000) │     │  + Prisma ORM   │
└─────────────┘     └──────┬───────┘     └─────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Python AI    │
                    │ FastAPI      │
                    │ (port 8001)  │
                    └──────────────┘
```

## Services

### Frontend (Next.js 14 + TypeScript)
- Landing page with hero, features, FAQ, testimonials
- Dashboard with sidebar navigation
- Text → Avatar studio (`/sign`)
- Webcam recognition (`/recognize`)
- Duolingo-style learning (`/learn`)
- Auth, profile, history, admin panels
- Redux Toolkit + React Query state management
- Three.js 3D avatar rendering
- MediaPipe client-side gesture recognition

### API Server (Express + Prisma)
- JWT authentication with role-based access control
- User management, gamification (XP, levels, streaks, badges)
- Lesson/quiz/progress management
- Translation history persistence
- Admin analytics dashboard
- Proxies AI requests to Python microservice

### AI Microservice (Python FastAPI)
- Sign language landmark extraction (MediaPipe)
- LSTM/BiLSTM sign classification
- Text-to-sign gloss mapping and animation metadata
- Real-time WebSocket sign streaming
- Translation with cultural context
- ML training pipeline

## Database Schema

PostgreSQL with Prisma ORM. Key models:
- Users, Roles, UserProgress
- SignLanguage, Sign, Animation
- Unit, Lesson, Exercise, Quiz
- Translation, LessonProgress, QuizAttempt
- Achievement, Badge, Certificate, LeaderboardEntry
- Dataset, AiModel, Notification, AuditLog, SystemSetting

## Sign Languages

Extensible `SignLanguageCode` enum:
- ASL (American Sign Language)
- BSL (British Sign Language)
- LSF (French Sign Language)
- Future: Arabic Sign Language, Tunisian Sign Language

## Deployment

```bash
# Development
docker compose up -d postgres redis
cd server && npm install && npm run db:migrate && npm run db:seed
npm run dev:all

# Production
docker compose up -d
```

## Security

- JWT with bcrypt password hashing
- Helmet + CORS + rate limiting
- Role-based permissions (GUEST, USER, ADMIN, SUPER_ADMIN)
- Input validation with Zod
- SQL injection prevention via Prisma parameterized queries
- Audit logging for admin actions

## Accessibility (WCAG 2.2)

- Skip-to-content link
- ARIA labels and live regions
- Keyboard navigation
- High contrast and large text modes
- Dark mode support
- Screen reader compatible forms

## Testing

- Python: pytest (API, security, contracts, ML)
- Node: unit + integration tests
- k6: load/stress/soak/spike tests
- Vitest: Express API unit tests
- GitHub Actions CI pipeline
