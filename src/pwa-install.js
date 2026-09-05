export const INSTALL_DISMISSAL_MS = 14 * 24 * 60 * 60 * 1000;

export function normalizeOfflineAvailability(message) {
  const radarEntries = Math.max(0, Math.min(10000, Math.trunc(Number(message?.radarEntries) || 0)));
  const shell = message?.shell === true;
  const radarFrame = message?.radarFrame === true && radarEntries > 0;
  return {
    shell,
    radarFrame,
    radarEntries,
    ready: shell && radarFrame
  };
}

export const STORAGE_PERSISTENCE_STATES = Object.freeze([
  'unknown', 'unsupported', 'granted', 'denied'
]);

// Offline data the app advertises is worthless if the browser evicts it, so
// the outcome of the persistence request is reported rather than assumed.
export function normalizeStoragePersistence(value) {
  return STORAGE_PERSISTENCE_STATES.includes(value) ? value : 'unknown';
}

export function storagePersistenceLabel(value) {
  const labels = {
    unknown: 'not requested',
    unsupported: 'not supported by this browser',
    granted: 'granted',
    denied: 'denied, cached data can be evicted'
  };
  return labels[normalizeStoragePersistence(value)];
}

export function installPromptDismissed(dismissedAt, now = Date.now()) {
  const timestamp = Number(dismissedAt);
  return Number.isFinite(timestamp)
    && timestamp > 0
    && timestamp <= now
    && now - timestamp < INSTALL_DISMISSAL_MS;
}

export function shouldOfferInstall({
  hasInstallEvent,
  offlineReady,
  standalone = false,
  embed = false,
  dismissedAt = null,
  now = Date.now()
}) {
  return Boolean(hasInstallEvent)
    && offlineReady === true
    && standalone !== true
    && embed !== true
    && !installPromptDismissed(dismissedAt, now);
}
