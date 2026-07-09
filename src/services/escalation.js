// ─── services/escalation.js ──────────────────────────────────────────────────
// Tiered escalation ladder:
//   1. Silent alert → chosen trusted contacts + nearby workers (60s wait)
//   2. No response  → alert all nearby workers in locality (90s wait)
//   3. Still no response → call 112
//
// Each step calls the FastAPI backend which handles notification routing.

import { triggerSOS, acknowledgeAlert } from '../api/client';
import { ESCALATION_WINDOWS } from '../utils/constants';

let escalationTimer = null;
let currentSosId    = null;

export async function startEscalation({ userId, location, reason }) {
  try {
    const res = await triggerSOS(location, userId);
    currentSosId = res.data.sos_id;

    // Step 1: Peer alert sent by backend. Wait for acknowledgment.
    escalationTimer = setTimeout(async () => {
      // Step 2: Escalate to nearby workers
      // (backend handles this via the sos_id escalation state machine)
      escalationTimer = setTimeout(() => {
        // Step 3: Call 112
        // On real device: Linking.openURL('tel:112')
        console.warn('[Sentinel] Escalating to 112');
      }, ESCALATION_WINDOWS.NEARBY_WAIT_MS);
    }, ESCALATION_WINDOWS.PEER_WAIT_MS);

    return currentSosId;
  } catch (err) {
    console.error('[Sentinel] Escalation failed:', err);
  }
}

export function cancelEscalation() {
  if (escalationTimer) { clearTimeout(escalationTimer); escalationTimer = null; }
  currentSosId = null;
}
