// ─── services/sos.js ─────────────────────────────────────────────────────────
// SOS escalation ladder:
//   Level 1 → Supabase pe SOS log karo + nearby workers ko alert
//   Level 2 → Trusted contacts ko SMS (future: Twilio)
//   Level 3 → 112 ERSS API
// Works offline too — queues if no network, syncs when back online

import { supabase } from "../utils/supabase";
import * as Location from "expo-location";
import { sendPeerAlert } from "./peerMesh";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ERSS_API = "https://erss.nic.in/api/v1/sos"; // 112 India API endpoint

export async function triggerSOS({
  workerId,
  workerName,
  workerPhone,
  type = "crash",
}) {
  try {
    // 1. Get current location
    let lat = null,
      lng = null;
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      lat = loc.coords.latitude;
      lng = loc.coords.longitude;
    } catch (e) {
      // Use last known location from AsyncStorage
      const lastLoc = await AsyncStorage.getItem("last_location");
      if (lastLoc) {
        const parsed = JSON.parse(lastLoc);
        lat = parsed.lat;
        lng = parsed.lng;
      }
    }

    const sosEvent = {
      worker_id: workerId,
      worker_name: workerName,
      worker_phone: workerPhone,
      type,
      lat,
      lng,
      status: "active",
      created_at: new Date().toISOString(),
    };

    // 2. Level 1 — Log to Supabase + alert nearby workers
    try {
      await supabase.from("sos_events").insert([sosEvent]);
      await sendPeerAlert({
        worker: { id: workerId, name: workerName },
        lat,
        lng,
        city: null,
        type,
      });
      console.log("SOS logged to Supabase");
    } catch (e) {
      // Offline — queue it
      const queue = await AsyncStorage.getItem("sos_queue");
      const arr = queue ? JSON.parse(queue) : [];
      arr.push(sosEvent);
      await AsyncStorage.setItem("sos_queue", JSON.stringify(arr));
      console.log("SOS queued for later sync");
    }

    // 3. Level 2 — Trusted contacts (SMS via Twilio — to be wired)
    // await sendSMSToContacts({ workerName, lat, lng });

    // 4. Level 3 — 112 ERSS
    await trigger112({ workerName, workerPhone, lat, lng, type });

    return { success: true, lat, lng };
  } catch (e) {
    console.log("SOS error:", e.message);
    return { success: false, error: e.message };
  }
}

async function trigger112({ workerName, workerPhone, lat, lng, type }) {
  try {
    const payload = {
      caller_name: workerName,
      caller_mobile: workerPhone,
      incident_type: type === "crash" ? "ROAD_ACCIDENT" : "DISTRESS",
      latitude: lat,
      longitude: lng,
      description: `Sentinel app SOS — ${workerName} needs help`,
    };

    const res = await fetch(ERSS_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    console.log("112 ERSS response:", res.status);
    return res.ok;
  } catch (e) {
    console.log("112 ERSS failed:", e.message);
    return false;
  }
}

// Sync queued SOS events when back online
export async function syncSOSQueue() {
  try {
    const queue = await AsyncStorage.getItem("sos_queue");
    if (!queue) return;
    const arr = JSON.parse(queue);
    if (!arr.length) return;

    for (const event of arr) {
      await supabase.from("sos_events").insert([event]);
    }

    await AsyncStorage.removeItem("sos_queue");
    console.log(`Synced ${arr.length} queued SOS events`);
  } catch (e) {
    console.log("SOS sync failed:", e.message);
  }
}
