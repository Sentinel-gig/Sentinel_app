# ─── main.py ─────────────────────────────────────────────────────────────────
# FastAPI entry point. Run with: uvicorn main:app --host 0.0.0.0 --port 8000
# All routes registered here.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, incidents, sos, routes, survey
from db.database import init_db

app = FastAPI(title="Sentinel API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    init_db()

# Register routers
app.include_router(auth.router,      prefix="/auth",      tags=["Auth"])
app.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])
app.include_router(sos.router,       prefix="/sos",       tags=["SOS"])
app.include_router(routes.router,    prefix="/routes",    tags=["Routes"])
app.include_router(survey.router,    prefix="/survey",    tags=["Survey"])

@app.get("/health")
def health():
    return {"status": "ok", "service": "Sentinel API"}
