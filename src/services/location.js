// ─── services/location.js ────────────────────────────────────────────────────
// Handles GPS tracking using expo-location.
// startTracking() → begins background location updates → calls callback with {lat, lng}
// stopTracking()  → cleans up subscription

import * as Location from 'expo-location';

let locationSub = null;

export async function requestLocationPermission() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') throw new Error('Location permission denied');
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === 'granted';
}

export async function getCurrentLocation() {
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
}

export async function startTracking(onUpdate) {
  locationSub = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 10000, distanceInterval: 20 },
    (loc) => onUpdate({ latitude: loc.coords.latitude, longitude: loc.coords.longitude, speed: loc.coords.speed })
  );
}

export function stopTracking() {
  if (locationSub) { locationSub.remove(); locationSub = null; }
}
