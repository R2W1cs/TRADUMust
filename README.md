# TRADUMust — Sign Language Accessibility & Bridge

TRADUMust is a sophisticated, real-time sign-language bridge and translation ecosystem designed for inclusive academic and daily communication. It leverages a dual-backend architecture to provide high-performance ML inference alongside robust persistent storage.

## 🚀 Key Features

- **Real-Time Sign Recognition**: Client-side landmark extraction with MediaPipe holistic integration.
- **Dual-Backend Engine**: 
  - **Python (ML)**: High-speed gesture classification and linguistic context analysis.
  - **PHP (Storage)**: Reliable persistent history and academic phrasebook management.
- **SignBridge Chrome Extension**: Dynamic ASL avatar overlay for YouTube, Google Meet, Zoom, and Microsoft Teams.
- **3D Interactive Avatar**: Next.js 14 based Three.js environment for fluid sign-language visualization.
- **Academic Phrasebook**: Specialized translation library for exchange students with regional context notes.

## 🏗 System Architecture

TRADUMust operates on a modular, multi-tier architecture:

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | Next.js 14, TypeScript | UI/UX, 3D Rendering, MediaPipe |
| **Storage API** | PHP 8.2, SQLite | History, Auth, Phrasebook (Port 8000) |
| **ML/Sign API** | Python (FastAPI), MediaPipe | Sign Classification, NLP (Port 8001) |
| **Extension** | Manifest V3, Webpack | Cross-platform Video Accessibility |

## 🛠 Setup & Installation

### 1. Prerequisites
- Node.js 20+
- Python 3.9+
- PHP 8.2+ with PDO SQLite

### 2. Dependency Installation
```bash
# Main project & Frontend
npm install

# Python ML Backend
cd backend
pip install -r requirements.txt
```

### 3. Running the Ecosystem

You should start all three services for the full experience:

```bash
# Terminal 1: Next.js Frontend (Port 1234)
npm run dev

# Terminal 2: PHP Storage API (Port 8000)
npm run backend

# Terminal 3: Python ML API (Port 8001)
npm run backend:python
```

## 🧪 Testing Infrastructure

TRADUMust includes a comprehensive test suite (10+ specialized suites):

- **Unit Tests**: `npm run test:unit` (Core logic and utility validation)
- **Backend Tests**: `npm run test:backend` (Python API endpoint verification)
- **ML Pipeline**: `npm run test:ml` (Feature extraction and model performance)
- **Performance**: `npm run test:perf` (Latency & FPS benchmarks)
- **Stress/Load**: `npm run test:stress` (Concurrency and scale testing)
- **Total Suite**: `npm run test:all`

## 📊 ML Pipeline

The project includes an end-to-end Machine Learning pipeline:
1. **Extraction**: `extract_holistic_features` converts video/frames to 126-dimensional feature vectors.
2. **Analysis**: PCA and K-Means evaluation for gesture clustering.
3. **Training**: `npm run test:ml` includes training logic for Random Forest and XGBoost models.
4. **Classification**: Real-time inference via the `/api/sign/classify` endpoint.

---
*Built with ❤️ for LinguaBridge Academy and Deaf students worldwide.*
