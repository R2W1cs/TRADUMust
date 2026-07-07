# TRADUMUST API Documentation

Base URL: `http://localhost:4000` (Express API)  
AI Microservice: `http://localhost:8001` (Python FastAPI)

## Authentication

All protected endpoints require `Authorization: Bearer <JWT>`.

### POST /api/auth/register
```json
{ "email": "user@example.com", "password": "password123", "name": "Jane Doe" }
```

### POST /api/auth/login
```json
{ "email": "user@example.com", "password": "password123" }
```

### GET /api/auth/me
Returns current user and progress.

### POST /api/auth/forgot-password
### POST /api/auth/reset-password
### POST /api/auth/verify-email
### POST /api/auth/oauth/google
### POST /api/auth/oauth/github

## Avatar (Text → Sign)

### POST /api/avatar/translate
```json
{ "text": "Hello, how are you?", "signLanguage": "ASL" }
```

### GET /api/avatar/animations/:language

## Recognition (Webcam → Text)

### POST /api/recognize/classify
```json
{ "landmarks": [0.1, 0.2, ...], "signLanguage": "ASL" }
```

### POST /api/recognize/extract-landmarks
### POST /api/recognize/save

## Lessons & Learning

### GET /api/lessons/languages
### GET /api/lessons/units/:language
### GET /api/lessons/:lessonId
### POST /api/lessons/:lessonId/complete
### POST /api/lessons/:lessonId/exercise/:exerciseId/submit

## Quizzes

### GET /api/quizzes/lesson/:lessonId
### POST /api/quizzes/:quizId/submit

## Progress & Gamification

### GET /api/progress
### GET /api/progress/leaderboard?period=weekly
### GET /api/progress/map/:language

## History

### GET /api/history?page=1&search=hello&favorite=true
### PATCH /api/history/:id/favorite
### DELETE /api/history/:id
### POST /api/history/export

## Admin (ADMIN / SUPER_ADMIN)

### GET /api/admin/analytics
### GET /api/admin/users
### PATCH /api/admin/users/:id/role
### GET /api/admin/lessons
### POST /api/admin/lessons
### GET /api/admin/audit-logs
### GET /api/admin/settings (SUPER_ADMIN)
### PUT /api/admin/settings/:key (SUPER_ADMIN)

## AI Microservice (Python)

### GET /api/health
### POST /api/sign/extract-landmarks
### POST /api/sign/classify
### POST /api/text-to-sign
### POST /api/translate
### WS /ws/sign

## Roles

| Role | Permissions |
|------|-------------|
| GUEST | Homepage, demo, docs |
| USER | Translate, recognize, learn, history, profile |
| ADMIN | User/lesson/dataset/model management, analytics |
| SUPER_ADMIN | Admin management, system settings, API keys |
