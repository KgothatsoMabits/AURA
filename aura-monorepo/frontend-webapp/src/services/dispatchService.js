import apiClient from "./apiClient.js";
import { getFix, watchFix, LocationError } from "./location.js";

const TERMINAL_STATUSES = ["resolved", "cancelled", "false_alarm"];
let watcher = null,
  pollTimer = null,
  pingTimer = null,
  latestFix = null,
  incidentId = null,
  taskId = null,
  stopped = true,
  callbacks = {};
async function start(payload, stealth) {
  stopTracking();
  const fix = await getFix();
  const response = stealth
    ? await apiClient.createTask({
        ...payload,
        lat: fix.latitude,
        lng: fix.longitude,
        acc: fix.accuracy,
      })
    : await apiClient.createIncident({
        ...payload,
        latitude: fix.latitude,
        longitude: fix.longitude,
      });
  incidentId = stealth ? null : response.incident.id;
  taskId = stealth ? response.id : null;
  stopped = false;
  callbacks = payload.callbacks || {};
  latestFix = fix;
  watcher = watchFix(
    (f) => {
      latestFix = f;
    },
    (e) => callbacks.onError?.(new LocationError(e.message)),
  );
  const pollIncidentId = incidentId;
  const pollTaskId = taskId;
  const poll = async () => {
    if (stopped || (stealth ? taskId !== pollTaskId : incidentId !== pollIncidentId)) return;
    try {
      const data = stealth
        ? await apiClient.getTask(taskId)
        : await apiClient.getIncident(incidentId);
      const incident = stealth
        ? {
            id: data.id,
            status:
              ["active", "acknowledged", "dispatched", "resolved"][
                data.state
              ] || "active",
            etaMinutes: data.eta,
          }
        : data.incident;
      if (stopped || (stealth ? taskId !== pollTaskId : incidentId !== pollIncidentId)) return;
      callbacks.onStatus?.(incident);
      if (TERMINAL_STATUSES.includes(incident.status)) {
        callbacks.onClosed?.(incident);
        stopTracking();
      }
    } catch (e) {
      callbacks.onError?.(e);
    }
  };
  pollTimer = setInterval(poll, 3000);
  pingTimer = setInterval(async () => {
    if (stopped || !latestFix || (!incidentId && !taskId)) return;
    const f = latestFix;
    latestFix = null;
    try {
      if (taskId) await apiClient.pingTaskLocation(taskId, f);
      else await apiClient.pingLocation(incidentId, f);
    } catch (e) {
      if (!stopped && (taskId || incidentId)) {
        latestFix = f;
        callbacks.onError?.(e);
      }
    }
  }, 3000);
  await poll();
  return stealth ? { taskId, ...response } : { ...response };
}
export const startIncident = (payload) => start(payload, false);
export const startTask = (payload) => start(payload, true);
export function stopTracking() {
  stopped = true;
  if (watcher) watcher();
  watcher = null;
  if (pollTimer) clearInterval(pollTimer);
  if (pingTimer) clearInterval(pingTimer);
  pollTimer = pingTimer = null;
  incidentId = taskId = null;
  latestFix = null;
}
export async function cancel() {
  const currentTaskId = taskId;
  const currentIncidentId = incidentId;
  if (currentTaskId) {
    await apiClient.finishTask(currentTaskId);
  } else if (currentIncidentId) {
    await apiClient.cancelIncident(currentIncidentId);
  }
  stopTracking();
}
export default { startIncident, startTask, stopTracking, cancel };
