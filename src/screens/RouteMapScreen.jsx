import { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { WebView } from "react-native-webview";
import { useNavigation } from "@react-navigation/native";
import mapHtml from "../utils/mapHtml";
import TopBar from "../components/TopBar";
import { SafeAreaView } from "react-native-safe-area-context";
import BottomNav from "../components/BottomNav";
import { COLORS } from "../utils/constants";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import useAppStore from "../store/useAppStore";

const CITY_DATA = {
  kanpur: require("../../assets/city_data/kanpur.json"),
  mumbai: require("../../assets/city_data/mumbai.json"),
  delhi: require("../../assets/city_data/delhi.json"),
  bangalore: require("../../assets/city_data/bangalore.json"),
};

const CITY_CENTERS = {
  mumbai: { lat: 19.076, lng: 72.8777 },
  delhi: { lat: 28.6139, lng: 77.209 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  kanpur: { lat: 26.4499, lng: 80.3319 },
};

const GCS_BASE = "https://storage.googleapis.com/sentinel-map-data/city_data";
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

// How often to refresh 1km live nearby while screen is open
const NEARBY_REFRESH_MS = 90_000; // 90s — avoids hammering Overpass via backend

const ROUTE_CONFIG = [
  { type: "safe", label: "Safest Route", badge: "SAFE", color: "#22C55E" },
  { type: "balanced", label: "Balanced", badge: "MIX", color: "#F59E0B" },
  { type: "fast", label: "Fastest Route", badge: "FAST", color: "#EF4444" },
];

export default function RouteMapScreen() {
  const nav = useNavigation();
  const webviewRef = useRef(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapFullscreen, setMapFullscreen] = useState(false);
  const [selected, setSelected] = useState(null);

  // Search
  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [destCoords, setDestCoords] = useState(null);
  const [destLabel, setDestLabel] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);

  const { setCityZones } = useAppStore();

  // Routes
  const [routeResults, setRouteResults] = useState([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");
  const [userCoords, setUserCoords] = useState(null);
  const [cityZones, setCityZonesLocal] = useState([]);

  // Nearby mode: "live" = 1km radius around user, "corridor" = along active route
  const [nearbyMode, setNearbyMode] = useState("live");
  const nearbyTimerRef = useRef(null);
  const userCoordsRef = useRef(null); // stable ref for timer callback

  useEffect(() => {
    if (!mapReady) return;
    setTimeout(() => loadCityData(), 1000);
  }, [mapReady]);

  // Keep ref in sync so the interval always has fresh coords
  useEffect(() => {
    userCoordsRef.current = userCoords;
  }, [userCoords]);

  // 90s refresh timer — only starts AFTER loadCityData has already done the first fetch
  // Does NOT call fetchLiveNearby on mount (loadCityData handles that)
  useEffect(() => {
    if (!userCoords || nearbyMode !== "live") return;
    // Skip first run — loadCityData already fetched on mount
    const timer = setInterval(() => {
      const c = userCoordsRef.current;
      if (c)
        fetchLiveNearby(c.lat, c.lng)
          .then((locs) => {
            if (locs && locs.length > 0) {
              sendToMap({ type: "nearbyData", data: locs });
            }
          })
          .catch(() => {});
    }, NEARBY_REFRESH_MS);
    nearbyTimerRef.current = timer;
    return () => clearInterval(timer);
  }, [userCoords?.lat, userCoords?.lng, nearbyMode]);

  const detectCity = (lat, lng) => {
    let nearest = "kanpur",
      minDist = Infinity;
    for (const [city, coords] of Object.entries(CITY_CENTERS)) {
      const dist = Math.sqrt((lat - coords.lat) ** 2 + (lng - coords.lng) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = city;
      }
    }
    return nearest;
  };

  const loadCityData = async () => {
    console.log("LCD: start");
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log("LCD: location permission:", status);
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      const { latitude: lat, longitude: lng } = loc.coords;
      console.log("LCD: got coords", lat, lng);

      setUserCoords({ lat, lng });
      sendToMap({ type: "setLocation", lat, lng });
      console.log("LCD: setLocation sent");

      const city = detectCity(lat, lng);

      // Cache version — bump this string to force-clear all stale cached map data
      const CACHE_VERSION = "v3";
      const cacheKey = `map_data_${city}_${CACHE_VERSION}`;
      const cacheTimeKey = `map_data_time_${city}_${CACHE_VERSION}`;

      const cached = await AsyncStorage.getItem(cacheKey);
      const data = cached ? JSON.parse(cached) : CITY_DATA[city];
      sendToMap({ type: "mapData", data });
      console.log("LCD: mapData sent, zones:", data?.zones?.length);
      if (data.zones) {
        setCityZonesLocal(data.zones);
        setCityZones(data.zones);
      }

      try {
        const lastFetch = await AsyncStorage.getItem(cacheTimeKey);
        const TWELVE_HRS = 12 * 60 * 60 * 1000;
        if (!lastFetch || Date.now() - parseInt(lastFetch) > TWELVE_HRS) {
          const res = await fetch(`${GCS_BASE}/${city}.json`);
          const fresh = await res.json();
          await AsyncStorage.setItem(cacheKey, JSON.stringify(fresh));
          await AsyncStorage.setItem(cacheTimeKey, Date.now().toString());
          sendToMap({ type: "mapData", data: fresh });
          if (fresh.zones) {
            setCityZonesLocal(fresh.zones);
            setCityZones(fresh.zones);
          }
        }
      } catch (e) {}

      // ── Nearby: offline-first ──────────────────────────────────────────────
      // 1. Show cached nearby instantly (if exists) — user sees something immediately
      // 2. Try Overpass live fetch in background
      // 3. If Overpass succeeds → update cache + refresh map
      // 4. If Overpass fails (low network) → keep showing cached data, no error
      const nearbyCacheKey = `nearby_${city}_v2`;
      const cachedNearby = await AsyncStorage.getItem(nearbyCacheKey);
      if (cachedNearby) {
        // Show stale cache immediately while live fetch runs
        sendToMap({ type: "nearbyData", data: JSON.parse(cachedNearby) });
      }

      try {
        const fresh = await fetchLiveNearby(lat, lng);
        if (fresh && fresh.length > 0) {
          // Save fresh data for next offline session
          await AsyncStorage.setItem(nearbyCacheKey, JSON.stringify(fresh));
          sendToMap({ type: "nearbyData", data: fresh });
        }
      } catch (_) {
        // Network unavailable — cached data already rendered above, nothing to do
        console.log("Nearby: using cached data (Overpass unreachable)");
      }
    } catch (e) {
      console.log("loadCityData error:", e.message);
    }
  };

  // ── Live 1km nearby — direct Overpass, no backend needed ────────────────
  // Overpass query fetches all safety-relevant amenities within radius metres.
  const fetchLiveNearby = async (lat, lng, radius = 1000) => {
    const ICON_MAP = {
      Hospital: "🏥",
      Clinic: "🏥",
      Police: "🚔",
      "Petrol Pump": "⛽",
      Pharmacy: "💊",
      ATM: "🏧",
    };

    // Try 1: GCP VM live endpoint (best — radius-accurate)
    try {
      const res = await fetch(
        `http://34.93.176.62:8000/routes/nearby?lat=${lat}&lng=${lng}&radius=${radius}`,
        { signal: AbortSignal.timeout(6000) },
      );
      if (res.ok) {
        const data = await res.json();
        const locs = (data.locations || []).map((l) => ({
          ...l,
          icon: ICON_MAP[l.type] || "📍",
        }));
        if (locs.length > 0) return locs;
      }
    } catch (_) {}

    // Try 2: GCS static nearby JSON (generated by VM cron, always fresh enough)
    try {
      const city = detectCity(lat, lng);
      const res = await fetch(`${GCS_BASE}/${city}_nearby.json`, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        return data.locations || [];
      }
    } catch (_) {}

    return []; // offline — cached data already on map from loadCityData
  };

  // ── Corridor nearby — Overpass along route polyline ───────────────────────
  // Samples route coords, queries Overpass around each sample, deduplicates.
  const fetchCorridorNearby = async (routeCoords) => {
    // Sample every ~1km: take at most 10 points spread across the route
    const SAMPLE_COUNT = Math.min(10, routeCoords.length);
    const step = Math.max(1, Math.floor(routeCoords.length / SAMPLE_COUNT));
    const sampled = routeCoords.filter((_, i) => i % step === 0);

    const seen = new Set();
    const all = [];

    for (const [lat, lng] of sampled) {
      try {
        const locs = await fetchLiveNearby(lat, lng, 500);
        for (const loc of locs) {
          const key = `${loc.name}|${loc.type}`;
          if (!seen.has(key)) {
            seen.add(key);
            all.push(loc);
          }
        }
        // Small gap between samples to avoid Overpass rate limiting
        await new Promise((r) => setTimeout(r, 400));
      } catch (_) {}
    }

    if (all.length) {
      setNearbyMode("corridor");
      sendToMap({ type: "nearbyData", data: all });
    }
  };

  // ── SOS nearby — hospitals + police only, 1km, force-visible ─────────────
  const fetchSosNearby = async (lat, lng) => {
    try {
      // Use VM endpoint — filtered to SOS amenities only
      const res = await fetch(
        `http://34.93.176.62:8000/routes/nearby?lat=${lat}&lng=${lng}&radius=1000`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!res.ok) return;
      const data = await res.json();
      const SOS_TYPES = ["Hospital", "Clinic", "Police"];
      const locations = (data.locations || [])
        .filter((l) => SOS_TYPES.includes(l.type))
        .map((l) => ({ ...l, icon: l.type === "Police" ? "🚔" : "🏥" }));
      if (locations.length) sendToMap({ type: "sosNearby", data: locations });
    } catch (_) {}
  };

  // Debounce ref — cancels in-flight search if user keeps typing
  const searchDebounceRef = useRef(null);

  const handleSearchChange = (text) => {
    setSearchText(text);
    setDestCoords(null);
    setRouteError("");

    // Direct coordinate input — no search needed
    const coordMatch = text.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      setDestCoords({
        lat: parseFloat(coordMatch[1]),
        lng: parseFloat(coordMatch[2]),
      });
      setDestLabel(text);
      setSuggestions([]);
      setShowSuggest(false);
      return;
    }

    if (text.length < 3) {
      setSuggestions([]);
      setShowSuggest(false);
      return;
    }

    // Debounce: wait 400ms after user stops typing before firing
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => fetchSuggestions(text), 400);
  };

  const fetchSuggestions = async (text) => {
    try {
      // viewbox biases results toward the user's current city
      const center = userCoords || { lat: 26.4499, lng: 80.3319 };
      const delta = 2.0; // ~200km box
      const viewbox = [
        center.lng - delta,
        center.lat + delta,
        center.lng + delta,
        center.lat - delta,
      ].join(",");

      const url =
        `${NOMINATIM}?q=${encodeURIComponent(text)}` +
        `&format=json&limit=5&countrycodes=in` +
        `&viewbox=${viewbox}&bounded=0` +
        `&accept-language=en`;

      const res = await fetch(url, {
        headers: {
          // Nominatim ToS requires a valid User-Agent — missing this = silent block
          "User-Agent": "SentinelSafetyApp/1.0 (contact@sentinelco.in)",
          "Accept-Language": "en",
        },
      });

      if (!res.ok) {
        console.log("Nominatim error:", res.status);
        return;
      }

      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setSuggestions([]);
        setShowSuggest(false);
        return;
      }

      setSuggestions(
        data.map((r) => ({
          name: r.display_name.split(",").slice(0, 3).join(", "),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        })),
      );
      setShowSuggest(true);
    } catch (e) {
      console.log("Nominatim fetch failed:", e.message);
    }
  };

  const selectSuggestion = (item) => {
    setSearchText(item.name);
    setDestLabel(item.name);
    setDestCoords({ lat: item.lat, lng: item.lng });
    setSuggestions([]);
    setShowSuggest(false);
  };

  const scoreRoute = (coords) => {
    let score = 0;
    const warned = new Set();
    coords.forEach(([lng, lat]) => {
      cityZones.forEach((z) => {
        if (warned.has(z.locality)) return;
        const dist = Math.sqrt((lat - z.lat) ** 2 + (lng - z.lng) ** 2);
        if (dist < 0.015) {
          score +=
            z.label === "CRITICAL"
              ? 30
              : z.label === "HIGH"
                ? 20
                : z.label === "MODERATE"
                  ? 10
                  : 2;
          warned.add(z.locality);
        }
      });
    });
    return { score, warnings: [...warned] };
  };

  const findRoutes = async () => {
    if (!destCoords) {
      setRouteError("Please select a destination");
      return;
    }
    if (!userCoords) {
      setRouteError("Location unavailable");
      return;
    }

    setRouteLoading(true);
    setRouteError("");
    setRouteResults([]);

    try {
      const { lat: sLat, lng: sLng } = userCoords;
      const { lat: eLat, lng: eLng } = destCoords;

      const res = await fetch(
        `${OSRM_BASE}/${sLng},${sLat};${eLng},${eLat}?alternatives=3&geometries=geojson&overview=full`,
      );
      const data = await res.json();

      if (!data.routes?.length) {
        setRouteError("No routes found");
        return;
      }

      const scored = data.routes
        .map((r, i) => {
          const { score, warnings } = scoreRoute(r.geometry.coordinates);
          return {
            index: i,
            coords: r.geometry.coordinates,
            score,
            warnings,
            distance: (r.distance / 1000).toFixed(1),
            duration: Math.round(r.duration / 60),
          };
        })
        .sort((a, b) => a.score - b.score);

      const tagged = scored.map((r, i) => ({
        ...r,
        type: ROUTE_CONFIG[i]?.type || "fast",
        color: ROUTE_CONFIG[i]?.color || "#EF4444",
        label: ROUTE_CONFIG[i]?.label || "Fastest Route",
        badge: ROUTE_CONFIG[i]?.badge || "FAST",
      }));

      setRouteResults(tagged);

      // Auto-draw all routes on map immediately — don't wait for arrow press.
      // Pre-select the safest route (index 0 after sort).
      const leafletRoutes = tagged.map((r, i) => ({
        type: r.type,
        coords: r.coords.map(([lng, lat]) => [lat, lng]),
        selected: i === 0,
      }));
      sendToMap({
        type: "drawRoutes",
        origin: [sLat, sLng],
        destination: [eLat, eLng],
        routes: leafletRoutes,
      });
      // Auto-select safest
      setSelected(tagged[0]?.type || null);
    } catch (e) {
      setRouteError("Failed to fetch routes");
    } finally {
      setRouteLoading(false);
    }
  };

  const navigateRoute = (route) => {
    setSelected(route.type);
    // Convert coords for map (OSRM returns [lng,lat], Leaflet wants [lat,lng])
    const leafletCoords = route.coords.map(([lng, lat]) => [lat, lng]);
    sendToMap({
      type: "drawRoutes",
      origin: [userCoords.lat, userCoords.lng],
      destination: [destCoords.lat, destCoords.lng],
      routes: routeResults.map((r) => ({
        type: r.type,
        coords: r.coords.map(([lng, lat]) => [lat, lng]),
        selected: r.type === route.type,
      })),
    });
    setMapFullscreen(true);
    sendToMap({ type: "toggleFullscreen", value: true });

    // Switch nearby layer to corridor mode for this route
    clearInterval(nearbyTimerRef.current);
    fetchCorridorNearby(leafletCoords);
  };

  // Reset nearby back to live 1km mode when user exits route/clears destination
  const resetToLiveNearby = () => {
    setNearbyMode("live");
    setRouteResults([]);
    setSelected(null);
    setDestCoords(null);
    setDestLabel("");
    setSearchText("");
    if (userCoords) fetchLiveNearby(userCoords.lat, userCoords.lng);
  };

  const sendToMap = (data) => {
    if (!webviewRef.current) return;
    webviewRef.current.injectJavaScript(
      `window.receiveMessage && window.receiveMessage(${JSON.stringify(JSON.stringify(data))}); true;`,
    );
  };

  const handleMessage = (e) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data);
      if (msg.type === "mapInit") console.log("WV: map initialized OK");
      if (msg.type === "mapError")
        console.log("WV MAP ERROR:", msg.msg, "line:", msg.line);
      if (msg.type === "toggleFullscreen") setMapFullscreen(msg.value);
      // Crash detection / SOS service posts this to trigger priority nearby fetch
      if (msg.type === "sosAlert" && msg.lat && msg.lng) {
        fetchSosNearby(msg.lat, msg.lng);
      }
    } catch (_) {}
  };

  return (
    <SafeAreaView style={s.screen}>
      <TopBar />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          style={s.back}
          onPress={() =>
            mapFullscreen ? setMapFullscreen(false) : nav.goBack()
          }
        >
          <Text style={s.backText}>←</Text>
        </TouchableOpacity>
        <Text style={s.title}>Safe Routes</Text>
        <View style={s.searchWrap}>
          <TextInput
            style={s.searchInput}
            placeholder="Search destination..."
            placeholderTextColor={COLORS.text3}
            value={searchText}
            onChangeText={handleSearchChange}
            onSubmitEditing={findRoutes}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={s.goBtn}
            onPress={findRoutes}
            disabled={routeLoading}
          >
            {routeLoading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <Text style={s.goBtnText}>Go</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Suggestions */}
      {showSuggest && suggestions.length > 0 && (
        <View style={s.suggestions}>
          {suggestions.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={s.sugItem}
              onPress={() => selectSuggestion(item)}
            >
              <Text style={s.sugText} numberOfLines={1}>
                📍 {item.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {routeError ? <Text style={s.routeError}>{routeError}</Text> : null}

      {/* Map */}
      <View
        style={[
          s.mapWrap,
          mapFullscreen && {
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            margin: 0,
            borderRadius: 0,
            zIndex: 999,
          },
        ]}
      >
        {mapFullscreen && (
          <TouchableOpacity
            style={s.exitFullscreen}
            onPress={() => setMapFullscreen(false)}
          >
            <Text style={s.exitFullscreenText}>✕ Exit</Text>
          </TouchableOpacity>
        )}
        <WebView
          ref={webviewRef}
          source={{ html: mapHtml }}
          style={s.map}
          onLoadEnd={() => {
            console.log("WV: onLoadEnd fired");
            setMapReady(true);
          }}
          onError={(e) =>
            console.log("WV ERROR:", JSON.stringify(e.nativeEvent))
          }
          onHttpError={(e) =>
            console.log("WV HTTP ERROR:", e.nativeEvent.statusCode)
          }
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={["*"]}
          mixedContentMode="always"
        />
      </View>

      {/* Route Cards */}
      {!mapFullscreen && (
        <View style={s.routeList}>
          <Text style={s.secLabel}>Choose your route</Text>
          {routeResults.length > 0
            ? routeResults.map((r) => (
                <TouchableOpacity
                  key={r.type}
                  style={[
                    s.rcard,
                    selected === r.type && { borderColor: r.color },
                  ]}
                  onPress={() => setSelected(r.type)}
                  activeOpacity={0.8}
                >
                  <View style={[s.rbar, { backgroundColor: r.color }]} />
                  <View style={s.rinfo}>
                    <Text style={s.rname}>{r.label}</Text>
                    <Text style={s.rmeta}>
                      {r.distance} km · {r.duration} min
                      {r.warnings.length > 0
                        ? ` · ⚠️ ${r.warnings.slice(0, 1).join("")}`
                        : " · Low risk zone"}
                    </Text>
                  </View>
                  <View style={[s.rbadge, { backgroundColor: r.color + "22" }]}>
                    <Text style={[s.rbadgeText, { color: r.color }]}>
                      {r.badge}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={s.arrowBtn}
                    onPress={() => navigateRoute(r)}
                  >
                    <Text style={s.arrowText}>›</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            : ROUTE_CONFIG.map((r) => (
                <View key={r.type} style={s.rcard}>
                  <View style={[s.rbar, { backgroundColor: r.color }]} />
                  <View style={s.rinfo}>
                    <Text style={s.rname}>{r.label}</Text>
                    <Text style={s.rmeta}>
                      Search a destination to see routes
                    </Text>
                  </View>
                  <View style={[s.rbadge, { backgroundColor: r.color + "22" }]}>
                    <Text style={[s.rbadgeText, { color: r.color }]}>
                      {r.badge}
                    </Text>
                  </View>
                </View>
              ))}
        </View>
      )}

      {!mapFullscreen && (
        <BottomNav
          activeTab="..."
          onTabPress={(id) => {
            const map = {
              home: "Dashboard",
              map: "Routes",
              report: "Report",
              activity: "Activity",
              more: "More",
            };
            if (map[id]) nav.navigate(map[id]);
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  back: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: { color: COLORS.text2, fontSize: 16 },
  title: { color: COLORS.text1, fontSize: 18, fontWeight: "800" },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    height: 40,
    paddingLeft: 12,
    gap: 0,
    overflow: "hidden",
  },
  searchInput: { flex: 1, color: COLORS.text1, fontSize: 13, height: 40 },
  goBtn: {
    backgroundColor: "#2563EB",
    width: 44,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  goBtnText: { color: "white", fontSize: 13, fontWeight: "700" },
  suggestions: {
    marginHorizontal: 16,
    backgroundColor: COLORS.bg2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    overflow: "hidden",
    zIndex: 99,
  },
  sugItem: { padding: 12, borderBottomWidth: 1, borderColor: COLORS.border },
  sugText: { color: COLORS.text2, fontSize: 12 },
  routeError: {
    color: "#EF4444",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  mapWrap: {
    flex: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  map: { flex: 1, backgroundColor: COLORS.bg },
  exitFullscreen: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 999,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  exitFullscreenText: { color: "white", fontSize: 13, fontWeight: "700" },
  routeList: { paddingHorizontal: 16, paddingBottom: 4 },
  secLabel: {
    color: COLORS.text3,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 8,
  },
  rcard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 6,
  },
  rbar: { width: 4, height: 36, borderRadius: 2 },
  rinfo: { flex: 1 },
  rname: { color: COLORS.text1, fontSize: 13, fontWeight: "700" },
  rmeta: { color: COLORS.text3, fontSize: 11, marginTop: 2 },
  rbadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  rbadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  arrowBtn: {
    width: 32,
    height: 32,
    backgroundColor: COLORS.bg2,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  arrowText: { color: COLORS.text1, fontSize: 18, fontWeight: "700" },
});
