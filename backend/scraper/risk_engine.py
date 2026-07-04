# scraper/risk_engine.py — Risk scoring engine
# Takes scraped incident data + static crime data → outputs risk score (0-100) per locality

import sqlite3
import os

DB_PATH = os.getenv("DB_PATH", "./db/sentinel.db")

def calculate_risk_score(latitude: float, longitude: float, radius_km: float = 1.0) -> dict:
    """
    Calculate risk score for a given location.
    Returns: { score: 0-100, level: 'LOW'|'ELEVATED'|'HIGH'|'CRITICAL', incidents: [...] }
    TODO: Add time-of-day weighting + static govt crime data overlay
    """
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    # Simple proximity query (rough bbox — replace with proper haversine)
    lat_range = radius_km / 111.0
    lng_range = radius_km / (111.0 * abs(latitude) if latitude != 0 else 111.0)

    rows = conn.execute("""
        SELECT type, severity, created FROM incidents
        WHERE latitude BETWEEN ? AND ?
        AND longitude BETWEEN ? AND ?
        ORDER BY created DESC LIMIT 20
    """, (latitude - lat_range, latitude + lat_range,
          longitude - lng_range, longitude + lng_range)).fetchall()
    conn.close()

    severity_weights = {'low': 1, 'elevated': 2, 'high': 4, 'critical': 8}
    score = sum(severity_weights.get(r['severity'], 1) for r in rows)
    score = min(score * 5, 100)  # Normalize to 0-100

    if score < 34:   level = 'LOW'
    elif score < 67: level = 'ELEVATED'
    elif score < 86: level = 'HIGH'
    else:            level = 'CRITICAL'

    return {"score": score, "level": level, "incident_count": len(rows)}
