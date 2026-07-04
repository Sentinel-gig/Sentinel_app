# routes/incidents.py — Incident reporting + fetching
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from db.database import get_conn

router = APIRouter()

class IncidentReport(BaseModel):
    type: str
    severity: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    city: Optional[str] = None
    reported_by: Optional[int] = None

@router.get("/")
def get_incidents(city: str = None, radius: float = 5):
    conn = get_conn()
    if city:
        rows = conn.execute("SELECT * FROM incidents WHERE city=? ORDER BY created DESC LIMIT 50", (city,)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM incidents ORDER BY created DESC LIMIT 50").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/report")
def report_incident(inc: IncidentReport):
    conn = get_conn()
    conn.execute("""INSERT INTO incidents (type, severity, description, latitude, longitude, city, reported_by)
                    VALUES (?,?,?,?,?,?,?)""",
                 (inc.type, inc.severity, inc.description, inc.latitude, inc.longitude, inc.city, inc.reported_by))
    conn.commit(); conn.close()
    return {"success": True, "message": "Incident reported"}
