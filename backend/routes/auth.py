# routes/auth.py — Authentication
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db.database import get_conn

router = APIRouter()

class LoginRequest(BaseModel):
    phone: str
    password: str

class RegisterRequest(BaseModel):
    phone: str
    name: str

PILOT_PASSWORD = "arav@123"

@router.post("/login")
def login(req: LoginRequest):
    if req.password != PILOT_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    conn = get_conn()
    user = conn.execute("SELECT * FROM users WHERE phone=?", (req.phone,)).fetchone()
    conn.close()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please register.")
    return {"success": True, "user": {"id": user["id"], "name": user["name"], "phone": user["phone"]}}

@router.post("/register")
def register(req: RegisterRequest):
    conn = get_conn()
    try:
        conn.execute("INSERT INTO users (phone, name) VALUES (?, ?)", (req.phone, req.name))
        conn.commit()
    except Exception:
        raise HTTPException(status_code=400, detail="Phone already registered")
    finally:
        conn.close()
    return {"success": True, "message": "Registered successfully"}
