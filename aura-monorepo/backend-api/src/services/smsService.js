/**
 * AURA e-SAPS — SMSPortal SMS transport (REST API, native fetch).
 *
 * Requirements:
 *   Node.js 18+ (global fetch). No extra npm packages needed.
 *
 * Environment variables:
 *   SMSPORTAL_CLIENT_ID   (required)
 *   SMSPORTAL_API_SECRET  (required)
 *   SMSPORTAL_BASE_URL    (optional, default https://rest.smsportal.com)
 *   SMSPORTAL_TEST_MODE   (optional, "true" = API accepts but does not send/charge)
 *   SMSPORTAL_TIMEOUT_MS  (optional, default 15000)
 *
 * Security:
 *   - Never log message bodies, phone numbers, OTPs, or API credentials.
 *   - A successful API response means accepted, not necessarily delivered.
 */

const DEFAULT_BASE_URL = "https://rest.smsportal.com";
const DEFAULT_TIMEOUT_MS = 15000;

function getConfig() {
  const clientId = process.env.SMSPORTAL_CLIENT_ID;
  const apiSecret = process.env.SMSPORTAL_API_SECRET;

  if (!clientId || !apiSecret) {
    const error = new Error("SMSPortal credentials are not configured");
    error.kind = "provider_not_configured";
    throw error;
  }

  const baseUrl = (process.env.SMSPORTAL_BASE_URL || DEFAULT_BASE_URL).replace(
    /\/+$/,
    ""
  );

  if (!baseUrl.startsWith("https://")) {
    const error = new Error("SMSPortal must use HTTPS");
    error.kind = "invalid_provider_configuration";
    throw error;
  }

  const timeoutMs = Number.parseInt(process.env.SMSPORTAL_TIMEOUT_MS, 10);

  return {
    baseUrl,
    authHeader:
      "Basic " + Buffer.from(`${clientId}:${apiSecret}`).toString("base64"),
    testMode: String(process.env.SMSPORTAL_TEST_MODE).toLowerCase() === "true",
    timeoutMs:
      Number.isInteger(timeoutMs) && timeoutMs > 0
        ? timeoutMs
        : DEFAULT_TIMEOUT_MS,
  };
}

function validatePhoneNumber(phoneNumber) {
  // International E.164 format, e.g. +27821234567.
  if (
    typeof phoneNumber !== "string" ||
    !/^\+[1-9]\d{7,14}$/.test(phoneNumber)
  ) {
    const error = new Error(
      "Phone number must be in international E.164 format"
    );
    error.kind = "invalid_recipient";
    throw error;
  }
}

function toProviderDestination(phoneNumber) {
  // SMSPortal expects international numbers without the leading "+".
  return phoneNumber.slice(1);
}

function kindFromStatus(status) {
  if (status === 401 || status === 403) return "provider_authentication_failed";
  if (status === 402) return "quota_exceeded";
  if (status === 429) return "provider_rate_limited";
  if (status !== null) return "provider_error";
  return "provider_request_failed";
}

function throwProviderError(status, kindOverride) {
  const kind = kindOverride || kindFromStatus(status);

  // Deliberately omit the raw error, message, recipient and credentials.
  console.warn("[SMSPORTAL SMS FAILURE]", JSON.stringify({ status, kind }));

  const safeError = new Error("SMSPortal SMS delivery request failed");
  safeError.kind = kind;
  safeError.status = status;
  throw safeError;
}

async function request(path, { method = "GET", body } = {}) {
  const { baseUrl, authHeader, timeoutMs } = getConfig();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch {
    // Network failure or timeout. Never log the underlying error.
    throwProviderError(null);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throwProviderError(response.status);
  }

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function normalizeResponse(data) {
  const errors = Array.isArray(data?.errors) ? data.errors : [];

  return {
    success: true,
    provider: "smsportal",
    status: "accepted",
    eventId: data?.eventId ?? null,
    costBundles: data?.costBundles ?? null,
    remainingBalance: data?.remainingBalance ?? null,
    errorCount: errors.length,
  };
}

async function sendMessage(phoneNumber, message) {
  validatePhoneNumber(phoneNumber);

  if (typeof message !== "string" || !message.trim()) {
    throw new Error("SMS message must not be empty");
  }

  const { testMode } = getConfig();

  const payload = {
    messages: [
      {
        content: message,
        destination: toProviderDestination(phoneNumber),
      },
    ],
  };

  if (testMode) {
    payload.sendOptions = { testMode: true };
  }

  const data = await request("/bulkmessages", {
    method: "POST",
    body: payload,
  });

  // SMSPortal can return HTTP 200 with per-message errors.
  if (Array.isArray(data?.errors) && data.errors.length > 0) {
    throwProviderError(200, "provider_rejected_message");
  }

  console.info(
    "[SMSPORTAL SMS ACCEPTED]",
    JSON.stringify({
      provider: "smsportal",
      eventId: data?.eventId ?? null,
      testMode,
    })
  );

  return normalizeResponse(data);
}

export const smsService = {
  async sendOtp(phoneNumber, code) {
    if (
      (typeof code !== "string" && typeof code !== "number") ||
      !/^\d{4,10}$/.test(String(code))
    ) {
      throw new Error("OTP must contain between 4 and 10 digits");
    }

    const message =
      `[AURA e-SAPS] Your emergency verification code is ${code}. ` +
      "Valid for 10 minutes. Do not share this code with anyone.";

    return sendMessage(phoneNumber, message);
  },

  async notifyContact(
    contactPhone,
    contactName,
    citizenName,
    locationData,
    incidentId
  ) {
    const hasLocation =
      Number.isFinite(locationData?.lat) &&
      Number.isFinite(locationData?.lng) &&
      locationData.lat >= -90 &&
      locationData.lat <= 90 &&
      locationData.lng >= -180 &&
      locationData.lng <= 180;

    const location = hasLocation
      ? `https://maps.google.com/?q=${locationData.lat},${locationData.lng}`
      : "Location unavailable";

    const reference =
      incidentId && incidentId !== "unavailable"
        ? String(incidentId)
        : "Unavailable";

    const message =
      `[AURA EMERGENCY ALERT] ${citizenName || "A citizen"} ` +
      "triggered a verified emergency distress signal. " +
      `Last known location: ${location}. ` +
      `e-SAPS dispatch ref: ${reference}. ` +
      "If unable to reach them, call SAPS 10111.";

    return sendMessage(contactPhone, message);
  },

  /** Returns the remaining account balance (credits). */
  async getQuota() {
    const data = await request("/balance");
    return { provider: "smsportal", balance: data?.balance ?? null };
  },
};

export default smsService;