// ─── api/client.js ───────────────────────────────────────────────────────────
// All FastAPI calls live here. Import and call from screens/services.
// Base URL comes from .env → API_BASE_URL

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Auth
export const loginUser     = (phone, password)   => api.post('/auth/login', { phone, password });
export const registerUser  = (phone, name)        => api.post('/auth/register', { phone, name });

// ── Incidents
export const getIncidents  = (city, radius = 5)  => api.get('/incidents', { params: { city, radius } });
export const reportIncident = (data)             => api.post('/incidents/report', data);

// ── SOS
export const triggerSOS    = (location, userId)  => api.post('/sos/trigger', { location, userId });
export const cancelSOS     = (sosId)             => api.post(`/sos/cancel/${sosId}`);
export const acknowledgeAlert = (alertId, userId) => api.post(`/sos/acknowledge/${alertId}`, { userId });

// ── Routes
export const getSafeRoutes = (origin, destination) => api.get('/routes/safe', { params: { origin, destination } });

// ── Survey
export const getSurveys    = (userId)            => api.get('/survey/pending', { params: { userId } });
export const submitSurvey  = (incidentId, vote)  => api.post('/survey/submit', { incidentId, vote });

// ── Risk
export const getRiskScore  = (lat, lng)          => api.get('/risk/score', { params: { lat, lng } });

export default api;
