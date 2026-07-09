// ─── services/deadzone.js ────────────────────────────────────────────────────
// Dead zone detection — monitors network during active shift
// Uses fetch-based connectivity check instead of NetInfo

const SOFT_ALERT_MS = 45 * 60 * 1000; // 45 minutes
const HARD_ALERT_MS = 2 * 60 * 60 * 1000; // 2 hours
const CHECK_INTERVAL = 30 * 1000; // check every 30 seconds

let checkTimer = null;
let softTimer = null;
let hardTimer = null;
let offlineSince = null;
let isMonitoring = false;

let _onSoftAlert = null;
let _onHardAlert = null;
let _onNetworkBack = null;

async function checkConnectivity() {
  try {
    await fetch("https://www.google.com", {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
    });
    // Connected
    if (offlineSince) {
      offlineSince = null;
      _clearAlertTimers();
      if (_onNetworkBack) _onNetworkBack();
    }
  } catch (e) {
    // Offline
    if (!offlineSince) {
      offlineSince = Date.now();
      _startAlertTimers();
    }
  }
}

function _startAlertTimers() {
  _clearAlertTimers();
  softTimer = setTimeout(() => {
    if (_onSoftAlert)
      _onSoftAlert({
        offlineSince,
        minutesOffline: Math.round((Date.now() - offlineSince) / 60000),
      });
  }, SOFT_ALERT_MS);
  hardTimer = setTimeout(() => {
    if (_onHardAlert)
      _onHardAlert({
        offlineSince,
        minutesOffline: Math.round((Date.now() - offlineSince) / 60000),
      });
  }, HARD_ALERT_MS);
}

function _clearAlertTimers() {
  if (softTimer) {
    clearTimeout(softTimer);
    softTimer = null;
  }
  if (hardTimer) {
    clearTimeout(hardTimer);
    hardTimer = null;
  }
}

export function startDeadZoneMonitor({
  onSoftAlert,
  onHardAlert,
  onNetworkBack,
}) {
  if (isMonitoring) return;
  isMonitoring = true;
  _onSoftAlert = onSoftAlert;
  _onHardAlert = onHardAlert;
  _onNetworkBack = onNetworkBack;

  checkConnectivity();
  checkTimer = setInterval(checkConnectivity, CHECK_INTERVAL);
}

export function stopDeadZoneMonitor() {
  if (checkTimer) {
    clearInterval(checkTimer);
    checkTimer = null;
  }
  _clearAlertTimers();
  offlineSince = null;
  isMonitoring = false;
}

export function getOfflineDuration() {
  if (!offlineSince) return 0;
  return Date.now() - offlineSince;
}
