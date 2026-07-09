# ─── routes/routes.py ────────────────────────────────────────────────────────
# Thin API layer — all logic lives in map_builder.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from map_builder import get_risk_zones, get_no_data_zones, get_nearby_locations, get_hotspots

router = APIRouter()

# ── Existing endpoints (unchanged) ───────────────────────────────────────────

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

# ── NEW: Live 1km nearby from user's current location ────────────────────────
# Called on location update while shift is active.
# Radius capped at 2000m — 1000m default for normal map view.

@router.get("/nearby/live")
def nearby_live(lat: float, lng: float, radius: int = 1000):
    """
    Returns amenities within `radius` metres of the user's live GPS location.
    Default radius 1000m (1km). App calls this on location update, replaces
    the old city-wide static GCS nearby JSON fetch.
    """
    if radius > 2000:
        radius = 2000  # Hard cap — don't let client hammer Overpass with huge radius
    locations = get_nearby_locations(lat, lng, radius)
    return {"locations": locations, "radius": radius, "lat": lat, "lng": lng}


# ── NEW: Corridor nearby along a route polyline ──────────────────────────────
# Called after OSRM returns routes. Takes a sampled set of coords from the
# chosen route and queries Overpass for amenities within 500m of each sample.
# Deduplicates by name+type to avoid showing the same place many times.

SOS_AMENITIES = {"hospital", "clinic", "police"}          # Shown in SOS/accident mode
CORRIDOR_AMENITIES = {"hospital", "clinic", "police", "fuel", "pharmacy"}  # Route corridor

class CorridorRequest(BaseModel):
    coords: List[List[float]]   # [[lat, lng], ...] — sampled points from route
    radius: int = 500           # metres around each sample point
    mode: str = "route"         # "route" | "sos"

@router.post("/nearby/corridor")
def nearby_corridor(req: CorridorRequest):
    """
    Queries Overpass for amenities along a route corridor.
    - mode="route": hospitals, police, fuel, pharmacy within 500m of route
    - mode="sos": hospitals + police only, 1km around current position (single coord)

    `coords` should be sampled — every ~1km along the route is enough.
    App samples the OSRM geometry before sending to keep request size small.
    """
    if not req.coords:
        raise HTTPException(status_code=400, detail="coords required")

    # Cap samples to avoid hammering Overpass
    MAX_SAMPLES = 20
    coords = req.coords[:MAX_SAMPLES]

    seen = set()
    results = []

    # Filter which amenity types to query based on mode
    amenity_filter = SOS_AMENITIES if req.mode == "sos" else CORRIDOR_AMENITIES

    for lat, lng in coords:
        radius = 1000 if req.mode == "sos" else req.radius
        locations = get_nearby_locations(lat, lng, radius)
        for loc in locations:
            # Deduplicate by name + type (same place appears in multiple sample radii)
            key = f"{loc['name']}|{loc['type']}"
            # Filter to relevant amenity types for this mode
            amenity_type = loc.get("type", "").lower()
            is_relevant = any(a in amenity_type.lower() for a in amenity_filter)
            if key not in seen and is_relevant:
                seen.add(key)
                results.append(loc)

    return {
        "locations": results,
        "mode": req.mode,
        "sample_count": len(coords),
    }