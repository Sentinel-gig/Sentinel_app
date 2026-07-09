// ─── constants.js ────────────────────────────────────────────────────────────
export const COLORS = {
  bg:      '#080D18',
  bg2:     '#0D1424',
  card:    'rgba(255,255,255,0.04)',
  border:  'rgba(255,255,255,0.07)',
  blue:    '#4F8EF7',
  green:   '#22C55E',
  amber:   '#F59E0B',
  red:     '#EF4444',
  text1:   '#F1F5F9',
  text2:   '#94A3B8',
  text3:   '#475569',
};

export const RISK_LEVELS = {
  LOW:      { label: 'Low Risk',   color: '#22C55E', score: [0, 33]   },
  ELEVATED: { label: 'Elevated',   color: '#F59E0B', score: [34, 66]  },
  HIGH:     { label: 'High Threat',color: '#EF4444', score: [67, 85]  },
  CRITICAL: { label: 'Critical',   color: '#FF0000', score: [86, 100] },
};

export const INCIDENT_TYPES = ['accident', 'theft', 'roadRage', 'fight', 'medical', 'other'];

export const ESCALATION_WINDOWS = {
  PEER_WAIT_MS:    60000,   // 60s wait for peer response
  NEARBY_WAIT_MS:  90000,   // 90s wait for nearby worker response
  EMS_TRIGGER_MS:  150000,  // 2.5min → call 112
};

export const DEAD_ZONE = {
  MONITOR_MINUTES: 10,      // Heavy monitoring window after expected exit time
  MIN_SPEED_KMPH:  5,       // Below this = not moving
};
