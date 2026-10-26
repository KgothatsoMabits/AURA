import { getSecret } from './storage.js';
/**
 * @aura/web - Universal API Client (Audited for Workstreams R1 - R6)
 *
 * Provides a resilient fetch-based HTTP client wrapper with automatic baseUrl
 * configuration from VITE_API_URL, standard application/json headers, authentication
 * token injection, and structured error normalization.
 */

const BASE_URL = (import.meta.env.VITE_API_URL || '/api/v1').replace(/\/+$/, '');

/**
 * Standard HTTP Error class capturing status code and server payload.
 */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Core request execution wrapper with automatic header injection and response parsing.
 */
async function request(endpoint, options = {}) {
  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Retrieve optional auth token and current user ID
  let authToken = null;
  try {
    authToken = await getSecret('aura_auth_token');
  } catch {
    // Gracefully handle unavailable secure storage.
  }

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers: defaultHeaders,
  };

  try {
    const response = await fetch(url, config);

    let responseData = null;
    const contentType = response.headers.get('content-type');
    if (response.status === 204) return null;

    if (contentType && contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const errorMessage =
        (responseData && (responseData.error || responseData.message)) ||
        `Request failed with status ${response.status}`;
      throw new ApiError(errorMessage, response.status, responseData);
    }

    return responseData;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error.message || 'Network connection error. Check your connection or API server availability.',
      0,
      null
    );
  }
}

export const apiClient = {
  get(endpoint, options = {}) {
    return request(endpoint, { ...options, method: 'GET' });
  },

  post(endpoint, body, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  put(endpoint, body, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch(endpoint, body, options = {}) {
    return request(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete(endpoint, options = {}) {
    return request(endpoint, { ...options, method: 'DELETE' });
  },

  // ----------------------------------------------------
  // Workstream R2: Identity & Authentication Endpoints
  // ----------------------------------------------------
  register(payload) {
    return this.post('/auth/register', payload);
  },

  verifyOtp(payload) {
    return this.post('/auth/verify-otp', payload);
  },
  loginRequestOtp(payload) { return this.post('/auth/login/request-otp', payload); },
  demoLogin(payload) { return this.post('/auth/demo-login', payload); },
  loginVerifyOtp(payload) { return this.post('/auth/login/verify-otp', payload); },
  resendOtp(payload) { return this.post('/auth/resend-otp', payload); },

  getMe() { return this.get('/auth/me'); },
  me() { return this.get('/auth/me'); },
  logoutAll() { return this.post('/auth/logout-all', {}); },

  responderLogin(credentials) {
    return this.post('/auth/responder-login', credentials);
  },

  verifyId(idPayload) { return this.post('/auth/register', idPayload); },

  // ----------------------------------------------------
  // Workstream R3: Incident Dispatch & Telemetry
  // ----------------------------------------------------
  dispatchEmergency(tacticalPayload) { return this.post('/incidents', tacticalPayload); },
  createIncident(payload) { return this.post('/incidents', payload); },

  getIncident(incidentId) {
    return this.get(`/incidents/${incidentId}`);
  },

  sendLocationTelemetry(incidentId, locationPayload) { return this.post(`/incidents/${incidentId}/location`, { latitude: locationPayload.latitude ?? locationPayload.lat, longitude: locationPayload.longitude ?? locationPayload.lng, accuracy: locationPayload.accuracy }); },
  pingLocation(incidentId, payload) { return this.sendLocationTelemetry(incidentId, payload); },

  cancelEmergency(incidentId) { return this.post(`/incidents/${incidentId}/cancel`, {}); },
  cancelIncident(incidentId) { return this.cancelEmergency(incidentId); },

  // ----------------------------------------------------
  // Workstream R4: Responder Console Mesh
  // ----------------------------------------------------
  getResponderIncidents() {
    return this.get('/responder/incidents');
  },

  updateResponderIncident(incidentId, updates) {
    return this.patch(`/responder/incidents/${incidentId}`, updates);
  },

  // Community Guardian (disabled by the server unless explicitly enabled)
  getGuardianSettings() { return this.get('/guardian/settings'); },
  saveGuardianSettings(payload) { return this.put('/guardian/settings', payload); },
  sendGuardianPresence(payload) { return this.post('/guardian/presence', payload); },
  getGuardianAlerts() { return this.get('/guardian/alerts'); },
  dismissGuardianAlert(id) { return this.post(`/guardian/alerts/${encodeURIComponent(id)}/dismiss`, {}); },
  registerDevice(payload) { return this.post('/devices', payload); },
  removeDevice(token) { return this.delete('/devices', { body: JSON.stringify({ token }) }); },

  // ----------------------------------------------------
  // Workstream R5: Addresses & Emergency Contacts CRUD
  // ----------------------------------------------------
  getAddresses() { return this.get('/profile').then(x => x.addresses || []); },

  createAddress(addressData) {
    return this.post('/profile/addresses', addressData);
  },

  deleteAddress(addressId) {
    return this.delete(`/profile/addresses/${addressId}`);
  },

  getContacts() { return this.get('/profile').then(x => x.contacts || []); },

  createContact(contactData) {
    return this.post('/profile/contacts', contactData);
  },

  deleteContact(contactId) {
    return this.delete(`/profile/contacts/${contactId}`);
  },

  updateProfile(profileData) { return this.patch('/profile/settings', profileData); },
  getProfile() { return this.get('/profile'); },
  updateSettings(settings) { return this.patch('/profile/settings', settings); },

  // ----------------------------------------------------
  // Workstream R6: Stealth Disguised Tasks
  // ----------------------------------------------------
  createStealthTask(taskPayload) { return this.post('/tasks', taskPayload); },
  createTask(taskPayload) { return this.post('/tasks', taskPayload); },
  getTask(id) { return this.get(`/tasks/${encodeURIComponent(id)}`); },
  pingTaskLocation(id, locationPayload) { return this.post(`/tasks/${encodeURIComponent(id)}/location`, { lat: locationPayload.latitude ?? locationPayload.lat, lng: locationPayload.longitude ?? locationPayload.lng, acc: locationPayload.accuracy }); },
  finishTask(id) { return this.post(`/tasks/${encodeURIComponent(id)}/done`, {}); },

  getStealthTasks() {
    return this.get('/tasks');
  },

  // Diagnostic
  checkHealth() {
    return this.get('/health');
  },
};

export default apiClient;
