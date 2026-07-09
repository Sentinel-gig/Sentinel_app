// ─── services/peerMesh.js ─────────────────────────────────────────────────────
// Peer mesh network — nearby workers ko SOS alert bhejo
// Flow:
//   Worker SOS trigger → peer_alerts table mein insert
//   Supabase Realtime → nearby workers ke app mein instantly dikh jaata hai
//   Distance filter: 500m radius, active shift wale workers only

import { supabase } from "../utils/supabase";

const ALERT_RADIUS_KM = 0.5; // 500 meters

let realtimeChannel = null;
let _onAlert = null;
let _currentWorker = null;

// Haversine formula — distance in km
function getDistanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Subscribe to peer alerts — call karo shift start pe
export function subscribePeerAlerts({
  worker,
  currentLat,
  currentLng,
  onAlert,
}) {
  _onAlert = onAlert;
  _currentWorker = worker;

  // Unsubscribe pehle wala
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }

  realtimeChannel = supabase
    .channel("peer_alerts")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "peer_alerts",
      },
      (payload) => {
        const alert = payload.new;

        // Apna alert ignore karo
        if (alert.worker_id === worker.id) return;

        // Distance check — sirf 500m ke andar wale alerts
        if (alert.lat && alert.lng && currentLat && currentLng) {
          const dist = getDistanceKm(
            currentLat,
            currentLng,
            alert.lat,
            alert.lng,
          );
          if (dist > ALERT_RADIUS_KM) return;
          alert.distanceM = Math.round(dist * 1000);
        }

        if (_onAlert) _onAlert(alert);
      },
    )
    .subscribe();
}

// Location update karo — jab worker move kare
export function updatePeerLocation(lat, lng) {
  // Realtime channel mein location update — future use
  // Abhi sirf subscribe karte waqt location use hoti hai
}

// Send SOS alert to nearby workers
export async function sendPeerAlert({ worker, lat, lng, city, type = "sos" }) {
  try {
    const message =
      type === "crash"
        ? `${worker.name} ka crash hua hai — madad chahiye!`
        : `${worker.name} ne SOS bheja hai — nearby workers alert!`;

    await supabase.from("peer_alerts").insert([
      {
        worker_id: worker.id,
        worker_name: worker.name,
        type,
        lat,
        lng,
        city,
        message,
      },
    ]);

    console.log("Peer alert sent");
    return true;
  } catch (e) {
    console.log("Peer alert error:", e.message);
    return false;
  }
}

// Unsubscribe — shift end pe
export function unsubscribePeerAlerts() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
    realtimeChannel = null;
  }
  _onAlert = null;
  _currentWorker = null;
}
