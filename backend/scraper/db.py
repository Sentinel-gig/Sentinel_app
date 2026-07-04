import sqlite3
import json

DB_PATH = "sentinel_crimes.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS incidents (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            locality    TEXT,
            city        TEXT,
            streets     TEXT,
            title       TEXT,
            summary     TEXT,
            severity    TEXT,
            source      TEXT,
            url         TEXT,
            date        TEXT,
            scraped_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    # Street-level risk table
    c.execute('''
        CREATE TABLE IF NOT EXISTS street_risk (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            street_name TEXT,
            locality    TEXT,
            city        TEXT,
            lat         REAL,
            lng         REAL,
            risk_score  INTEGER DEFAULT 0,
            updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def save_incidents(incidents):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    for inc in incidents:
        c.execute('''
            INSERT INTO incidents
            (locality, city, streets, title, summary, severity, source, url, date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            inc["locality"],
            inc.get("city", ""),
            json.dumps(inc.get("streets", [])),
            inc["title"],
            inc["summary"],
            inc.get("severity", "medium"),
            inc["source"],
            inc["url"],
            inc["date"]
        ))
    conn.commit()
    conn.close()
    print(f"Saved {len(incidents)} incidents to DB.")

def get_locality_counts():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        SELECT locality, city,
    COUNT(*) as total_incidents,
    SUM(CASE WHEN severity='high' THEN 3
            WHEN severity='medium' THEN 2
            ELSE 1 END) as risk_score
    FROM sentinel_crimes
    GROUP BY locality, city
    ORDER BY risk_score DESC
    ''')
    rows = c.fetchall()
    conn.close()
    return rows

def get_street_incidents():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        SELECT streets, locality, city, severity
        FROM incidents
        WHERE streets != "[]"
    ''')
    rows = c.fetchall()
    conn.close()
    return rows

def save_street_risk(street_name, locality, city, lat, lng, score):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    # Update if exists, insert if not
    c.execute('''
        SELECT id, risk_score FROM street_risk
        WHERE street_name = ? AND city = ?
    ''', (street_name, city))
    existing = c.fetchone()
    if existing:
        c.execute('''
            UPDATE street_risk SET risk_score = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (existing[1] + score, existing[0]))
    else:
        c.execute('''
            INSERT INTO street_risk (street_name, locality, city, lat, lng, risk_score)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (street_name, locality, city, lat, lng, score))
    conn.commit()
    conn.close()
def get_street_risks():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        SELECT street_name, locality, city, lat, lng, risk_score
        FROM street_risk
        WHERE lat IS NOT NULL AND lng IS NOT NULL
        ORDER BY risk_score DESC
    ''')
    rows = c.fetchall()
    conn.close()
    return rows
