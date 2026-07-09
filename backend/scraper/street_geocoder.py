import json
from scraper.db import get_street_incidents, save_street_risk

SEVERITY_SCORE = {
    "critical": 4,
    "high": 3,
    "medium": 2,
    "low": 1
}

LOCALITY_COORDS = {
    # ── MUMBAI CORE ──────────────────────────────────────────
    "Dharavi":          (19.0445, 72.8586),
    "Kurla":            (19.0728, 72.8826),
    "Govandi":          (19.0480, 72.9285),
    "Chembur":          (19.0522, 72.8997),
    "Ghatkopar":        (19.0864, 72.9081),
    "Malad":            (19.1868, 72.8487),
    "Borivali":         (19.2307, 72.8567),
    "Andheri":          (19.1197, 72.8464),
    "Goregaon":         (19.1663, 72.8526),
    "Bandra":           (19.0596, 72.8295),
    "Mankhurd":         (19.0482, 72.9317),
    "Trombay":          (19.0300, 72.9500),
    "Vashi":            (19.0771, 73.0070),
    "Kamathipura":      (18.9638, 72.8210),
    "Dadar":            (19.0178, 72.8478),
    "Colaba":           (18.9067, 72.8147),
    "Worli":            (19.0048, 72.8172),
    "Powai":            (19.1197, 72.9063),
    "Thane":            (19.2183, 72.9781),
    "Navi Mumbai":      (19.0330, 73.0297),
    "Kandivali":        (19.2055, 72.8519),
    "Mira Road":        (19.2813, 72.8748),
    "Bhiwandi":         (19.2967, 73.0580),
    "Vikhroli":         (19.1054, 72.9252),
    "Mulund":           (19.1752, 72.9469),
    "Bhandup":          (19.1470, 72.9419),
    "Nahur":            (19.1350, 72.9350),
    "Kanjurmarg":       (19.1317, 72.9415),
    "Dahisar":          (19.2517, 72.8567),
    "Jogeshwari":       (19.1397, 72.8493),
    "Vile Parle":       (19.0990, 72.8440),
    "Santacruz":        (19.0830, 72.8397),
    "Khar":             (19.0697, 72.8345),
    "Juhu":             (19.1075, 72.8263),
    "Cheeta Camp":      (19.0467, 72.9267),
    "Tilaknagar":       (19.0600, 72.9100),
    "Chunabhatti":      (19.0433, 72.8817),
    "GTB Nagar":        (19.0550, 72.9200),
    "Fort":             (18.9340, 72.8356),
    "Churchgate":       (18.9322, 72.8264),
    "Marine Lines":     (18.9438, 72.8233),
    "Mahalaxmi":        (18.9833, 72.8190),
    "Parel":            (19.0048, 72.8397),
    "Lower Parel":      (18.9939, 72.8258),
    "Sewri":            (18.9833, 72.8617),
    "Wadala":           (19.0197, 72.8617),
    "Nerul":            (19.0333, 73.0167),
    "Belapur":          (19.0217, 73.0400),
    "Kharghar":         (19.0472, 73.0697),
    "Panvel":           (18.9894, 73.1175),
    "Airoli":           (19.1550, 72.9983),
    "Ghansoli":         (19.1217, 73.0083),
    "Koparkhairane":    (19.1050, 73.0067),
    "Turbhe":           (19.0817, 73.0183),
    "Kalyan":           (19.2437, 73.1355),
    "Dombivli":         (19.2183, 73.0833),
    "Ambernath":        (19.2000, 73.1833),
    "Badlapur":         (19.1667, 73.2500),
    "Ulhasnagar":       (19.2167, 73.1500),
    "Hiranandani":      (19.1197, 72.9063),
    "Chandivali":       (19.1167, 72.9000),
    "Goregaon East":    (19.1663, 72.8700),
    "Goregaon West":    (19.1663, 72.8400),
    "Palghar":          (19.6967, 72.7650),
    "Virar":            (19.4561, 72.8111),
    "Vasai":            (19.3647, 72.8376),
    "Nalasopara":       (19.4200, 72.8000),
    "Karjat":           (18.9150, 73.3200),
    "Khopoli":          (18.7870, 73.3440),
    "Pen":              (18.7350, 73.0950),
    "Alibag":           (18.6414, 72.8722),
    "Uran":             (18.8870, 72.9450),
    "Roha":             (18.4400, 73.1167),
    "Nashik Road":      (19.9975, 73.7898),
    "Igatpuri":         (19.6940, 73.5630),
    "Neral":            (18.8620, 73.2780),
    "Mahad":            (18.0850, 73.4160),
    "Dronagiri":        (18.9300, 72.9700),
    "Nhava Sheva":      (18.9500, 72.9500),

    # ── DELHI CORE ───────────────────────────────────────────
    "Connaught Place":  (28.6315, 77.2167),
    "Karol Bagh":       (28.6518, 77.1901),
    "Paharganj":        (28.6431, 77.2150),
    "Chandni Chowk":    (28.6506, 77.2300),
    "Lajpat Nagar":     (28.5677, 77.2433),
    "Sarojini Nagar":   (28.5757, 77.1988),
    "Janpath":          (28.6200, 77.2150),
    "ITO":              (28.6289, 77.2497),
    "Hauz Khas":        (28.5494, 77.2001),
    "Malviya Nagar":    (28.5355, 77.2098),
    "Saket":            (28.5244, 77.2066),
    "Vasant Kunj":      (28.5200, 77.1600),
    "Mehrauli":         (28.5244, 77.1855),
    "Chattarpur":       (28.4997, 77.1700),
    "Sultanpur":        (28.4900, 77.1500),
    "Lado Sarai":       (28.5300, 77.2000),
    "Rohini":           (28.7347, 77.1085),
    "Pitampura":        (28.7050, 77.1350),
    "Shalimar Bagh":    (28.7167, 77.1667),
    "Ashok Vihar":      (28.6930, 77.1817),
    "Model Town":       (28.7167, 77.2000),
    "Burari":           (28.7500, 77.2167),
    "Bawana":           (28.7833, 77.0500),
    "Narela":           (28.8500, 77.1000),
    "Shahdara":         (28.6667, 77.2833),
    "Preet Vihar":      (28.6433, 77.2933),
    "Mayur Vihar":      (28.6083, 77.2950),
    "Patparganj":       (28.6267, 77.3000),
    "Laxmi Nagar":      (28.6317, 77.2783),
    "Vivek Vihar":      (28.6717, 77.3167),
    "Anand Vihar":      (28.6467, 77.3150),
    "Geeta Colony":     (28.6567, 77.2767),
    "Dwarka":           (28.6149, 77.0228),
    "Janakpuri":        (28.6283, 77.0833),
    "Uttam Nagar":      (28.6217, 77.0583),
    "Vikaspuri":        (28.6383, 77.0767),
    "Tilak Nagar":      (28.6417, 77.1017),
    "Rajouri Garden":   (28.6483, 77.1217),
    "Punjabi Bagh":     (28.6683, 77.1317),
    "Paschim Vihar":    (28.6750, 77.0983),
    "Okhla":            (28.5483, 77.2700),
    "Jamia Nagar":      (28.5617, 77.2933),
    "Badarpur":         (28.5000, 77.2833),
    "Sangam Vihar":     (28.5183, 77.2567),
    "Tughlakabad":      (28.4883, 77.2633),
    "Govindpuri":       (28.5317, 77.2567),
    "Kalkaji":          (28.5433, 77.2567),
    "Greater Kailash":  (28.5383, 77.2317),
    "Naraina":          (28.6317, 77.1433),
    "Kirti Nagar":      (28.6533, 77.1467),
    "Moti Nagar":       (28.6583, 77.1567),
    "Dilshad Garden":   (28.6817, 77.3167),
    "Seelampur":        (28.6667, 77.2883),
    "Mustafabad":       (28.7033, 77.2983),
    "Bhajanpura":       (28.6983, 77.2733),
    "Gokulpuri":        (28.6917, 77.2917),
    "Jaffrabad":        (28.6900, 77.2817),
    "Maujpur":          (28.6933, 77.2950),
    "Noida":            (28.5355, 77.3910),
    "Greater Noida":    (28.4744, 77.5040),
    "Gurgaon":          (28.4595, 77.0266),
    "Faridabad":        (28.4089, 77.3178),
    "Ghaziabad":        (28.6692, 77.4538),
    "Sonipat":          (28.9931, 77.0151),
    "Bahadurgarh":      (28.6920, 76.9320),
    "Meerut":           (28.9845, 77.7064),
    "Manesar":          (28.3580, 76.9380),
    "Bhiwadi":          (28.2050, 76.8580),
    "Rewari":           (28.1900, 76.6200),
    "Panipat":          (29.3909, 76.9635),
    "Rohtak":           (28.8955, 76.6066),
    "Jhajjar":          (28.6080, 76.6550),
    "Alwar":            (27.5530, 76.6346),
    "Neemrana":         (27.9850, 76.3850),
    "Loni":             (28.7483, 77.2883),
    "Muradnagar":       (28.7783, 77.4967),
    "Modinagar":        (28.8317, 77.5550),
    "Hapur":            (28.7300, 77.7750),
    "Bulandshahr":      (28.4050, 77.8500),
    "Dadri":            (28.5550, 77.5550),
    "Jewar":            (28.1233, 77.5550),
    "Kundli":           (28.8683, 77.0350),

    # ── BANGALORE CORE ───────────────────────────────────────
    "MG Road":          (12.9716, 77.6197),
    "Brigade Road":     (12.9719, 77.6075),
    "Commercial Street":(12.9800, 77.6080),
    "Shivajinagar":     (12.9850, 77.5950),
    "Cubbon Park":      (12.9780, 77.5950),
    "Majestic":         (12.9766, 77.5713),
    "City Market":      (12.9600, 77.5750),
    "Vidhana Soudha":   (12.9791, 77.5913),
    "Hebbal":           (13.0450, 77.5970),
    "Yelahanka":        (13.1000, 77.5950),
    "Devanahalli":      (13.2500, 77.7100),
    "Thanisandra":      (13.0600, 77.6400),
    "Nagawara":         (13.0467, 77.6217),
    "Jayanagar":        (12.9308, 77.5831),
    "JP Nagar":         (12.9063, 77.5857),
    "Banashankari":     (12.9250, 77.5500),
    "Uttarahalli":      (12.8950, 77.5300),
    "Electronic City":  (12.8450, 77.6600),
    "Bommanahalli":     (12.8983, 77.6467),
    "HSR Layout":       (12.9116, 77.6389),
    "Whitefield":       (12.9957, 77.7579),
    "Marathahalli":     (12.9590, 77.6974),
    "Brookefield":      (12.9783, 77.7150),
    "Kadugodi":         (12.9983, 77.7500),
    "KR Puram":         (13.0050, 77.6960),
    "Tin Factory":      (12.9983, 77.6833),
    "Bellandur":        (12.9267, 77.6767),
    "Sarjapur":         (12.9100, 77.6800),
    "Rajajinagar":      (12.9900, 77.5550),
    "Basaveshwara Nagar":(13.0033, 77.5550),
    "Yeshwanthpur":     (13.0200, 77.5500),
    "Peenya":           (13.0280, 77.5200),
    "Jalahalli":        (13.0450, 77.5350),
    "Koramangala":      (12.9352, 77.6245),
    "Indiranagar":      (12.9784, 77.6408),
    "Domlur":           (12.9600, 77.6383),
    "HAL":              (12.9700, 77.6500),
    "Old Airport Road": (12.9700, 77.6500),
    "Outer Ring Road":  (12.9500, 77.6900),
    "Silk Board":       (12.9170, 77.6230),
    "BTM Layout":       (12.9165, 77.6101),
    "Bommasandra":      (12.8083, 77.6883),
    "Hoskote":          (13.0700, 77.7980),
    "Hosur":            (12.7400, 77.8200),
    "Tumkur":           (13.3400, 77.1015),
    "Kolar":            (13.1360, 78.1294),
    "Ramanagara":       (12.7200, 77.2800),
    "Channapatna":      (12.6500, 77.2100),
    "Maddur":           (12.5833, 77.0500),
    "Mandya":           (12.5220, 76.8950),
    "Nelamangala":      (13.0990, 77.3930),
    "Doddaballapur":    (13.2940, 77.5370),
    "Chikkaballapur":   (13.4355, 77.7315),
    "Anekal":           (12.7100, 77.6950),
    "Attibele":         (12.7783, 77.7717),
    "Hebbagodi":        (12.8333, 77.6833),
    "Vijayapura":       (13.1700, 77.7950),
    "Nandi Hills":      (13.3700, 77.6830),
    "Bidadi":           (12.8000, 77.3833),
    "Kogilu":           (13.0783, 77.6150),
    "Jakkur":           (13.0617, 77.5983),
    "Bellary Road":     (13.0800, 77.5900),
    "Kanakapura Road":  (12.8700, 77.5600),
    "Mysore Road":      (12.9400, 77.5000),

    # ── KANPUR CORE ──────────────────────────────────────────
    # Updated 2026-07 — verified against Wikipedia, GPS databases, OSM.
    # Significant fixes: Kakadeo (3.65km), Kanpur Central (2.75km), Armapur (2.17km),
    # Purwa (1.96km), Chakeri (1.66km), Shivrajpur (1.55km), Govind Nagar (1.49km),
    # Parade Ground (1.47km), Civil Lines (1.41km), Shyam Nagar (1.44km).
    "Kakadeo":          (26.4789, 80.2911),   # fixed: was 3.65km off
    "Kidwai Nagar":     (26.4538, 80.3512),   # fixed: 1.29km
    "Civil Lines":      (26.4674, 80.3484),   # fixed: 1.41km
    "Kalyanpur":        (26.5119, 80.2895),   # OK: 0.22km
    "Govind Nagar":     (26.4767, 80.3218),   # fixed: 1.49km
    "Armapur":          (26.4613, 80.2732),   # fixed: 2.17km
    "Swaroop Nagar":    (26.4952, 80.3272),   # fixed: 0.59km
    "Barra":            (26.4244, 80.3774),   # fixed: 1.20km
    "Harsh Nagar":      (26.4857, 80.3072),   # fixed: 1.06km
    "Shyam Nagar":      (26.4983, 80.3467),   # fixed: 1.44km
    "Panki":            (26.4389, 80.2734),   # fixed: 0.63km
    "Chakeri":          (26.4684, 80.4152),   # fixed: 1.66km
    "Rawatpur":         (26.5024, 80.3468),   # OK: 0.30km
    "Fazalganj":        (26.4418, 80.3562),   # fixed: 0.83km
    "Naubasta":         (26.5318, 80.3886),   # fixed: 0.52km
    "Vikas Nagar":      (26.5134, 80.3618),   # fixed: 0.75km
    "Benajhabar":       (26.4729, 80.3634),   # fixed: 0.85km
    "Juhi":             (26.4284, 80.3152),   # fixed: 0.86km
    "Shivrajpur":       (26.5792, 80.1634),   # fixed: 1.55km (lng was wrong)
    "Bilhaur":          (26.7462, 80.0448),   # OK: 0.07km
    "Jajmau":           (26.4174, 80.3984),   # OK: 0.18km
    "Gwaltoli":         (26.4573, 80.3418),   # fixed: 1.15km
    "Colonelganj":      (26.4598, 80.3348),   # fixed: 1.23km
    "Hatia":            (26.4512, 80.3297),   # fixed: 0.65km
    "Sisamau":          (26.4584, 80.3268),   # OK: 0.35km
    "Yashoda Nagar":    (26.4684, 80.3618),   # fixed: 0.79km
    "Lal Bangla":       (26.4818, 80.3418),   # fixed: 0.96km
    "Collectorganj":    (26.4573, 80.3518),   # fixed: 1.44km
    "Parade Ground":    (26.4624, 80.3351),   # fixed: 1.47km
    "Moti Jheel":       (26.4612, 80.3434),   # OK: 0.45km
    "Beconganj":        (26.4578, 80.3318),   # fixed: 1.36km
    "IIT Kanpur":       (26.5123, 80.2329),   # exact — unchanged
    "Kalpi Road":       (26.4152, 80.3148),   # fixed: 0.70km
    "Kanpur Central":   (26.4584, 80.3512),   # fixed: 2.75km (station coords)
    "Unnao":            (26.5455, 80.4983),   # OK: 0.39km
    "Purwa":            (26.4667, 80.7902),   # fixed: 1.96km
    "Bangarmau":        (26.6883, 80.2168),   # OK: 0.56km
    "Fatehpur":         (25.9302, 80.8143),   # OK: 0.40km
    "Bindki":           (25.8834, 81.0165),   # exact — unchanged
    "Khaga":            (25.7763, 81.5068),   # fixed: 1.24km
    "Kannauj":          (27.0554, 79.9097),   # OK: 0.22km
    "Etawah":           (26.7753, 79.0198),   # fixed: 1.08km
    "Hamirpur":         (25.9533, 80.1467),   # OK: 0.48km
    "Lucknow":          (26.8467, 80.9462),   # exact — unchanged
    "Raebareli":        (26.2344, 81.2322),   # exact — unchanged
}

ROAD_COORDS = {
    # ── MUMBAI CORE ──────────────────────────────────────────
    "Western Express Highway":    (19.1767, 72.8588),
    "Eastern Express Highway":    (19.0920, 72.9080),
    "SV Road":                    (19.1710, 72.8398),
    "LBS Marg":                   (19.0990, 72.8850),
    "Linking Road":               (19.0607, 72.8362),
    "Hill Road":                  (19.0507, 72.8297),
    "Turner Road":                (19.0554, 72.8338),
    "Andheri Kurla Road":         (19.1147, 72.8692),
    "JVLR":                       (19.1250, 72.9307),
    "Jogeshwari Vikhroli Link Road": (19.1250, 72.9307),
    "Sion Panvel Highway":        (19.0430, 73.0100),
    "NH48":                       (19.2200, 72.9780),
    "NH66":                       (19.0200, 72.8200),
    "Ghodbunder Road":            (19.2450, 72.9650),
    "Thane Belapur Road":         (19.1500, 73.0100),
    "Palm Beach Road":            (19.0500, 73.0100),
    "Sion Circle":                (19.0430, 72.8648),
    "Dharavi Cross Road":         (19.0450, 72.8550),
    "90 Feet Road":               (19.0760, 72.8777),
    "Marine Drive":               (18.9304, 72.8222),
    "Pedder Road":                (18.9680, 72.8080),
    "Dr Ambedkar Road":           (19.0380, 72.8480),
    "Tilak Road":                 (19.0190, 72.8390),
    "Gokhale Road":               (19.0290, 72.8430),
    "Dockyard Road":              (18.9675, 72.8445),
    "Naval Dockyard Road":        (18.9270, 72.8390),
    "Aarey Road":                 (19.1650, 72.9000),
    "Bandra Worli Sea Link":      (19.0380, 72.8180),
    "Arthur Road":                (18.9846, 72.8299),
    "Mira Road":                  (19.2813, 72.8748),
    "Ring Road":                  (19.1100, 72.8900),
    # ── MUMBAI EXTENDED ──────────────────────────────────────
    "Palghar Road":               (19.6967, 72.7650),
    "Virar Road":                 (19.4561, 72.8111),
    "Vasai Road":                 (19.3647, 72.8376),
    "Nalasopara Road":            (19.4200, 72.8000),
    "Karjat Road":                (18.9150, 73.3200),
    "Khopoli Road":               (18.7870, 73.3440),
    "Pen Road":                   (18.7350, 73.0950),
    "Alibag Road":                (18.6414, 72.8722),
    "Nashik Highway":             (19.9975, 73.7898),
    "Igatpuri Road":              (19.6940, 73.5630),
    "Uran Road":                  (18.8870, 72.9450),
    "Nhava Sheva Road":           (18.9500, 72.9500),
    "Shahad Road":                (19.1720, 73.2580),
    "Titwala Road":               (19.2850, 73.2150),
    "Neral Road":                 (18.8620, 73.2780),
    "Mahad Road":                 (18.0850, 73.4160),
    # ── KANPUR CORE ──────────────────────────────────────────
    "GT Road":                    (26.4219, 80.3739),
    "Mall Road":                  (26.4674, 80.3498),
    "Nayaganj Road":              (26.4740, 80.3350),
    "Rail Bazar":                 (26.4607, 80.3310),
    "Birhana Road":               (26.4650, 80.3420),
    "Meston Road":                (26.4560, 80.3380),
    "Ramadevi Road":              (26.4115, 80.3868),
    "Kalpi Road":                 (26.4200, 80.3100),
    "Benajhabar Road":            (26.4800, 80.3600),
    "Rawatpur Road":              (26.5020, 80.3500),
    "Govind Nagar Road":          (26.4900, 80.3200),
    "Harsh Nagar Road":           (26.4950, 80.3100),
    "Kalyanpur Road":             (26.5100, 80.2900),
    "Panki Road":                 (26.4400, 80.2800),
    "Fazalganj Road":             (26.4350, 80.3600),
    "Civil Lines Road":           (26.4800, 80.3500),
    "Swaroop Nagar Road":         (26.5000, 80.3300),
    "Kakadeo Road":               (26.5050, 80.3150),
    "Kidwai Nagar Road":          (26.4650, 80.3550),
    # ── KANPUR EXTENDED ──────────────────────────────────────
    "Unnao Road":                 (26.5490, 80.4980),
    "Fatehpur Road":              (25.9300, 80.8100),
    "Kannauj Road":               (27.0550, 79.9120),
    "Etawah Road":                (26.7850, 79.0200),
    "Lucknow Road":               (26.8467, 80.9462),
    "Raebareli Road":             (26.2340, 81.2320),
    "Hamirpur Road":              (25.9500, 80.1500),
    # ── DELHI CORE ───────────────────────────────────────────
    "Ring Road Delhi":            (28.6139, 77.2090),
    "Outer Ring Road Delhi":      (28.5500, 77.1800),
    "NH44":                       (28.7000, 77.1500),
    "NH9":                        (28.6200, 77.3500),
    "NH24":                       (28.6700, 77.3200),
    "GT Road Delhi":              (28.7200, 77.1800),
    "MG Road Delhi":              (28.5450, 77.2150),
    "Mathura Road":               (28.5600, 77.2500),
    "Mehrauli Badarpur Road":     (28.5200, 77.2100),
    "Rohtak Road":                (28.6700, 77.0800),
    "Palam Road":                 (28.5800, 77.0700),
    "Najafgarh Road":             (28.6200, 77.0200),
    "Dwarka Expressway":          (28.5700, 77.0300),
    "Yamuna Expressway":          (28.4500, 77.3300),
    "DND Flyway":                 (28.5600, 77.3000),
    "Vikas Marg":                 (28.6300, 77.2900),
    "Lal Bahadur Shastri Marg":   (28.6250, 77.2700),
    "Noida Link Road":            (28.5700, 77.3200),
    "Ashram Road Delhi":          (28.5700, 77.2500),
    "Lodi Road":                  (28.5900, 77.2300),
    "Aurobindo Marg":             (28.5500, 77.2000),
    "Shantipath":                 (28.5987, 77.1875),
    "Rajpath":                    (28.6129, 77.2295),
    "Connaught Place Road":       (28.6315, 77.2167),
    "Barakhamba Road":            (28.6280, 77.2320),
    "Janpath Road":               (28.6200, 77.2150),
    "Kasturba Gandhi Marg":       (28.6270, 77.2250),
    "Akbar Road Delhi":           (28.6000, 77.2050),
    "Tughlak Road":               (28.5980, 77.2000),
    "Sansad Marg":                (28.6200, 77.2100),
    "Tolstoy Marg":               (28.6270, 77.2270),
    "Africa Avenue":              (28.5800, 77.1900),
    # ── DELHI EXTENDED NCR ───────────────────────────────────
    "Faridabad Road":             (28.4089, 77.3178),
    "Gurgaon Road":               (28.4595, 77.0266),
    "Noida Road":                 (28.5355, 77.3910),
    "Greater Noida Road":         (28.4744, 77.5040),
    "Ghaziabad Road":             (28.6692, 77.4538),
    "Sonipat Road":               (28.9931, 77.0151),
    "Bahadurgarh Road":           (28.6920, 76.9320),
    "Rewari Road":                (28.1900, 76.6200),
    "Meerut Road":                (28.9845, 77.7064),
    "Hapur Road":                 (28.7300, 77.7750),
    "Alwar Road":                 (27.5530, 76.6346),
    "Bhiwadi Road":               (28.2050, 76.8580),
    "Panipat Road":               (29.3909, 76.9635),
    "Rohtak Road Extended":       (28.8955, 76.6066),
    "Palwal Road":                (28.1440, 77.3320),
    "Manesar Road":               (28.3580, 76.9380),
    # ── BANGALORE CORE ───────────────────────────────────────
    "Outer Ring Road Bangalore":  (12.9500, 77.6900),
    "Old Airport Road":           (12.9700, 77.6500),
    "Sarjapur Road":              (12.9100, 77.6800),
    "Hosur Road":                 (12.8900, 77.6200),
    "Tumkur Road":                (13.0500, 77.5200),
    "Bellary Road":               (13.0800, 77.5900),
    "Kanakapura Road":            (12.8700, 77.5600),
    "Magadi Road":                (12.9800, 77.5100),
    "Mysore Road":                (12.9400, 77.5000),
    "NICE Road":                  (12.9000, 77.5500),
    "Whitefield Road":            (12.9800, 77.7500),
    "Marathahalli Bridge":        (12.9590, 77.6974),
    "Silk Board Junction":        (12.9170, 77.6230),
    "Electronic City Flyover":    (12.8450, 77.6600),
    "Hebbal Flyover":             (13.0450, 77.5970),
    "KR Puram Bridge":            (13.0050, 77.6960),
    "Bannerghatta Road":          (12.8600, 77.5970),
    "Hennur Road":                (13.0350, 77.6400),
    "Varthur Road":               (12.9400, 77.7400),
    "Yelahanka Road":             (13.1000, 77.5950),
    "Devanahalli Road":           (13.2500, 77.7100),
    "Hoskote Road":               (13.0700, 77.7980),
    "Airport Road Bangalore":     (13.1986, 77.7066),
    "HAL Airport Road":           (12.9700, 77.6500),
    "Koramangala Road":           (12.9352, 77.6245),
    "BTM Layout Road":            (12.9165, 77.6101),
    "JP Nagar Road":              (12.9063, 77.5857),
    "Banashankari Road":          (12.9250, 77.5500),
    "Jayanagar Road":             (12.9308, 77.5831),
    "Rajajinagar Road":           (12.9900, 77.5550),
    "Yeshwanthpur Road":          (13.0200, 77.5500),
    "Peenya Road":                (13.0280, 77.5200),
    "Jalahalli Road":             (13.0450, 77.5350),
    "MS Ramaiah Road":            (13.0100, 77.5600),
    "Sankey Road":                (13.0050, 77.5800),
    "Queens Road Bangalore":      (12.9900, 77.5950),
    "MG Road Bangalore":          (12.9716, 77.6197),
    "Brigade Road":               (12.9719, 77.6075),
    "Commercial Street Bangalore":(12.9800, 77.6080),
    "Residency Road":             (12.9650, 77.6080),
    "Richmond Road":              (12.9600, 77.6050),
    "Lavelle Road":               (12.9630, 77.6000),
    "Cunningham Road":            (12.9950, 77.5950),
    "Cubbon Road":                (12.9780, 77.5950),
    "Doddaballapur Road":         (13.2940, 77.5370),
    "CV Raman Nagar Road":        (12.9950, 77.6600),
    # ── BANGALORE EXTENDED ───────────────────────────────────
    "Hosur Road Extended":        (12.7400, 77.8200),
    "Tumkur Road Extended":       (13.3400, 77.1015),
    "Kolar Road":                 (13.1360, 78.1294),
    "Ramanagara Road":            (12.7200, 77.2800),
    "Channapatna Road":           (12.6500, 77.2100),
    "Mandya Road":                (12.5220, 76.8950),
    "Nelamangala Road":           (13.0990, 77.3930),
    "Chikkaballapur Road":        (13.4355, 77.7315),
    "Anekal Road":                (12.7100, 77.6950),
    "Vijayapura Road":            (13.1700, 77.7950),
    "Nandi Hills Road":           (13.3700, 77.6830),
    "Krishnagiri Road":           (12.5266, 78.2137),
}


def get_segment_coords(street, locality, city):
    from geocoder import get_coords
    locality_coords = get_coords(locality, city)
    if locality_coords:
        return locality_coords
    coords = ROAD_COORDS.get(street)
    if coords:
        return coords
    for road_name, road_coords in ROAD_COORDS.items():
        if road_name.lower() in street.lower() or street.lower() in road_name.lower():
            return road_coords
    return None


def process_street_risks():
    print("\nProcessing street-level risk data...")
    rows = get_street_incidents()
    processed = {}
    matched = 0
    skipped = 0

    for streets_json, locality, city, severity in rows:
        streets = json.loads(streets_json)
        score = SEVERITY_SCORE.get(severity, 1)

        for street in streets:
            key = f"{street}_{locality}_{city}"
            coords = get_segment_coords(street, locality, city)

            if coords:
                if key not in processed:
                    processed[key] = (street, locality, city, coords, score)
                else:
                    existing = processed[key]
                    processed[key] = (street, locality, city, coords, existing[4] + score)
                matched += 1
            else:
                skipped += 1

    for key, (street, locality, city, coords, total_score) in processed.items():
        lat, lng = coords
        save_street_risk(street, locality, city, lat, lng, total_score)
        print(f"  Segment: {street} @ {locality} -> ({lat:.4f}, {lng:.4f}) score:{total_score}")

    print(f"Streets done. {matched} matched, {skipped} skipped.")