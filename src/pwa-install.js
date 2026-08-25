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
