// Health for WSR-88D sites, from the NWS radar station inventory.
//
// A site can be reachable and still be publishing nothing useful, so three
// separate signals are kept apart rather than collapsed into one boolean:
// whether the RDA reports itself operating, whether it is flagged for
// maintenance, and how long ago a Level II volume actually arrived.

export const STALE_LEVEL_TWO_MINUTES = 20;

const SITE_STATES = Object.freeze(['operating', 'degraded', 'stale', 'down', 'unknown']);

function boundedText(value, maxLength) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, maxLength);
}

function minutesSince(timestamp, now) {
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return null;
  const elapsed = Math.round((now - parsed) / 60000);
  // A clock skewed into the future is not evidence of freshness.
  return elapsed < 0 ? 0 : elapsed;
}

export function normalizeRadarSiteHealth(feature, { now = Date.now() } = {}) {
  const properties = feature?.properties || {};
  const rda = properties.rda?.properties || {};
  const id = boundedText(properties.id, 8).toUpperCase();
  const status = boundedText(rda.status, 40);
  const operability = boundedText(rda.operabilityStatus, 80);
  const alarm = boundedText(rda.alarmSummary, 80);
  const lastLevelTwoAt = boundedText(properties.latency?.levelTwoLastReceivedTime, 40);
  const ageMinutes = lastLevelTwoAt ? minutesSince(lastLevelTwoAt, now) : null;

  // Observed vocabulary on 2026-09-05 across 158 reporting WSR-88D sites:
  // status is "Operate" or "Start-Up"; operabilityStatus is "RDA - On-line",
  // "RDA - Maintenance Action Mandatory", "RDA - Maintenance Action Required",
  // or "RDA - Inoperable". Anything unrecognised degrades rather than passes.
  const stale = ageMinutes !== null && ageMinutes >= STALE_LEVEL_TWO_MINUTES;
  let state = 'unknown';
  if (status || operability) {
    if ((status && !/^operate$/i.test(status)) || /inoperable/i.test(operability)) state = 'down';
    else if (stale) state = 'stale';
    else if (operability && !/^rda\s*-\s*on-?line$/i.test(operability)) state = 'degraded';
    else state = 'operating';
  } else if (stale) {
    state = 'stale';
  }

  return { id, status, operability, alarm, lastLevelTwoAt, ageMinutes, state };
}

export function normalizeRadarSiteHealthIndex(payload, { now = Date.now() } = {}) {
  const features = Array.isArray(payload?.features) ? payload.features.slice(0, 400) : [];
  const index = new Map();
  for (const feature of features) {
    const health = normalizeRadarSiteHealth(feature, { now });
    if (/^[A-Z]{4}$/.test(health.id)) index.set(health.id, health);
  }
  return index;
}

export function radarSiteHealthState(health) {
  return SITE_STATES.includes(health?.state) ? health.state : 'unknown';
}

// A short line for the picker option, kept tight enough to read in a select.
export function radarSiteHealthBadge(health) {
  const badges = {
    operating: '',
    degraded: ' (maintenance)',
    stale: ' (no recent data)',
    down: ' (offline)',
    unknown: ''
  };
  return badges[radarSiteHealthState(health)];
}

export function radarSiteHealthSummary(health) {
  const state = radarSiteHealthState(health);
  if (state === 'unknown') return 'Site status unavailable';

  const parts = [];
  if (state === 'down') parts.push(`Offline: ${health.status}`);
  else if (state === 'stale') parts.push('No recent Level II volume');
  else if (state === 'degraded') parts.push(health.operability || 'Maintenance flagged');
  else parts.push('Operating');

  if (health.alarm && state !== 'operating') parts.push(health.alarm);
  if (health.ageMinutes !== null) {
    parts.push(health.ageMinutes < 1
      ? 'last volume under a minute ago'
      : `last volume ${health.ageMinutes} min ago`);
  }
  return parts.join(' · ');
}
