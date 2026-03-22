# ShieldAI v2

ShieldAI is an autonomous cybersecurity threat detection platform that combines machine learning inference, threat intelligence, explainability, and adaptive response. The repository includes three main runtime surfaces:

- FastAPI backend for phishing URL and malware file analysis
- React + Vite frontend dashboard for operators
- Chrome Extension for inline browsing protection

## What the project does

ShieldAI provides end-to-end threat scanning and triage:

- Detects phishing URLs
- Detects malicious files (binary upload)
- Uses OpenPhish threat intelligence feed for known bad domains
- Applies AATR (Autonomous Adaptive Threat Response) actions: `block`, `quarantine`, `warn`, `watch`
- Produces SHAP-based feature explanations and human-readable threat reports
- Queues high-confidence and human-labeled samples for MACL (continual learning)
- Persists scan results in SQLite through SQLAlchemy async ORM

## High-level architecture

1. Input arrives from dashboard or browser extension.
2. Backend runs pre-checks and feature extraction.
3. ML models score the sample.
4. SHAP explainers generate top contributing features.
5. AATR blends confidence + anomaly signal to select automated action.
6. Result is logged and persisted in `scan_results`.
7. High-confidence threats are sent to MACL queue for future retraining.

For phishing scans, ShieldAI adds two early gates before ML:

- Trusted-domain whitelist bypass
- OpenPhish domain blocklist check

## Repository layout

```text
ShieldAI/
  backend/
    app/
      routers/        # API endpoints
      services/       # ML, SHAP, Intel, AATR, MACL business logic
      models/         # SQLAlchemy models
      utils/          # logging and validation helpers
      main.py         # FastAPI app entry
      config.py       # runtime settings and env vars
      database.py     # async engine/session + table init
    ml_models/        # model and metadata artifacts used at runtime
    requirements.txt

  frontend/
    src/
      pages/          # dashboard pages
      components/     # reusable UI components
      services/api.js # axios API client
      store/          # Zustand state store
    package.json

  extension/
    src/background/   # service worker logic
    src/content/      # page-level content script
    src/popup/        # popup and warning UI
    manifest.json

  datasets/
    phishing/         # phishing training/evaluation datasets
    malware/ember2018/# malware feature corpora
```

## Core backend modules

### Routers

- `POST /api/phishing/scan`
- `POST /api/malware/scan`
- `GET /api/intel/status`
- `POST /api/intel/refresh`
- `GET /api/aatr/stats`
- `GET /api/macl/status`
- `POST /api/macl/label`
- `GET /api/health`
- `GET /api/health/ready`

### Services

- `MLService`: loads phishing/malware models and executes predictions
- `ShapService`: computes explanation payloads and threat reports
- `IntelService`: refreshes/caches OpenPhish domains on schedule
- `AATRService`: maps confidence/anomaly to response action
- `MACLService`: in-memory queue for continual learning samples

### Persistence

`ScanResult` table stores:

- scan id and type
- input value (URL or filename)
- prediction and confidence
- risk level and AATR action
- SHAP top features and threat report
- processing latency and timestamp

## Technology stack

### Backend

- FastAPI, Uvicorn
- SQLAlchemy asyncio + aiosqlite
- XGBoost, scikit-learn, joblib, numpy
- SHAP
- aiohttp for intel feed ingestion
- slowapi for rate limiting

### Frontend

- React 19 + Vite
- Tailwind CSS
- Axios
- Zustand
- Recharts

### Extension

- Chrome Manifest V3
- Background service worker
- Content scripts + popup UI

## Local setup

## Prerequisites

- Python 3.10+ (3.11 recommended)
- Node.js 18+
- npm
- Git

### 1) Backend setup

```bash
cd backend
python -m venv .venv
# Windows PowerShell
.venv\Scripts\Activate.ps1
# macOS/Linux
source .venv/bin/activate
pip install -r requirements.txt
```

Run backend:

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open API docs:

- http://localhost:8000/docs

### 2) Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Default Vite URL:

- http://localhost:5173

### 3) Browser extension setup (development)

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select the `extension/` folder
5. Keep backend running on `http://localhost:8000`

## Environment variables

Backend settings are declared in `backend/app/config.py` and can be overridden via `.env`.

Important keys:

- `APP_NAME`
- `APP_VERSION`
- `HOST`
- `PORT`
- `DATABASE_URL` (default: `sqlite+aiosqlite:///./shieldai.db`)
- `ML_MODELS_DIR`
- `OPENPHISH_FEED_URL`
- `INTEL_REFRESH_HOURS`
- `AATR_BLOCK_THRESHOLD`
- `AATR_QUARANTINE_THRESHOLD`
- `AATR_WARN_THRESHOLD`
- `MACL_MIN_SAMPLES`
- `ALLOWED_ORIGINS`

Frontend API target:

- `VITE_API_URL` (defaults to `http://localhost:8000`)

## Detection pipeline details

### Phishing flow

1. Normalize and validate incoming URL.
2. Check trusted-domain whitelist (fast allow path).
3. Check OpenPhish domain cache (fast block path).
4. Extract phishing feature vector.
5. Run phishing model prediction.
6. Generate SHAP explanation and threat report.
7. Run AATR triage.
8. Queue sample to MACL when high-confidence threat.
9. Save result to database.

### Malware flow

1. Receive file upload and validate file constraints.
2. Extract EMBER-style malware features.
3. Run malware model prediction.
4. Generate SHAP explanation and threat report.
5. Run AATR triage.
6. Queue sample to MACL when high-confidence malicious verdict.
7. Save result to database.

## Health and readiness

- Liveness endpoint confirms API process availability.
- Readiness endpoint checks model load state, SHAP explainers, intel feed readiness, and AATR readiness.

Use these for local diagnostics and deployment probes.

## Datasets and model artifacts

The repository includes datasets under `datasets/` and runtime artifacts under `backend/ml_models/`.

Examples:

- `datasets/phishing/legitphish_2025.csv`
- `datasets/phishing/StealthPhisher2025.csv`
- `datasets/malware/ember2018/*.jsonl`
- `backend/ml_models/phishing_model.json`
- `backend/ml_models/malware_model.json`

## Current limitations and notes

- MACL queue is currently in-memory and not durable across restarts.
- `frontend/src/services/api.js` references a history endpoint (`/api/history`) that is not present in current backend routers.
- Default backend database is SQLite, intended for local and small-scale deployments.

## Security and operational notes

- Keep `.env` and private keys out of version control.
- For production, replace permissive CORS and localhost assumptions.
- Add authentication and authorization before exposing the API externally.
- Consider migrating persistence from SQLite to PostgreSQL for multi-user deployments.

## Suggested roadmap

- Implement retraining pipeline that consumes MACL queue
- Add authenticated analyst actions and role controls
- Add scan history API and pagination/filtering
- Add test suite for routers/services and CI checks
- Containerize backend + frontend for reproducible deployment

## License

No license file is currently present in this repository. Add a `LICENSE` file if you plan to distribute or open-source this project.
