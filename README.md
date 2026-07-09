# Sentinel — by Secured Systems

Passive safety intelligence for India's gig workforce.

## Quick Start

### Frontend (Expo)
```bash
cd sentinel
npm install
npx expo start
```

### Backend (FastAPI)
```bash
cd sentinel/backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Pilot Password
`arav@123` (hardcoded for pilot — replace with real auth post-pilot)

## Environment
- Copy `.env.example` to `.env` and fill in your Azure VM IP
- Backend runs on port 8000
- Expo app connects via `API_BASE_URL` in `.env`

## First Steps in VS Code
1. Open the `sentinel/` folder
2. Install recommended extensions: ESLint, Prettier, Python
3. Start with `src/screens/` — each screen maps 1:1 to a UI screen
4. Backend logic lives in `backend/routes/` — one file per feature
5. Copy your existing scraper into `backend/scraper/scraper.py`
