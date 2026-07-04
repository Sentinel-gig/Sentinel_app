from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut
import time

geolocator = Nominatim(user_agent="sentinel_safety_app_v3")

_cache = {}
HARDCODED_COORDS = {
    "Lucknow_Kanpur":       (26.8467, 80.9462),
    "Unnao_Kanpur":         (26.5490, 80.4980),
    "Fatehpur_Kanpur":      (25.9300, 80.8100),
    "Kannauj_Kanpur":       (27.0550, 79.9120),
    "Etawah_Kanpur":        (26.7850, 79.0200),
    "Hamirpur_Kanpur":      (25.9500, 80.1500),
    "Raebareli_Kanpur":     (26.2340, 81.2320),
    "Bilhaur_Kanpur":       (26.4800, 80.0750),
    "Purwa_Kanpur":         (26.4600, 80.7800),
    "Rath_Kanpur":          (25.5800, 79.5600),
    "Bharthana_Kanpur":     (26.9310, 79.2470),
}
CITY_BOUNDS = {
    "Mumbai":    (18.40, 72.60, 19.80, 73.50),
    "Delhi":     (27.80, 76.50, 29.00, 78.20),
    "Bangalore": (12.50, 77.20, 13.50, 78.00),
    "Kanpur":    (25.80, 79.50, 27.20, 81.20),
    # Extended to cover Lucknow corridor which is scraped under Kanpur city
    # Lucknow is at 26.84, 80.94 — within bounds above so geocodes correctly
}
LOCALITY_ALIASES = {
    # Mumbai — wrong geocoding fixes
    "Panvel":           "Panvel, Raigad, Maharashtra",
    "Dahisar":          "Dahisar, Mumbai Suburban, Maharashtra",
    "Kalyan":           "Kalyan, Thane District, Maharashtra",
    "Belapur":          "CBD Belapur, Navi Mumbai, Maharashtra",
    "Turbhe":           "Turbhe, Navi Mumbai, Maharashtra",
    "Kharghar":         "Kharghar, Navi Mumbai, Maharashtra",
    "Ambernath":        "Ambernath, Thane District, Maharashtra",
    "Vashi":            "Vashi, Navi Mumbai, Maharashtra",
    "Dombivli":         "Dombivli, Thane District, Maharashtra",
    "Ulhasnagar":       "Ulhasnagar, Thane District, Maharashtra",
    "Badlapur":         "Badlapur, Thane District, Maharashtra",
    "Bhiwandi":         "Bhiwandi, Thane District, Maharashtra",
    "Mira Road":        "Mira Road, Thane District, Maharashtra",
    "Nalasopara":       "Nalasopara, Palghar District, Maharashtra",
    "Virar":            "Virar, Palghar District, Maharashtra",
    "Vasai":            "Vasai, Palghar District, Maharashtra",
    "Boisar":           "Boisar, Palghar District, Maharashtra",
    "Palghar":          "Palghar, Palghar District, Maharashtra",
    "Karjat":           "Karjat, Raigad District, Maharashtra",
    "Khopoli":          "Khopoli, Raigad District, Maharashtra",
    "Pen":              "Pen, Raigad District, Maharashtra",
    "Alibag":           "Alibag, Raigad District, Maharashtra",
    "Panvel":           "Panvel, Raigad District, Maharashtra",
    "Uran":             "Uran, Raigad District, Maharashtra",
    "Roha":             "Roha, Raigad District, Maharashtra",
    "Mahad":            "Mahad, Raigad District, Maharashtra",
    # Delhi — wrong geocoding fixes
    "Noida":            "Noida, Gautam Buddha Nagar, Uttar Pradesh",
    "Mayur Vihar":      "Mayur Vihar, East Delhi, Delhi",
    "Dwarka":           "Dwarka, South West Delhi, Delhi",
    "Rohini":           "Rohini, North West Delhi, Delhi",
    "Janakpuri":        "Janakpuri, West Delhi, Delhi",
    "Uttam Nagar":      "Uttam Nagar, West Delhi, Delhi",
    "Shahdara":         "Shahdara, East Delhi, Delhi",
    "Laxmi Nagar":      "Laxmi Nagar, East Delhi, Delhi",
    "Preet Vihar":      "Preet Vihar, East Delhi, Delhi",
    "Patparganj":       "Patparganj, East Delhi, Delhi",
    "Vivek Vihar":      "Vivek Vihar, East Delhi, Delhi",
    "Dilshad Garden":   "Dilshad Garden, East Delhi, Delhi",
    "Seelampur":        "Seelampur, North East Delhi, Delhi",
    "Mustafabad":       "Mustafabad, North East Delhi, Delhi",
    "Bhajanpura":       "Bhajanpura, North East Delhi, Delhi",
    "Gokulpuri":        "Gokulpuri, North East Delhi, Delhi",
    "Jaffrabad":        "Jaffrabad, North East Delhi, Delhi",
    "Maujpur":          "Maujpur, North East Delhi, Delhi",
    "Burari":           "Burari, North Delhi, Delhi",
    "Bawana":           "Bawana, North West Delhi, Delhi",
    "Narela":           "Narela, North Delhi, Delhi",
    "Greater Noida":    "Greater Noida, Gautam Buddha Nagar, Uttar Pradesh",
    "Ghaziabad":        "Ghaziabad, Ghaziabad District, Uttar Pradesh",
    "Faridabad":        "Faridabad, Haryana",
    "Gurgaon":          "Gurugram, Haryana",
    "Sonipat":          "Sonipat, Haryana",
    "Bahadurgarh":      "Bahadurgarh, Jhajjar, Haryana",
    "Meerut":           "Meerut, Uttar Pradesh",
    # Bangalore fixes
    "Koramangala":      "Koramangala, Bengaluru, Karnataka",
    "Indiranagar":      "Indiranagar, Bengaluru, Karnataka",
    "Whitefield":       "Whitefield, Bengaluru, Karnataka",
    "Electronic City":  "Electronic City, Bengaluru, Karnataka",
    "HSR Layout":       "HSR Layout, Bengaluru, Karnataka",
    "BTM Layout":       "BTM Layout, Bengaluru, Karnataka",
    "Marathahalli":     "Marathahalli, Bengaluru, Karnataka",
    "Hebbal":           "Hebbal, Bengaluru, Karnataka",
    "Yeshwanthpur":     "Yeshwanthpur, Bengaluru, Karnataka",
    "Silk Board":       "Silk Board, Bengaluru, Karnataka",
    "MG Road":          "MG Road, Bengaluru, Karnataka",
    "JP Nagar":         "JP Nagar, Bengaluru, Karnataka",
    "Jayanagar":        "Jayanagar, Bengaluru, Karnataka",
    "Banashankari":     "Banashankari, Bengaluru, Karnataka",
    "Rajajinagar":      "Rajajinagar, Bengaluru, Karnataka",
    "Peenya":           "Peenya, Bengaluru, Karnataka",
    "Yelahanka":        "Yelahanka, Bengaluru, Karnataka",
    "Devanahalli":      "Devanahalli, Bengaluru Rural, Karnataka",
    "Hosur":            "Hosur, Krishnagiri District, Tamil Nadu",
    "Tumkur":           "Tumakuru, Karnataka",
    "Kolar":            "Kolar, Karnataka",
    "Ramanagara":       "Ramanagara, Karnataka",
    "Nelamangala":      "Nelamangala, Bengaluru Rural, Karnataka",
    "Hoskote":          "Hoskote, Bengaluru Rural, Karnataka",
    "Anekal":           "Anekal, Bengaluru Urban, Karnataka",
    "Doddaballapur":    "Doddaballapur, Bengaluru Rural, Karnataka",
    "Chikkaballapur":   "Chikkaballapur, Karnataka",
    # Kanpur fixes
    "Lucknow":          "Lucknow, Uttar Pradesh",
    "Unnao":            "Unnao, Uttar Pradesh",
    "Fatehpur":         "Fatehpur, Uttar Pradesh",
    "Kannauj":          "Kannauj, Uttar Pradesh",
    "Etawah":           "Etawah, Uttar Pradesh",
    "Hamirpur":         "Hamirpur, Uttar Pradesh",
    "Purwa":            "Purwa, Unnao, Uttar Pradesh",
    "Rath":             "Rath, Hamirpur, Uttar Pradesh",
    "Bharthana":        "Bharthana, Etawah, Uttar Pradesh",
    "Bilhaur":          "Bilhaur, Kanpur Dehat, Uttar Pradesh",
    "Kakadeo":          "Kakadeo, Kanpur, Uttar Pradesh",
    "Kidwai Nagar":     "Kidwai Nagar, Kanpur, Uttar Pradesh",
    "Civil Lines":      "Civil Lines, Kanpur, Uttar Pradesh",
    "Kalyanpur":        "Kalyanpur, Kanpur, Uttar Pradesh",
    "Govind Nagar":     "Govind Nagar, Kanpur, Uttar Pradesh",
    "Armapur":          "Armapur, Kanpur, Uttar Pradesh",
    "Swaroop Nagar":    "Swaroop Nagar, Kanpur, Uttar Pradesh",
    "Barra":            "Barra, Kanpur, Uttar Pradesh",
    "Harsh Nagar":      "Harsh Nagar, Kanpur, Uttar Pradesh",
    "Shyam Nagar":      "Shyam Nagar, Kanpur, Uttar Pradesh",
    "Panki":            "Panki, Kanpur, Uttar Pradesh",
    "Chakeri":          "Chakeri, Kanpur, Uttar Pradesh",
    "Rawatpur":         "Rawatpur, Kanpur, Uttar Pradesh",
    "Fazalganj":        "Fazalganj, Kanpur, Uttar Pradesh",
    "Naubasta":         "Naubasta, Kanpur, Uttar Pradesh",
    "Vikas Nagar":      "Vikas Nagar, Kanpur, Uttar Pradesh",
    "Juhi":             "Juhi, Kanpur, Uttar Pradesh",
    "Jajmau":           "Jajmau, Kanpur, Uttar Pradesh",
    "Unnao":            "Unnao, Uttar Pradesh",
    "Fatehpur":         "Fatehpur, Uttar Pradesh",
    "Kannauj":          "Kannauj, Uttar Pradesh",
    "Etawah":           "Etawah, Uttar Pradesh",
    "Raebareli":        "Raebareli, Uttar Pradesh",
    "Hamirpur":         "Hamirpur, Uttar Pradesh",
}

from scraper.street_geocoder import LOCALITY_COORDS
def get_coords(locality, city="Mumbai"):
    key = f"{locality}_{city}"
    if key in _cache:
        return _cache[key]

    # 1. Check hardcoded coords first — fastest, most accurate
    if locality in LOCALITY_COORDS:
        coords = LOCALITY_COORDS[locality]
        _cache[key] = coords
        return coords

    # 2. Alias + Nominatim fallback
    search_name = LOCALITY_ALIASES.get(locality, locality)
    attempts = [
        f"{search_name}, {city}, India",
        f"{search_name}, India",
        f"{locality}, {city}, India",
    ]

    for attempt in attempts:
        try:
            location = geolocator.geocode(attempt, timeout=10)
            time.sleep(1)
            if location:
                lat, lng = location.latitude, location.longitude
                bounds = CITY_BOUNDS.get(city)
                if bounds:
                    lat_min, lng_min, lat_max, lng_max = bounds
                    if not (lat_min <= lat <= lat_max and lng_min <= lng <= lng_max):
                        continue
                print(f"OK: {locality} -> ({lat:.4f}, {lng:.4f})")
                _cache[key] = (lat, lng)
                return _cache[key]
        except GeocoderTimedOut:
            print(f"Timeout: {locality}")
        except Exception as e:
            print(f"Geocode error {locality}: {e}")

    _cache[key] = None
    return None