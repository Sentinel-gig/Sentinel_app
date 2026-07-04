# db/database.py — SQLite connection + table init
import sqlite3, os
DB_PATH = os.getenv("DB_PATH", "./db/sentinel.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn(); c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT, phone TEXT UNIQUE NOT NULL,
        name TEXT, city TEXT, created TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
    c.execute("""CREATE TABLE IF NOT EXISTS incidents (
        id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, severity TEXT NOT NULL,
        description TEXT, latitude REAL, longitude REAL, city TEXT,
        source TEXT DEFAULT 'user', trust_score INTEGER DEFAULT 0,
        reported_by INTEGER, created TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
    c.execute("""CREATE TABLE IF NOT EXISTS sos_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER,
        latitude REAL, longitude REAL, status TEXT DEFAULT 'active',
        escalation_level INTEGER DEFAULT 1, created TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved TIMESTAMP)""")
    c.execute("""CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, event_type TEXT,
        signal TEXT, latitude REAL, longitude REAL, responded_by TEXT,
        response_time_ms INTEGER, false_positive BOOLEAN DEFAULT FALSE,
        created TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
    c.execute("""CREATE TABLE IF NOT EXISTS surveys (
        id INTEGER PRIMARY KEY AUTOINCREMENT, incident_id INTEGER,
        user_id INTEGER, vote TEXT, created TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
    conn.commit(); conn.close()
    print("[Sentinel] DB initialized")
