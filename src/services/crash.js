// ─── services/crash.js ───────────────────────────────────────────────────────
// Crash detection using accelerometer via expo-sensors.
// Flow: spike detected → 30s warning countdown → no response → SOS trigger

import { Accelerometer } from 'expo-sensors';

const CRASH_THRESHOLD = 3.5;   // G-force spike (tune during field testing)
const STILLNESS_MS    = 5000;  // 5s no movement after spike = likely crashed
const WARNING_MS      = 30000; // 30s countdown before SOS fires

let sub           = null;
let stillTimer    = null;
let warningTimer  = null;
let lastSpike     = null;
let isWarning     = false;

let _onWarning    = null;  // callback → show countdown UI
let _onSOS        = null;  // callback → fire SOS
let _onCancel     = null;  // callback → dismiss warning

export function startCrashDetection({ onWarning, onSOS, onCancel }) {
  _onWarning = onWarning;
  _onSOS     = onSOS;
  _onCancel  = onCancel;

  Accelerometer.setUpdateInterval(200);

  sub = Accelerometer.addListener(({ x, y, z }) => {
    const magnitude = Math.sqrt(x * x + y * y + z * z);

    if (magnitude > CRASH_THRESHOLD && !isWarning) {
      // Spike detected — start stillness timer
      lastSpike = Date.now();
      if (stillTimer) clearTimeout(stillTimer);

      stillTimer = setTimeout(() => {
        // Still no movement after spike — trigger warning
        _triggerWarning();
      }, STILLNESS_MS);

    } else if (magnitude > 1.2 && !isWarning) {
      // Movement detected — cancel pending crash timer
      if (stillTimer) { clearTimeout(stillTimer); stillTimer = null; }
    }
  });
}

function _triggerWarning() {
  isWarning = true;
  if (_onWarning) _onWarning({ secondsLeft: 30, timestamp: lastSpike });

  // 30s countdown — if no cancel, fire SOS
  warningTimer = setTimeout(() => {
    isWarning = false;
    if (_onSOS) _onSOS({ timestamp: lastSpike });
  }, WARNING_MS);
}

// Call this when user taps "I'm okay"
export function cancelCrashWarning() {
  if (warningTimer) { clearTimeout(warningTimer); warningTimer = null; }
  if (stillTimer)   { clearTimeout(stillTimer);   stillTimer   = null; }
  isWarning = false;
  if (_onCancel) _onCancel();
}

export function stopCrashDetection() {
  if (sub)          { sub.remove();                sub          = null; }
  if (stillTimer)   { clearTimeout(stillTimer);    stillTimer   = null; }
  if (warningTimer) { clearTimeout(warningTimer);  warningTimer = null; }
  isWarning = false;
}

export function isCrashWarningActive() {
  return isWarning;
}