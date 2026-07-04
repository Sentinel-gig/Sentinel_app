import feedparser
import re
import requests
from bs4 import BeautifulSoup
from datetime import datetime

# ─── LOCALITIES ───────────────────────────────────────────────
MUMBAI_LOCALITIES = [
    "Dharavi", "Kurla", "Govandi", "Chembur", "Ghatkopar",
    "Malad", "Borivali", "Andheri", "Goregaon", "Bandra",
    "Mankhurd", "Trombay", "Vashi", "Kamathipura", "Dadar",
    "Colaba", "Worli", "Powai", "Thane", "Kandivali", "Mira Road", 
    "Bhiwandi", "Vikhroli", "Mulund","Bhandup", "Nahur", 
    "Kanjurmarg", "Dahisar", "Jogeshwari", "Saki Naka", "MIDC", 
    "Vile Parle", "Santacruz", "Khar", "Juhu", "Cheeta Camp",
    "Tilaknagar", "Chunabhatti", "GTB Nagar", "Fort", "Churchgate",
    "Marine Lines", "Mahalaxmi", "Parel", "Lower Parel", "Sewri",
    "Wadala", "Nerul", "Belapur", "Kharghar", "Panvel",
    "Airoli", "Ghansoli", "Koparkhairane", "Turbhe", "Kalyan",
    "Dombivli", "Ambernath", "Badlapur", "Ulhasnagar",
    "Hiranandani", "Goregaon East", "Goregaon West",
    "Palghar", "Boisar", "Virar", "Nalasopara", "Vasai",
    "Karjat", "Khopoli", "Pen", "Alibag", "Roha",
    "Nashik Road", "Igatpuri", "Kasara",
    "Shahad", "Ambivli", "Titwala", "Khadavli",
    "Neral", "Karjat", "Khopoli",
    "Uran", "Dronagiri", "Nhava Sheva",
    "Raigad", "Mahad", "Poladpur",
]

KANPUR_LOCALITIES = [
    "Kakadeo", "Kidwai Nagar", "Civil Lines", "Kalyanpur",
    "Govind Nagar", "Armapur", "Swaroop Nagar", "Barra",
    "Harsh Nagar", "Shyam Nagar", "Panki", "Chakeri",
    "Rawatpur", "Fazalganj", "Naubasta", "Vikas Nagar",
    "Benajhabar", "Juhi", "Shivrajpur", "Bilhaur",
    "Jajmau", "Gwaltoli", "Colonelganj", "Hatia", "Sisamau",
    "Yashoda Nagar", "Lal Bangla", "Collectorganj",
    "Parade Ground", "Moti Jheel", "Beconganj",
    "IIT Kanpur", "Kalpi Road", "Kanpur Central",
    "Unnao", "Purwa", "Bangarmau",
    "Fatehpur", "Bindki", "Khaga",
    "Kannauj", "Tirwa", "Gursahaiganj",
    "Etawah", "Bharthana", "Jaswantnagar",
    "Hamirpur", "Rath", "Maudaha",
    "Lucknow", "Barabanki", "Unnao",
    "Raebareli", "Salon", "Lalganj",
]
DELHI_LOCALITIES = [
    # Central
    "Connaught Place", "Karol Bagh", "Paharganj", "Chandni Chowk",
    "Lajpat Nagar", "Sarojini Nagar", "Janpath", "ITO",
    # South Delhi
    "Hauz Khas", "Malviya Nagar", "Saket", "Vasant Kunj",
    "Mehrauli", "Chattarpur", "Sultanpur", "Lado Sarai",
    # North Delhi
    "Rohini", "Pitampura", "Shalimar Bagh", "Ashok Vihar",
    "Model Town", "Burari", "Bawana", "Narela",
    # East Delhi
    "Shahdara", "Preet Vihar", "Mayur Vihar", "Patparganj",
    "Laxmi Nagar", "Vivek Vihar", "Anand Vihar", "Geeta Colony",
    # West Delhi
    "Dwarka", "Janakpuri", "Uttam Nagar", "Vikaspuri",
    "Tilak Nagar", "Rajouri Garden", "Punjabi Bagh", "Paschim Vihar",
    # South East
    "Okhla", "Jamia Nagar", "Badarpur", "Sangam Vihar",
    "Tughlakabad", "Govindpuri", "Kalkaji", "Greater Kailash",
    # Outer
    "Naraina", "Kirti Nagar", "Moti Nagar", "Shakar Pur",
    "Dilshad Garden", "Seelampur", "Welcome", "Mustafabad",
    "Bhajanpura", "Gokulpuri", "Jaffrabad", "Maujpur",
    "Faridabad", "Ballabhgarh", "Palwal",
    "Gurgaon", "Manesar", "Rewari", "Dharuhera",
    "Noida", "Greater Noida", "Jewar", "Dadri",
    "Ghaziabad", "Loni", "Muradnagar", "Modinagar",
    "Sonipat", "Kundli", "Bahadurgarh", "Jhajjar",
    "Meerut", "Baghpat", "Hapur", "Bulandshahr",
    "Alwar", "Bhiwadi", "Neemrana",
    "Panipat", "Rohtak", "Jhajjar",
]
BANGALORE_LOCALITIES = [
    # Central
    "MG Road", "Brigade Road", "Commercial Street", "Shivajinagar",
    "Cubbon Park", "Majestic", "City Market", "Vidhana Soudha",
    # North
    "Hebbal", "Yelahanka", "Devanahalli", "Thanisandra",
    "Kogilu", "Jakkur", "Nagawara", "Bellary Road",
    # South
    "Jayanagar", "JP Nagar", "Banashankari", "Uttarahalli",
    "Kanakapura Road", "Electronic City", "Bommanahalli", "HSR Layout",
    # East
    "Whitefield", "Marathahalli", "Brookefield", "Kadugodi",
    "KR Puram", "Tin Factory", "Bellandur", "Sarjapur",
    # West
    "Rajajinagar", "Basaveshwara Nagar", "Yeshwanthpur",
    "Peenya", "Jalahalli", "Magadi Road",
    # Gig worker heavy
    "Koramangala", "Indiranagar", "Domlur", "HAL",
    "Old Airport Road", "Outer Ring Road", "Silk Board",
    "BTM Layout", "Bommasandra", "Hoskote",
    # Both spellings
    "Bengaluru", "Bangalore",
    "Hosur", "Krishnagiri", "Dharmapuri",
    "Tumkur", "Tiptur", "Sira",
    "Kolar", "Bangarpet", "Mulbagal",
    "Ramanagara", "Channapatna", "Maddur",
    "Mandya", "Mysore Road", "Bidadi",
    "Nelamangala", "Doddaballapur", "Chikkaballapur",
    "Anekal", "Attibele", "Hebbagodi",
    "Vijayapura", "Devanahalli", "Nandi Hills",
]

ALL_LOCALITIES = MUMBAI_LOCALITIES + KANPUR_LOCALITIES + DELHI_LOCALITIES + BANGALORE_LOCALITIES

# ─── KNOWN ROADS ──────────────────────────────────────────────
KNOWN_ROADS = [
    "Western Express Highway", "Eastern Express Highway", "SV Road",
    "LBS Marg", "Linking Road", "Hill Road", "Turner Road",
    "Andheri Kurla Road", "JVLR", "Sion Panvel Highway",
    "NH48", "NH66", "Ghodbunder Road", "Thane Belapur Road",
    "Palm Beach Road", "Sion Circle", "Dharavi Cross Road",
    "90 Feet Road", "Marine Drive", "Pedder Road",
    "Dr Ambedkar Road", "Tilak Road", "Gokhale Road",
    "Dockyard Road", "Aarey Road", "Bandra Worli Sea Link",
    "GT Road", "Mall Road", "Nayaganj Road", "Rail Bazar",
    "Birhana Road", "Meston Road", "Ramadevi Road",
    "Kalpi Road", "Benajhabar Road", "Rawatpur Road",
    "Outer Ring Road Bangalore", "Old Airport Road",
    "Sarjapur Road", "Hosur Road", "Tumkur Road", 
    "Bellary Road", "Kanakapura Road", "Magadi Road", 
    "Mysore Road", "NICE Road", "Whitefield Road", 
    "Marathahalli Bridge", "Silk Board Junction", 
    "Electronic City Flyover", "Hebbal Flyover", 
    "KR Puram Bridge", "Bannerghatta Road", "Hennur Road", 
    "Varthur Road", "Yelahanka Road", "Devanahalli Road", "Hoskote Road", 
    "Airport Road Bangalore", "HAL Airport Road", "Koramangala Road", 
    "BTM Layout Road", "JP Nagar Road", "Banashankari Road", "Jayanagar Road", 
    "Rajajinagar Road", "Yeshwanthpur Road", "Peenya Road", "Jalahalli Road", 
    "MS Ramaiah Road", "Sankey Road", "Queens Road Bangalore", 
    "MG Road Bangalore", "Brigade Road", "Commercial Street Bangalore", 
    "Residency Road", "Richmond Road", "Lavelle Road", "St Marks Road", 
    "Cunningham Road", "Vittal Mallya Road", "Kasturba Road", "Cubbon Road", 
    "Nrupathunga Road", "Doddaballapur Road", "CV Raman Nagar Road",
    "Ring Road Delhi", "Outer Ring Road Delhi", "NH44", "NH48", "NH9", 
    "NH24", "GT Road Delhi", "MG Road Delhi", "Mathura Road", "Mehrauli Badarpur Road", 
    "Rohtak Road", "Palam Road", "Najafgarh Road", "Dwarka Expressway", "Yamuna Expressway", 
    "DND Flyway", "Vikas Marg", "Lal Bahadur Shastri Marg", "Noida Link Road", 
    "Faridabad Road", "Gurgaon Road", "Pankha Road", "Uttam Nagar Road", 
    "Janakpuri Road", "Pitampura Road", "Rohini Road", "Shalimar Bagh Road", "Model Town Road", 
    "GTK Road", "Wazirabad Road", "Shahdara Road", "Laxmi Nagar Road", "Mayur Vihar Road", 
    "Patparganj Road", "Ashram Road Delhi", "Lodi Road", "Aurobindo Marg", "Shantipath", "Rajpath", 
    "Connaught Place Road", "Barakhamba Road", "Janpath Road", "Kasturba Gandhi Marg", 
    "Akbar Road Delhi", "Tughlak Road", "Prithviraj Road", "Lodhi Estate Road", "Sansad Marg", 
    "Parliament Street", "Tolstoy Marg", "Africa Avenue", "Mother Teresa Crescent", "Sardar Patel Marg",
    "Dr APJ Abdul Kalam Road"
]

STREET_PATTERNS = [
    r'(?:near|at|on|along|outside|opposite)\s+([A-Z][a-zA-Z\s]{3,35}(?:Road|Marg|Lane|Street|Chowk|Junction|Bridge|Flyover|Highway|Signal|Circle|Colony|Bazaar|Market|Expressway))',
]

JUNK_WORDS = [
    "arrested", "killed", "murder", "attack", "caught",
    "nabbed", "held", "found", "died", "injured", "beaten",
    "accused", "suspect", "police", "crime", "theft", "rape",
    "driver", "gunpoint", "busy", "children", "disabilities",
]

CRITICAL_KEYWORDS = [
    "murder", "killed", "shot dead", "rape", "gang rape",
    "kidnap", "abducted", "bomb", "blast", "terror", "riot",
    "mob lynching", "encounter",
]
HIGH_KEYWORDS = [
    "robbery", "dacoity", "assault", "stabbing", "shooting",
    "attack", "beaten", "molested", "acid attack", "extortion",
    "carjacking", "chain snatching", "snatched", "bike theft",
    "vehicle theft", "delivery boy", "cab driver attacked",
    "two wheeler", "late night robbery",
]
MEDIUM_KEYWORDS = [
    "theft", "burglary", "fraud", "cheating", "arrested",
    "FIR", "police", "crime", "accused", "nabbed", "detained",
    "caught", "racket", "smuggling", "drugs", "fake",
]
LOW_KEYWORDS = [
    "accident", "fire", "mishap", "injury", "hurt",
    "collision", "fell", "died", "death", "hospital",
]

GOOGLE_NEWS_QUERIES = [
    # Mumbai
    ("Mumbai crime", "Mumbai"),
    ("Mumbai murder robbery", "Mumbai"),
    ("Mumbai police arrested", "Mumbai"),
    ("Mumbai theft assault", "Mumbai"),
    ("Mumbai rape kidnap", "Mumbai"),
    ("Mumbai accident fire", "Mumbai"),
    ("Mumbai drugs smuggling", "Mumbai"),
    ("Mumbai chain snatching dacoity", "Mumbai"),
    ("Mumbai delivery boy robbed", "Mumbai"),
    ("Mumbai bike theft delivery", "Mumbai"),
    ("Mumbai late night assault road", "Mumbai"),
    ("Mumbai Zomato Swiggy crime", "Mumbai"),
    ("Mumbai cab driver attacked", "Mumbai"),
    # Delhi
    ("Delhi crime murder robbery", "Delhi"),
    ("Delhi police arrested theft assault", "Delhi"),
    ("Delhi rape kidnap attack", "Delhi"),
    ("Delhi accident fire incident", "Delhi"),
    ("Delhi delivery boy robbed snatching", "Delhi"),
    ("Delhi cab driver auto driver crime", "Delhi"),
    ("Delhi drugs smuggling arrested", "Delhi"),
    ("Delhi Dwarka Rohini Janakpuri crime", "Delhi"),
    ("Delhi Shahdara Laxmi Nagar crime", "Delhi"),
    ("Delhi Noida Greater Noida crime", "Delhi"),
    ("Delhi Gurgaon Faridabad crime", "Delhi"),
    ("Delhi Ghaziabad Meerut crime", "Delhi"),
    ("NCR crime robbery assault", "Delhi"),
    # Bangalore — both spellings, specific localities
    ("Bengaluru crime murder robbery", "Bangalore"),
    ("Bengaluru police arrested theft", "Bangalore"),
    ("Bengaluru rape assault attack", "Bangalore"),
    ("Bengaluru accident fire", "Bangalore"),
    ("Bengaluru delivery boy snatching", "Bangalore"),
    ("Bengaluru Ola Uber driver crime", "Bangalore"),
    ("Bengaluru Koramangala Indiranagar crime", "Bangalore"),
    ("Bengaluru Whitefield Electronic City crime", "Bangalore"),
    ("Bengaluru HSR BTM Silk Board crime", "Bangalore"),
    ("Bengaluru Hebbal Yelahanka crime", "Bangalore"),
    ("Bengaluru Marathahalli KR Puram crime", "Bangalore"),
    ("Bengaluru chain snatching two wheeler", "Bangalore"),
    ("Bengaluru drugs arrested", "Bangalore"),
    ("Bangalore crime news today", "Bangalore"),
    ("Bangalore murder assault robbery", "Bangalore"),
    # Kanpur — very specific locality queries
    ("Kanpur crime news", "Kanpur"),
    ("Kanpur murder case", "Kanpur"),
    ("Kanpur robbery arrested FIR", "Kanpur"),
    ("Kanpur police action", "Kanpur"),
    ("Kanpur assault attack", "Kanpur"),
    ("Kanpur theft drugs smuggling", "Kanpur"),
    ("Kanpur accident fire today", "Kanpur"),
    ("Kanpur Kakadeo Govind Nagar crime", "Kanpur"),
    ("Kanpur Civil Lines Kidwai Nagar incident", "Kanpur"),
    ("Kanpur Jajmau Armapur Panki crime", "Kanpur"),
    ("Kanpur Kalyanpur Rawatpur crime", "Kanpur"),
    ("Kanpur Unnao crime news", "Kanpur"),
    ("Kanpur Lucknow road crime", "Kanpur"),
    ("Kanpur Fatehpur Kannauj incident", "Kanpur"),
    ("Kanpur gig worker delivery crime", "Kanpur"),
    ("UP crime Kanpur district", "Kanpur"),
]

# ─── CORE FUNCTIONS ───────────────────────────────────────────
def get_severity(text):
    t = text.lower()
    if any(k in t for k in CRITICAL_KEYWORDS): return "critical"
    if any(k in t for k in HIGH_KEYWORDS):     return "high"
    if any(k in t for k in MEDIUM_KEYWORDS):   return "medium"
    if any(k in t for k in LOW_KEYWORDS):      return "low"
    return None

def is_crime_related(text):
    return get_severity(text) is not None

def extract_localities(text, city=None):
    # Normalize Bengaluru -> Bangalore in text
    text = text.replace("Bengaluru", "Bangalore").replace("Bengaluru", "Bangalore")

    found = []
    if city is None:
        pool = ALL_LOCALITIES
    elif city == "Mumbai":
        pool = MUMBAI_LOCALITIES
    elif city == "Kanpur":
        pool = KANPUR_LOCALITIES
    elif city == "Delhi":
        pool = DELHI_LOCALITIES
    elif city == "Bangalore":
        pool = BANGALORE_LOCALITIES
    else:
        pool = ALL_LOCALITIES

    for loc in pool:
        if loc.lower() in text.lower():
            found.append(loc)
    return list(set(found))
def extract_streets(text):
    streets = []
    for pattern in STREET_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for m in matches:
            street = m.strip()
            if len(street) < 5 or len(street) > 50:
                continue
            if len(street.split()) > 4:
                continue
            if any(j in street.lower() for j in JUNK_WORDS):
                continue
            streets.append(street)
    for road in KNOWN_ROADS:
        if road.lower() in text.lower():
            streets.append(road)
    return list(set(streets))

def make_incident(loc, city, streets, title, summary, severity, source, url, date):
    return {
        "locality": loc,
        "city":     city,
        "streets":  streets,
        "title":    title,
        "summary":  summary[:400],
        "severity": severity,
        "source":   source,
        "url":      url,
        "date":     date,
    }
# Landmark to locality mapping
LANDMARK_TO_LOCALITY = {
    # Mumbai landmarks
    "cst": "Fort", "chhatrapati shivaji terminus": "Fort",
    "bandra kurla complex": "Bandra", "bkc": "Bandra",
    "dharavi slum": "Dharavi", "asia largest slum": "Dharavi",
    "juhu beach": "Juhu", "juhu chowpatty": "Juhu",
    "andheri station": "Andheri", "andheri east": "Andheri",
    "powai lake": "Powai", "hiranandani": "Powai",
    "worli sea face": "Worli", "worli dairy": "Worli",
    "kurla station": "Kurla", "ltt": "Kurla",
    "ghatkopar station": "Ghatkopar",
    "borivali national park": "Borivali",
    "aarey colony": "Goregaon",
    "versova": "Andheri",
    "lokhandwala": "Andheri",
    "malvani": "Malad",
    "mindspace": "Malad",
    "thane station": "Thane",
    "viviana mall": "Thane",
    "ulhas river": "Kalyan",
    "panvel station": "Panvel",
    "nhava sheva port": "Nhava Sheva",
    "mumbai airport": "Andheri",
    "chembur station": "Chembur",
    "govandi station": "Govandi",
    "mankhurd station": "Mankhurd",
    "naval dockyard": "Colaba",
    "gateway of india": "Colaba",
    "marine lines station": "Marine Lines",
    "mahalaxmi racecourse": "Mahalaxmi",
    "dadar station": "Dadar",
    "lower parel station": "Lower Parel",
    "phoenix mall": "Lower Parel",
    "wadala station": "Wadala",
    "sewri station": "Sewri",

    # Delhi landmarks
    "connaught place": "Connaught Place",
    "cp delhi": "Connaught Place",
    "india gate": "Connaught Place",
    "red fort": "Chandni Chowk",
    "chandni chowk market": "Chandni Chowk",
    "old delhi": "Chandni Chowk",
    "new delhi station": "Paharganj",
    "paharganj market": "Paharganj",
    "lajpat nagar market": "Lajpat Nagar",
    "sarojini nagar market": "Sarojini Nagar",
    "karol bagh market": "Karol Bagh",
    "ito delhi": "ITO",
    "supreme court": "ITO",
    "hauz khas village": "Hauz Khas",
    "saket mall": "Saket",
    "select citywalk": "Saket",
    "qutub minar": "Mehrauli",
    "dwarka sector": "Dwarka",
    "rohini sector": "Rohini",
    "pitampura tv tower": "Pitampura",
    "shahdara station": "Shahdara",
    "anand vihar station": "Anand Vihar",
    "noida sector": "Noida",
    "greater noida expressway": "Greater Noida",
    "gurgaon cyber city": "Gurgaon",
    "faridabad station": "Faridabad",
    "ghaziabad station": "Ghaziabad",
    "yamuna expressway": "Greater Noida",

    # Bangalore landmarks
    "mg road station": "MG Road",
    "brigade road market": "Brigade Road",
    "koramangala 5th block": "Koramangala",
    "koramangala 6th block": "Koramangala",
    "indiranagar 100 feet": "Indiranagar",
    "hsr layout sector": "HSR Layout",
    "btm layout": "BTM Layout",
    "electronic city phase": "Electronic City",
    "whitefield main road": "Whitefield",
    "marathahalli bridge": "Marathahalli",
    "silk board junction": "Silk Board",
    "hebbal flyover": "Hebbal",
    "yelahanka new town": "Yelahanka",
    "devanahalli airport": "Devanahalli",
    "kempegowda airport": "Devanahalli",
    "bangalore airport": "Devanahalli",
    "jayanagar 4th block": "Jayanagar",
    "jp nagar phase": "JP Nagar",
    "banashankari temple": "Banashankari",
    "peenya industrial": "Peenya",
    "yeshwanthpur station": "Yeshwanthpur",
    "rajajinagar": "Rajajinagar",
    "majestic bangalore": "Majestic",
    "ksr bangalore station": "Majestic",
    "cubbon park": "Cubbon Park",
    "vidhana soudha": "Vidhana Soudha",

    # Kanpur landmarks
    "iit kanpur": "IIT Kanpur",
    "kanpur central station": "Kanpur Central",
    "kanpur anwarganj station": "Kanpur Central",
    "green park stadium": "Civil Lines",
    "mall road kanpur": "Civil Lines",
    "jk temple": "Civil Lines",
    "phool bagh": "Civil Lines",
    "parade kanpur": "Parade Ground",
    "moti jheel park": "Moti Jheel",
    "gwaltoli market": "Gwaltoli",
    "nayaganj market": "Nayaganj",
    "birhana road market": "Civil Lines",
    "jajmau leather": "Jajmau",
    "panki power house": "Panki",
    "panki temple": "Panki",
    "kakadeo market": "Kakadeo",
    "govind nagar market": "Govind Nagar",
    "kidwai nagar market": "Kidwai Nagar",
    "armapur estate": "Armapur",
    "rawatpur gaon": "Rawatpur",
    "unnao bridge": "Unnao",
    "kalyanpur colony": "Kalyanpur",
}

def extract_locality_smart(text, city):
    """
    First try exact locality match.
    Then try landmark mapping.
    Then try police station / area keywords.
    """
    # 1. Exact locality match
    localities = extract_localities(text, city)
    if localities:
        return localities

    # 2. Landmark to locality mapping
    text_lower = text.lower()
    found = []
    for landmark, locality in LANDMARK_TO_LOCALITY.items():
        if landmark.lower() in text_lower:
            # Verify locality belongs to this city
            from scraper import MUMBAI_LOCALITIES, DELHI_LOCALITIES, BANGALORE_LOCALITIES, KANPUR_LOCALITIES
            city_pool = {
                "Mumbai": MUMBAI_LOCALITIES,
                "Delhi": DELHI_LOCALITIES,
                "Bangalore": BANGALORE_LOCALITIES,
                "Kanpur": KANPUR_LOCALITIES,
            }.get(city, [])
            if locality in city_pool:
                found.append(locality)

    if found:
        return list(set(found))

    # 3. Police station keywords
    police_patterns = [
        r'(\w+(?:\s\w+)?)\s+police\s+station',
        r'(\w+(?:\s\w+)?)\s+thana',
        r'(\w+(?:\s\w+)?)\s+chowki',
    ]
    for pat in police_patterns:
        matches = re.findall(pat, text_lower)
        for m in matches:
            area = m.strip().title()
            localities = extract_localities(area, city)
            if localities:
                found.extend(localities)

    return list(set(found)) if found else []

# ─── SOURCE 1: GOOGLE NEWS RSS ────────────────────────────────
def scrape_google_news():
    incidents = []
    for query, city in GOOGLE_NEWS_QUERIES:
        q = query.replace(" ", "+")
        url = f"https://news.google.com/rss/search?q={q}&hl=en-IN&gl=IN&ceid=IN:en"
        feed = feedparser.parse(url)
        count = 0
        for entry in feed.entries:
            title   = entry.get("title", "")
            summary = entry.get("summary", "")
            full    = title + " " + summary
            severity = get_severity(full)
            if not severity:
                continue
            localities = extract_locality_smart(full, city)
            if not localities :
                continue 
            streets    = extract_streets(full)
            for loc in localities:
                incidents.append(make_incident(
                    loc, city, streets, title, summary,
                    severity, "google_news",
                    entry.get("link", ""),
                    entry.get("published", datetime.now().isoformat())
                ))
                count += 1
        print(f"[Google News][{city}] '{query}': {count} incidents")
    return incidents

# ─── SOURCE 2: TOI DIRECT SCRAPE ──────────────────────────────
def scrape_toi_direct():
    incidents = []
    targets = targets = [
        ("https://timesofindia.indiatimes.com/city/mumbai", "Mumbai"),
        ("https://timesofindia.indiatimes.com/city/delhi", "Delhi"),
        ("https://timesofindia.indiatimes.com/city/bengaluru", "Bangalore"),
        ("https://timesofindia.indiatimes.com/city/kanpur", "Kanpur"),
        ("https://timesofindia.indiatimes.com/city/noida", "Delhi"),
        ("https://timesofindia.indiatimes.com/city/gurgaon", "Delhi"),
        ("https://timesofindia.indiatimes.com/city/thane", "Mumbai"),
        ("https://timesofindia.indiatimes.com/city/navi-mumbai", "Mumbai"),
    ]
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"}

    for url, city in targets:
        try:
            r = requests.get(url, headers=headers, timeout=10)
            soup = BeautifulSoup(r.text, "html.parser")
            count = 0
            seen = set()

            for tag in soup.find_all(["h2", "h3", "a"]):
                title = tag.get_text(strip=True)
                if len(title) < 25 or title in seen:
                    continue
                seen.add(title)
                if not is_crime_related(title):
                    continue
                localities = extract_localities(title, city)
                if not localities:
                    continue
                streets  = extract_streets(title)
                severity = get_severity(title) or "medium"
                for loc in localities:
                    incidents.append(make_incident(
                        loc, city, streets, title, title,
                        severity, "toi_direct", url,
                        datetime.now().isoformat()
                    ))
                    count += 1

            print(f"[TOI][{city}]: {count} incidents")
        except Exception as e:
            print(f"TOI error {city}: {e}")

    return incidents

# ─── SOURCE 3: GNEWS API ──────────────────────────────────────
def scrape_gnews(api_key):
    incidents = []
    queries = [
        # Mumbai
        ("Mumbai crime", "Mumbai"),
        ("Mumbai murder robbery", "Mumbai"),
        ("Mumbai police arrested", "Mumbai"),
        ("Mumbai theft assault", "Mumbai"),
        ("Mumbai rape kidnap", "Mumbai"),
        ("Mumbai accident fire", "Mumbai"),
        ("Mumbai drugs smuggling", "Mumbai"),
        ("Mumbai chain snatching dacoity", "Mumbai"),
        ("Mumbai delivery boy robbed", "Mumbai"),
        ("Mumbai bike theft delivery", "Mumbai"),
        ("Mumbai late night assault road", "Mumbai"),
        ("Mumbai Zomato Swiggy crime", "Mumbai"),
        ("Mumbai cab driver attacked", "Mumbai"),
        # Delhi
        ("Delhi crime murder robbery", "Delhi"),
        ("Delhi police arrested theft assault", "Delhi"),
        ("Delhi rape kidnap attack", "Delhi"),
        ("Delhi accident fire incident", "Delhi"),
        ("Delhi delivery boy robbed snatching", "Delhi"),
        ("Delhi cab driver auto driver crime", "Delhi"),
        ("Delhi drugs smuggling arrested", "Delhi"),
        ("Delhi Dwarka Rohini Janakpuri crime", "Delhi"),
        ("Delhi Shahdara Laxmi Nagar crime", "Delhi"),
        ("Delhi Noida Greater Noida crime", "Delhi"),
        ("Delhi Gurgaon Faridabad crime", "Delhi"),
        ("Delhi Ghaziabad Meerut crime", "Delhi"),
        ("NCR crime robbery assault", "Delhi"),
        # Bangalore — both spellings, specific localities
        ("Bengaluru crime murder robbery", "Bangalore"),
        ("Bengaluru police arrested theft", "Bangalore"),
        ("Bengaluru rape assault attack", "Bangalore"),
        ("Bengaluru accident fire", "Bangalore"),
        ("Bengaluru delivery boy snatching", "Bangalore"),
        ("Bengaluru Ola Uber driver crime", "Bangalore"),
        ("Bengaluru Koramangala Indiranagar crime", "Bangalore"),
        ("Bengaluru Whitefield Electronic City crime", "Bangalore"),
        ("Bengaluru HSR BTM Silk Board crime", "Bangalore"),
        ("Bengaluru Hebbal Yelahanka crime", "Bangalore"),
        ("Bengaluru Marathahalli KR Puram crime", "Bangalore"),
        ("Bengaluru chain snatching two wheeler", "Bangalore"),
        ("Bengaluru drugs arrested", "Bangalore"),
        ("Bangalore crime news today", "Bangalore"),
        ("Bangalore murder assault robbery", "Bangalore"),
        # Kanpur — very specific locality queries
        ("Kanpur crime news", "Kanpur"),
        ("Kanpur murder case", "Kanpur"),
        ("Kanpur robbery arrested FIR", "Kanpur"),
        ("Kanpur police action", "Kanpur"),
        ("Kanpur assault attack", "Kanpur"),
        ("Kanpur theft drugs smuggling", "Kanpur"),
        ("Kanpur accident fire today", "Kanpur"),
        ("Kanpur Kakadeo Govind Nagar crime", "Kanpur"),
        ("Kanpur Civil Lines Kidwai Nagar incident", "Kanpur"),
        ("Kanpur Jajmau Armapur Panki crime", "Kanpur"),
        ("Kanpur Kalyanpur Rawatpur crime", "Kanpur"),
        ("Kanpur Unnao crime news", "Kanpur"),
        ("Kanpur Lucknow road crime", "Kanpur"),
        ("Kanpur Fatehpur Kannauj incident", "Kanpur"),
        ("Kanpur gig worker delivery crime", "Kanpur"),
        ("UP crime Kanpur district", "Kanpur"),
    ]
    for query, city in queries:
        try:
            r = requests.get(
                "https://gnews.io/api/v4/search",
                params={"q": query, "lang": "en", "max": 10, "apikey": api_key},
                timeout=10
            )
            data = r.json()
            count = 0
            for article in data.get("articles", []):
                title   = article.get("title", "") or ""
                summary = article.get("description", "") or ""
                full    = title + " " + summary
                severity = get_severity(full)
                if not severity:
                    continue
                localities = extract_locality_smart(full, city) 
                if not localities :
                    continue
                streets    = extract_streets(full)
                for loc in localities:
                    incidents.append(make_incident(
                        loc, city, streets, title, summary,
                        severity, "gnews",
                        article.get("url", ""),
                        article.get("publishedAt", datetime.now().isoformat())
                    ))
                    count += 1
            print(f"[GNews][{city}] '{query}': {count} incidents")
        except Exception as e:
            print(f"GNews error: {e}")
    return incidents

# ─── NEWSAPI ──────────────────────────────────────────────────
def scrape_newsapi(api_key):
    from newsapi import NewsApiClient
    newsapi = NewsApiClient(api_key=api_key)
    incidents = []
    queries = [
        # Mumbai
        ("Mumbai crime", "Mumbai"),
        ("Mumbai murder robbery", "Mumbai"),
        ("Mumbai police arrested", "Mumbai"),
        ("Mumbai theft assault", "Mumbai"),
        ("Mumbai rape kidnap", "Mumbai"),
        ("Mumbai accident fire", "Mumbai"),
        ("Mumbai drugs smuggling", "Mumbai"),
        ("Mumbai chain snatching dacoity", "Mumbai"),
        ("Mumbai delivery boy robbed", "Mumbai"),
        ("Mumbai bike theft delivery", "Mumbai"),
        ("Mumbai late night assault road", "Mumbai"),
        ("Mumbai Zomato Swiggy crime", "Mumbai"),
        ("Mumbai cab driver attacked", "Mumbai"),
        # Delhi
        ("Delhi crime murder robbery", "Delhi"),
        ("Delhi police arrested theft assault", "Delhi"),
        ("Delhi rape kidnap attack", "Delhi"),
        ("Delhi accident fire incident", "Delhi"),
        ("Delhi delivery boy robbed snatching", "Delhi"),
        ("Delhi cab driver auto driver crime", "Delhi"),
        ("Delhi drugs smuggling arrested", "Delhi"),
        ("Delhi Dwarka Rohini Janakpuri crime", "Delhi"),
        ("Delhi Shahdara Laxmi Nagar crime", "Delhi"),
        ("Delhi Noida Greater Noida crime", "Delhi"),
        ("Delhi Gurgaon Faridabad crime", "Delhi"),
        ("Delhi Ghaziabad Meerut crime", "Delhi"),
        ("NCR crime robbery assault", "Delhi"),
        # Bangalore — both spellings, specific localities
        ("Bengaluru crime murder robbery", "Bangalore"),
        ("Bengaluru police arrested theft", "Bangalore"),
        ("Bengaluru rape assault attack", "Bangalore"),
        ("Bengaluru accident fire", "Bangalore"),
        ("Bengaluru delivery boy snatching", "Bangalore"),
        ("Bengaluru Ola Uber driver crime", "Bangalore"),
        ("Bengaluru Koramangala Indiranagar crime", "Bangalore"),
        ("Bengaluru Whitefield Electronic City crime", "Bangalore"),
        ("Bengaluru HSR BTM Silk Board crime", "Bangalore"),
        ("Bengaluru Hebbal Yelahanka crime", "Bangalore"),
        ("Bengaluru Marathahalli KR Puram crime", "Bangalore"),
        ("Bengaluru chain snatching two wheeler", "Bangalore"),
        ("Bengaluru drugs arrested", "Bangalore"),
        ("Bangalore crime news today", "Bangalore"),
        ("Bangalore murder assault robbery", "Bangalore"),
        # Kanpur — very specific locality queries
        ("Kanpur crime news", "Kanpur"),
        ("Kanpur murder case", "Kanpur"),
        ("Kanpur robbery arrested FIR", "Kanpur"),
        ("Kanpur police action", "Kanpur"),
        ("Kanpur assault attack", "Kanpur"),
        ("Kanpur theft drugs smuggling", "Kanpur"),
        ("Kanpur accident fire today", "Kanpur"),
        ("Kanpur Kakadeo Govind Nagar crime", "Kanpur"),
        ("Kanpur Civil Lines Kidwai Nagar incident", "Kanpur"),
        ("Kanpur Jajmau Armapur Panki crime", "Kanpur"),
        ("Kanpur Kalyanpur Rawatpur crime", "Kanpur"),
        ("Kanpur Unnao crime news", "Kanpur"),
        ("Kanpur Lucknow road crime", "Kanpur"),
        ("Kanpur Fatehpur Kannauj incident", "Kanpur"),
        ("Kanpur gig worker delivery crime", "Kanpur"),
        ("UP crime Kanpur district", "Kanpur"),
    ]
    for query, city in queries:
        try:
            articles = newsapi.get_everything(
                q=query, language="en",
                sort_by="publishedAt", page_size=100,
                from_param="2026-04-30"
            )
            count = 0
            for article in articles.get("articles", []):
                title   = article.get("title", "") or ""
                summary = article.get("description", "") or ""
                full    = title + " " + summary
                severity = get_severity(full)
                if not severity:
                    continue
                localities = extract_locality_smart(full, city)
                if not localities :
                    continue
                streets    = extract_streets(full)
                for loc in localities:
                    incidents.append(make_incident(
                        loc, city, streets, title, summary,
                        severity, "newsapi",
                        article.get("url", ""),
                        article.get("publishedAt", datetime.now().isoformat())
                    ))
                    count += 1
            print(f"[NewsAPI][{city}] '{query}': {count} incidents")
        except Exception as e:
            print(f"NewsAPI error: {e}")
    return incidents

# ─── MAIN ENTRY ───────────────────────────────────────────────
def scrape_feeds():
    incidents = []

    incidents += scrape_google_news()
    incidents += scrape_toi_direct()

    GNEWS_KEY   = "7045b15bf6d4ac7c6a5749c7adb0c263"
    NEWSAPI_KEY = "6a2edc681854483184b8dbd864bdd3de"

    if GNEWS_KEY != "7045b15bf6d4ac7c6a5749c7adb0c263":
        incidents += scrape_gnews(GNEWS_KEY)

    incidents += scrape_newsapi(NEWSAPI_KEY)

    print(f"\nTotal: {len(incidents)} incidents scraped")
    return incidents