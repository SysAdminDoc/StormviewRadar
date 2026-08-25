export const RADAR_HISTORY_INTERVAL_SECONDS = 5 * 60;
export const RADAR_HISTORY_HOURS = 6;
export const REDUCED_DATA_HISTORY_HOURS = 1;
export const MAX_RADAR_HISTORY_FRAMES = 73;

function pad(value) {
  return String(value).padStart(2, '0');
}

export function radarHistoryHours(reducedData = false) {
  return reducedData ? REDUCED_DATA_HISTORY_HOURS : RADAR_HISTORY_HOURS;
}

export function archiveReflectivityUrl(epochSeconds) {
  const timestamp = Math.floor(Number(epochSeconds) / RADAR_HISTORY_INTERVAL_SECONDS)
    * RADAR_HISTORY_INTERVAL_SECONDS;
  const date = new Date(timestamp * 1000);
  if (!Number.isFinite(date.getTime())) throw new Error('Radar history needs a valid provider time');
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hour = pad(date.getUTCHours());
  const minute = pad(date.getUTCMinutes());
  return `https://mesonet.agron.iastate.edu/archive/data/${year}/${month}/${day}/GIS/uscomp/n0q_${year}${month}${day}${hour}${minute}.png`;
}

export function buildRadarHistoryFrames(validEpochSeconds, { reducedData = false } = {}) {
  const numericTime = Number(validEpochSeconds);
  if (!Number.isFinite(numericTime) || numericTime <= 0) {
    throw new Error('Radar history needs a valid provider time');
  }
  const end = Math.floor(numericTime / RADAR_HISTORY_INTERVAL_SECONDS) * RADAR_HISTORY_INTERVAL_SECONDS;
  const frameCount = radarHistoryHours(reducedData) * 60 * 60 / RADAR_HISTORY_INTERVAL_SECONDS + 1;
  if (frameCount > MAX_RADAR_HISTORY_FRAMES) throw new Error('Radar history exceeds its frame limit');
  const start = end - ((frameCount - 1) * RADAR_HISTORY_INTERVAL_SECONDS);

  return Array.from({ length: frameCount }, (_, index) => {
    const time = start + (index * RADAR_HISTORY_INTERVAL_SECONDS);
    const latest = index === frameCount - 1;
    return {
      time,
      path: latest ? 'mrms-current' : archiveReflectivityUrl(time),
      kind: latest ? 'latest' : 'past',
      timeSource: latest ? 'IEM US composite metadata' : 'IEM NEXRAD composite archive',
      cacheKey: `iem-n0q-${time}`
    };
  });
}

export function radarHistoryTickIndices(frames) {
  if (!Array.isArray(frames) || frames.length < 2) return [];
  const latestTime = Number(frames.at(-1)?.time);
  if (!Number.isFinite(latestTime)) return [];
  return frames
    .map((frame, index) => ({ index, hoursAgo: Math.round((latestTime - Number(frame?.time)) / 3600) }))
    .filter(({ index, hoursAgo }) => index === frames.length - 1
      || (hoursAgo > 0 && Number(frames[index]?.time) % 3600 === latestTime % 3600));
}
