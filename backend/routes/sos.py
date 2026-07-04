# routes/sos.py — SOS trigger + escalation
from fastapi import APIRouter
from pydantic import BaseModel
from db.database import get_conn

router = APIRouter()

class SOSTrigger(BaseModel):
    location: dict  # {latitude, longitude}
    userId: int

@router.post("/trigger")
def trigger_sos(req: SOSTrigger):
    conn = get_conn()
    conn.execute("INSERT INTO sos_events (user_id, latitude, longitude) VALUES (?,?,?)",
                 (req.userId, req.location["latitude"], req.location["longitude"]))
    conn.commit()
    sos_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    conn.close()
    # TODO: Send silent push notifications to nearby workers
    return {"success": True, "sos_id": sos_id}

@router.post("/cancel/{sos_id}")
def cancel_sos(sos_id: int):
    conn = get_conn()
    conn.execute("UPDATE sos_events SET status='cancelled' WHERE id=?", (sos_id,))
    conn.commit(); conn.close()
    return {"success": True}

@router.post("/acknowledge/{alert_id}")
def acknowledge(alert_id: int, body: dict):
    conn = get_conn()
    conn.execute("UPDATE sos_events SET status='resolved' WHERE id=?", (alert_id,))
    conn.commit(); conn.close()
    return {"success": True}
