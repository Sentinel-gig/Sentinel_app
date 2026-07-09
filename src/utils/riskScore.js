// ─── riskScore.js ────────────────────────────────────────────────────────────
// Converts a numeric risk score (0-100) to a color and label.

import { RISK_LEVELS } from './constants';

export function getRiskLevel(score) {
  for (const [key, level] of Object.entries(RISK_LEVELS)) {
    if (score >= level.score[0] && score <= level.score[1]) {
      return { key, ...level };
    }
  }
  return { key: 'LOW', ...RISK_LEVELS.LOW };
}

export function getRouteColor(type) {
  const map = { safe: '#22C55E', balanced: '#F59E0B', fast: '#EF4444' };
  return map[type] || '#4F8EF7';
}
