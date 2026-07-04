# ─── map_builder.py ──────────────────────────────────────────────────────────
# Central map data builder. All map logic lives here.
# routes/routes.py imports from here — keeps endpoints thin.

import sqlite3
import os
import requests

DB_PATH = r"C:\Users\arav\Downloads\Data Scrapper\sentinel_crimes.db"

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# ── Risk Zones ────────────────────────────────────────────────────────────────
def get_risk_zones():
    """
    Returns localities with incident data — colored green/amber/red/critical.
    Pulls from scrapper DB + calculates risk score.
    """
    from scraper.street_geocoder import LOCALITY_COORDS

    conn = get_db()
    rows = conn.execute('''
        SELECT locality, city,
        COUNT(*) as total,
        SUM(CASE WHEN severity='high' THEN 3
                 WHEN severity='medium' THEN 2
                 ELSE 1 END) as risk_score
        FROM incidents
        GROUP BY locality, city
        ORDER BY risk_score DESC
    ''').fetchall()
    conn.close()

    zones = []
    for row in rows:
        locality = row['locality']
        city     = row['city']

        # Get coords from LOCALITY_COORDS first (faster, no API call)
        coords = LOCALITY_COORDS.get(locality)
        if not coords:
            continue

        score = row['risk_score']
        if score >= 20:   label = 'CRITICAL'
        elif score >= 12: label = 'HIGH'
        elif score >= 6:  label = 'MODERATE'
        else:             label = 'SAFE'

        zones.append({
            "locality":        locality,
            "city":            city,
            "lat":             coords[0],
            "lng":             coords[1],
            "score":           score,
            "total_incidents": row['total'],
            "label":           label,
            "has_data":        True,
        })

    return zones

# ── No Data Zones ─────────────────────────────────────────────────────────────
def get_no_data_zones():
    """
    Returns localities in LOCALITY_COORDS that have NO incidents in DB.
    These show as purple circles on the map.
    """
    from scraper.street_geocoder import LOCALITY_COORDS

    conn = get_db()
    has_data = set(
        row['locality'] for row in
        conn.execute("SELECT DISTINCT locality FROM incidents").fetchall()
    )
    conn.close()

    no_data = []
    for locality, coords in LOCALITY_COORDS.items():
        if locality not in has_data:
            no_data.append({
                "locality": locality,
                "lat":      coords[0],
                "lng":      coords[1],
                "has_data": False,
            })

    return no_data

# ── Nearby Locations (OpenStreetMap Overpass API) ─────────────────────────────
def get_nearby_locations(lat: float, lng: float, radius: int = 2000):
    overpass_url = "https://overpass-api.de/api/interpreter"

    query = f"""
    [out:json][timeout:25];
    (
      node["amenity"="hospital"](around:{radius},{lat},{lng});
      node["amenity"="clinic"](around:{radius},{lat},{lng});
      node["amenity"="police"](around:{radius},{lat},{lng});
      node["amenity"="fuel"](around:{radius},{lat},{lng});
      node["amenity"="pharmacy"](around:{radius},{lat},{lng});
      node["amenity"="atm"](around:{radius},{lat},{lng});
      node["amenity"="pharmacy"](around:{radius},{lat},{lng});
      node["amenity"="restaurant"](around:{radius},{lat},{lng});
      node["amenity"="fast_food"](around:{radius},{lat},{lng});
      node["amenity"="cafe"](around:{radius},{lat},{lng});
    );
    out body;
    """

    try:
        res  = requests.get(
            overpass_url,
            params={"data": query},
            timeout=25,
            headers={"User-Agent": "Sentinel-Safety-App/1.0"}
        )
        print(f"  Status: {res.status_code}")
        data = res.json()
    except Exception as e:
        print(f"  Error: {e}")
        return []

    icon_map = {
        "hospital":   {"icon": "🏥", "type": "Hospital"},
        "clinic":     {"icon": "🏥", "type": "Clinic"},
        "police":     {"icon": "🚔", "type": "Police"},
        "fuel":       {"icon": "⛽", "type": "Fuel"},
        "pharmacy":   {"icon": "💊", "type": "Pharmacy"},
        "atm":        {"icon": "🏧", "type": "ATM"},
        "restaurant": {"icon": "🍽️", "type": "Dhaba/Restaurant"},
        "fast_food":  {"icon": "🍽️", "type": "Fast Food"},
        "cafe":       {"icon": "☕", "type": "Cafe"},
    }

    results = []
    for el in data.get("elements", []):
        amenity = el.get("tags", {}).get("amenity")
        if amenity not in icon_map:
            continue
        name = el.get("tags", {}).get("name", icon_map[amenity]["type"])
        results.append({
            "name":  name,
            "type":  icon_map[amenity]["type"],
            "icon":  icon_map[amenity]["icon"],
            "lat":   el["lat"],
            "lng":   el["lon"],
        })

    return results

def export_nearby_json(output_dir="city_data"):
    import requests
    
    city_areas = {
        'mumbai':    (19.0760, 72.8777, 25000),
        'delhi':     (28.6139, 77.2090, 30000),
        'bangalore': (12.9716, 77.5946, 25000),
        'kanpur':    (26.4499, 80.3319, 20000),
    }
    
    for city, (lat, lng, radius) in city_areas.items():
        print(f"Fetching nearby for {city}...")
        locations = get_nearby_locations(lat, lng, radius)
        
        filename = f"{city}_nearby.json"
        filepath = os.path.join(output_dir, filename)
        with open(filepath, 'w') as f:
            json.dump({
                "city": city,
                "locations": locations,
                "generated_at": datetime.now().isoformat()
            }, f)
        print(f"  {city}: {len(locations)} locations")

# ── Hotspots ──────────────────────────────────────────────────────────────────
def get_hotspots():
    """
    Localities with 3+ incidents in last 24 hours → auto flagged as hotspot.
    """
    conn = get_db()
    rows = conn.execute('''
        SELECT locality, city, COUNT(*) as count
        FROM incidents
        WHERE scraped_at >= datetime('now', '-1 day')
        GROUP BY locality, city
        HAVING count >= 3
        ORDER BY count DESC
    ''').fetchall()
    conn.close()

    from scraper.street_geocoder import LOCALITY_COORDS
    hotspots = []
    for row in rows:
        coords = LOCALITY_COORDS.get(row['locality'])
        if not coords:
            continue
        hotspots.append({
            "locality": row['locality'],
            "city":     row['city'],
            "lat":      coords[0],
            "lng":      coords[1],
            "count":    row['count'],
        })
    return hotspots
from datetime import datetime
import json
def export_city_jsons(output_dir="city_data"):
    import os
    from datetime import datetime
    os.makedirs(output_dir, exist_ok=True)
    
    all_zones    = get_risk_zones()
    all_no_data  = get_no_data_zones()
    all_hotspots = get_hotspots()
    
    # Group by city
    cities = {}
    for zone in all_zones:
        city = zone['city']
        if city not in cities:
            cities[city] = {'zones': [], 'no_data': [], 'hotspots': []}
        cities[city]['zones'].append(zone)
    
    for zone in all_no_data:
        # no_data zones ko nearest city mein assign karo lat/lng se
        city = _nearest_city(zone['lat'], zone['lng'], cities)
        if city:
            cities[city]['no_data'].append(zone)
    
    for h in all_hotspots:
        city = h.get('city')
        if city in cities:
            cities[city]['hotspots'].append(h)
    
    for city, data in cities.items():
        data['generated_at'] = datetime.now().isoformat()
        data['city'] = city
        filename = city.lower().replace(' ', '_') + '.json'
        with open(os.path.join(output_dir, filename), 'w') as f:
            json.dump(data, f)
        print(f"Exported {city}: {len(data['zones'])} zones")

def _nearest_city(lat, lng, cities):
    min_dist = float('inf')
    nearest  = None
    city_centers = {
        'Mumbai':    (19.0760, 72.8777),
        'Delhi':     (28.6139, 77.2090),
        'Bangalore': (12.9716, 77.5946),
        'Kanpur':    (26.4499, 80.3319),
    }
    for city, (clat, clng) in city_centers.items():
        dist = ((lat - clat)**2 + (lng - clng)**2) ** 0.5
        if dist < min_dist:
            min_dist = dist
            nearest  = city
    return nearest