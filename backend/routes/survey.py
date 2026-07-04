# routes/survey.py — Community survey / incident validation
from fastapi import APIRouter
from pydantic import BaseModel
from db.database import get_conn

router = APIRouter()

class SurveySubmit(BaseModel):
    incidentId: int
    vote: str  # 'confirmed' | 'inaccurate' | 'unsure'
    userId: int = None

@router.get("/pending")
def get_pending(userId: int = None):
    conn = get_conn()
    rows = conn.execute("SELECT * FROM incidents ORDER BY created DESC LIMIT 10").fetchall()
    conn.close()
    return [dict(r) for r in rows]

@router.post("/submit")
def submit_survey(s: SurveySubmit):
    conn = get_conn()
    conn.execute("INSERT INTO surveys (incident_id, user_id, vote) VALUES (?,?,?)",
                 (s.incidentId, s.userId, s.vote))
    if s.vote == 'confirmed':
        conn.execute("UPDATE incidents SET trust_score = trust_score + 1 WHERE id=?", (s.incidentId,))
    elif s.vote == 'inaccurate':
        conn.execute("UPDATE incidents SET trust_score = trust_score - 1 WHERE id=?", (s.incidentId,))
    conn.commit(); conn.close()
    return {"success": True}
