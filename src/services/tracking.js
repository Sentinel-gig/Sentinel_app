// ─── services/tracking.js ────────────────────────────────────────────────────
// Passive data collection during active shift.
// Collects: location, speed, heading, harsh braking, rapid acceleration,
// risk zone crossings — all silent, no UI interaction needed.
// Pushes to Supabase driver_tracking + updates workers table live location.
// On shift end, calculates driver score and saves to driver_scores.

import { supabase } from "../utils/supabase";
import * as Location from "expo-location";
import { Accelerometer } from "expo-sensors";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Tuning constants ──────────────────────────────────────────────────────────
const LOCATION_INTERVAL_MS = 15000; // log location every 15s during shift
const ACCEL_INTERVAL_MS = 200; // accelerometer poll rate
const HARSH_BRAKE_THRESHOLD = 2.8; // G-force drop = hard brake
const RAPID_ACCEL_THRESHOLD = 2.5; // G-force spike = rapid acceleration
const MIN_SPEED_KMPH = 5; // ignore events below this speed (walking)
const RISK_CHECK_INTERVAL = 30000; // check risk zone every 30s

// ── State ─────────────────────────────────────────────────────────────────────
let _locationSub = null;
let _accelSub = null;
let _riskTimer = null;
let _shiftId = null;
let _worker = null;
let _cityZones = []; // passed in from RouteMapScreen / store
let _lastLocation = null;
let _lastMagnitude = null;
let _sessionStats = {
  totalDistance: 0,
  maxSpeed: 0,
  speedReadings: [],
  harshBrakes: 0,
  rapidAccels: 0,
  riskZoneCrossings: 0,
  criticalZoneSeconds: 0,
  lastZone: null,
  lastZoneEnteredAt: null,
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Call when driver starts shift.
 * @param {object} worker   — { id, name, employer_id, ... } from useAppStore
 * @param {array}  zones    — cityZones from map data (lat, lng, label, locality)
 */
export async function startTracking(worker, zones = []) {
  if (_locationSub) return; // already running

  _worker = worker;
  _cityZones = zones;
  _shiftId = new Date().toISOString(); // unique per shift
  _sessionStats = {
    totalDistance: 0,
    maxSpeed: 0,
    speedReadings: [],
    harshBrakes: 0,
    rapidAccels: 0,
    riskZoneCrossings: 0,
    criticalZoneSeconds: 0,
    lastZone: null,
    lastZoneEnteredAt: null,
  };

  await AsyncStorage.setItem("current_shift_id", _shiftId);

  // Background location tracking
  const { status } = await Location.requestBackgroundPermissionsAsync();
  if (status !== "granted") {
    // Fall back to foreground-only tracking
    console.log("Tracking: background permission denied, using foreground");
  }

  _locationSub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: LOCATION_INTERVAL_MS,
      distanceInterval: 50, // also trigger every 50m movement
    },
    _handleLocationUpdate,
  );

  // Accelerometer for driving behavior
  Accelerometer.setUpdateInterval(ACCEL_INTERVAL_MS);
  _accelSub = Accelerometer.addListener(_handleAccelerometer);

  // Periodic risk zone check
  _riskTimer = setInterval(_checkRiskZone, RISK_CHECK_INTERVAL);

  console.log("Tracking: started, shiftId:", _shiftId);
}

/**
 * Call when driver ends shift.
 * Returns the calculated driver score for this shift.
 */
export async function stopTracking() {
  if (_locationSub) {
    _locationSub.remove();
    _locationSub = null;
  }
  if (_accelSub) {
    _accelSub.remove();
    _accelSub = null;
  }
  if (_riskTimer) {
    clearInterval(_riskTimer);
    _riskTimer = null;
  }

  const score = await _calculateAndSaveScore();
  await AsyncStorage.removeItem("current_shift_id");

  console.log("Tracking: stopped, score:", score);
  return score;
}

/**
 * Update city zones when map data loads.
 * Call this from RouteMapScreen after mapData is received.
 */
export function updateZones(zones) {
  _cityZones = zones || [];
}

// ── Location handler ──────────────────────────────────────────────────────────

async function _handleLocationUpdate(loc) {
  const {
    latitude: lat,
    longitude: lng,
    speed,
    heading,
    accuracy,
  } = loc.coords;
  const speedKmph = speed != null ? speed * 3.6 : 0; // m/s → km/h

  // Update distance
  if (_lastLocation) {
    const dist = _haversine(_lastLocation.lat, _lastLocation.lng, lat, lng);
    _sessionStats.totalDistance += dist;
  }

  // Update speed stats
  if (speedKmph > 0) _sessionStats.speedReadings.push(speedKmph);
  if (speedKmph > _sessionStats.maxSpeed) _sessionStats.maxSpeed = speedKmph;

  _lastLocation = { lat, lng };

  // Save last known location for SOS offline fallback
  await AsyncStorage.setItem("last_location", JSON.stringify({ lat, lng }));

  // Find current risk zone
  const zone = _getNearestZone(lat, lng);

  // Log to Supabase
  const record = {
    worker_id: _worker.id,
    worker_name: _worker.name,
    employer_id: _worker.employer_id || _worker.employer_id || null,
    lat,
    lng,
    speed: parseFloat(speedKmph.toFixed(1)),
    heading: heading || 0,
    accuracy: accuracy || 0,
    event_type: "location",
    risk_zone: zone?.label || null,
    risk_locality: zone?.locality || null,
    shift_id: _shiftId,
  };

  _insertTracking(record);

  // Update worker's live location in workers table (for admin portal live map)
  _updateWorkerLiveLocation(lat, lng, speedKmph);
}

// ── Accelerometer handler ─────────────────────────────────────────────────────

function _handleAccelerometer({ x, y, z }) {
  const magnitude = Math.sqrt(x * x + y * y + z * z);
  const currentSpeed = _sessionStats.speedReadings.slice(-1)[0] || 0;

  if (currentSpeed < MIN_SPEED_KMPH) {
    _lastMagnitude = magnitude;
    return; // ignore events when nearly stationary
  }

  if (_lastMagnitude !== null) {
    const delta = magnitude - _lastMagnitude;

    if (delta < -HARSH_BRAKE_THRESHOLD) {
      // Sudden deceleration = harsh braking
      _sessionStats.harshBrakes++;
      _insertTracking({
        worker_id: _worker.id,
        worker_name: _worker.name,
        employer_id: _worker.employer_id || null,
        lat: _lastLocation?.lat || null,
        lng: _lastLocation?.lng || null,
        speed: currentSpeed,
        event_type: "harsh_brake",
        shift_id: _shiftId,
      });
    } else if (delta > RAPID_ACCEL_THRESHOLD) {
      // Sudden acceleration
      _sessionStats.rapidAccels++;
      _insertTracking({
        worker_id: _worker.id,
        worker_name: _worker.name,
        employer_id: _worker.employer_id || null,
        lat: _lastLocation?.lat || null,
        lng: _lastLocation?.lng || null,
        speed: currentSpeed,
        event_type: "rapid_accel",
        shift_id: _shiftId,
      });
    }
  }

  _lastMagnitude = magnitude;
}

// ── Risk zone tracking ────────────────────────────────────────────────────────

function _checkRiskZone() {
  if (!_lastLocation) return;
  const { lat, lng } = _lastLocation;
  const zone = _getNearestZone(lat, lng);
  const label = zone?.label || "SAFE";

  if (label !== _sessionStats.lastZone) {
    // Entered a new zone
    if (_sessionStats.lastZone && label !== _sessionStats.lastZone) {
      _sessionStats.riskZoneCrossings++;
    }

    // Track time in CRITICAL zone
    if (
      _sessionStats.lastZone === "CRITICAL" &&
      _sessionStats.lastZoneEnteredAt
    ) {
      const seconds = (Date.now() - _sessionStats.lastZoneEnteredAt) / 1000;
      _sessionStats.criticalZoneSeconds += seconds;
    }

    _sessionStats.lastZone = label;
    _sessionStats.lastZoneEnteredAt = Date.now();

    // Log zone crossing event
    if (zone && label !== "SAFE") {
      _insertTracking({
        worker_id: _worker.id,
        worker_name: _worker.name,
        employer_id: _worker.employer_id || null,
        lat,
        lng,
        event_type: "risk_zone",
        risk_zone: label,
        risk_locality: zone.locality,
        shift_id: _shiftId,
      });
    }
  }
}

// ── Score calculation ─────────────────────────────────────────────────────────

async function _calculateAndSaveScore() {
  const s = _sessionStats;

  const avgSpeed = s.speedReadings.length
    ? s.speedReadings.reduce((a, b) => a + b, 0) / s.speedReadings.length
    : 0;

  // Score starts at 100, deductions per bad event
  let score = 100;
  score -= s.harshBrakes * 5; // -5 per harsh brake
  score -= s.rapidAccels * 3; // -3 per rapid accel
  score -= s.riskZoneCrossings * 2; // -2 per risk zone crossing
  score -= Math.floor(s.criticalZoneSeconds / 60) * 3; // -3 per min in CRITICAL
  if (avgSpeed > 80) score -= 10; // penalty for avg speed > 80km/h
  score = Math.max(0, Math.min(100, score));

  const rating = score >= 80 ? "SAFE" : score >= 60 ? "MODERATE" : "RISKY";

  const scoreRecord = {
    worker_id: _worker.id,
    worker_name: _worker.name,
    employer_id: _worker.employer_id || null,
    shift_id: _shiftId,
    shift_start: _shiftId,
    shift_end: new Date().toISOString(),
    total_distance: parseFloat(s.totalDistance.toFixed(2)),
    avg_speed: parseFloat(avgSpeed.toFixed(1)),
    max_speed: parseFloat(s.maxSpeed.toFixed(1)),
    harsh_brakes: s.harshBrakes,
    rapid_accels: s.rapidAccels,
    risk_zone_crossings: s.riskZoneCrossings,
    critical_zone_time: Math.round(s.criticalZoneSeconds),
    score,
    rating,
  };

  try {
    await supabase.from("driver_scores").insert([scoreRecord]);
  } catch (e) {
    // Queue offline
    const q = (await AsyncStorage.getItem("score_queue")) || "[]";
    const arr = JSON.parse(q);
    arr.push(scoreRecord);
    await AsyncStorage.setItem("score_queue", JSON.stringify(arr));
  }

  return scoreRecord;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _getNearestZone(lat, lng) {
  if (!_cityZones.length) return null;
  let nearest = null,
    bestDist = 0.05; // ~5km max
  for (const z of _cityZones) {
    const d = Math.sqrt((lat - z.lat) ** 2 + (lng - z.lng) ** 2);
    if (d < bestDist) {
      bestDist = d;
      nearest = z;
    }
  }
  return nearest;
}

function _haversine(lat1, lng1, lat2, lng2) {
  // Returns distance in km
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function _insertTracking(record) {
  try {
    await supabase.from("driver_tracking").insert([record]);
  } catch (e) {
    // Silently fail — non-critical, don't interrupt shift
  }
}

async function _updateWorkerLiveLocation(lat, lng, speed) {
  try {
    await supabase
      .from("workers")
      .update({
        current_lat: lat,
        current_lng: lng,
        current_speed: parseFloat(speed.toFixed(1)),
        last_location_at: new Date().toISOString(),
        shift_active: true,
      })
      .eq("id", _worker.id);
  } catch (e) {
    // Silent fail
  }
}

// Sync queued scores when back online
export async function syncScoreQueue() {
  try {
    const q = await AsyncStorage.getItem("score_queue");
    if (!q) return;
    const arr = JSON.parse(q);
    if (!arr.length) return;
    for (const record of arr) {
      await supabase.from("driver_scores").insert([record]);
    }
    await AsyncStorage.removeItem("score_queue");
    console.log(`Synced ${arr.length} queued scores`);
  } catch (e) {}
}
