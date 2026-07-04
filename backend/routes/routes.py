# ─── routes/routes.py ────────────────────────────────────────────────────────
# Thin API layer — all logic lives in map_builder.py

from fastapi import APIRouter
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from map_builder import get_risk_zones, get_no_data_zones, get_nearby_locations, get_hotspots

router = APIRouter()

@router.get("/map-data")
def map_data():
    return {
        "zones":    get_risk_zones(),
        "no_data":  get_no_data_zones(),
        "hotspots": get_hotspots(),
    }

@router.get("/nearby")
def nearby(lat: float, lng: float, radius: int = 2000):
    return {"locations": get_nearby_locations(lat, lng, radius)}

@router.get("/safe")
def safe_routes():
    return {"routes": ["safe", "balanced", "fast"]}