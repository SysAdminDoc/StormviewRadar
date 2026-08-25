export const REPLAY_INTERVAL_MS = 5 * 60 * 1000;
export const MAX_REPLAY_DURATION_MS = 6 * 60 * 60 * 1000;
export const MAX_REPLAY_FRAMES = 73;

function floorToInterval(timestamp) {
    return Math.floor(timestamp / REPLAY_INTERVAL_MS) * REPLAY_INTERVAL_MS;
}

function pad(value) {
    return String(value).padStart(2, '0');
}

export function archiveRadarUrl(timestamp) {
    const date = new Date(timestamp);
    const year = date.getUTCFullYear();
    const month = pad(date.getUTCMonth() + 1);
    const day = pad(date.getUTCDate());
    const hour = pad(date.getUTCHours());
    const minute = pad(date.getUTCMinutes());
    return `https://mesonet.agron.iastate.edu/archive/data/${year}/${month}/${day}/GIS/uscomp/n0q_${year}${month}${day}${hour}${minute}.png`;
}

export function buildReplayFrames(startValue, endValue) {
    const startTimestamp = new Date(startValue).getTime();
    const endTimestamp = new Date(endValue).getTime();
    if (!Number.isFinite(startTimestamp) || !Number.isFinite(endTimestamp)) {
        throw new Error('Choose a valid replay start and end');
    }
    if (endTimestamp <= startTimestamp) throw new Error('Replay end must be after its start');
    if (endTimestamp - startTimestamp > MAX_REPLAY_DURATION_MS) {
        throw new Error('Historical replay is limited to 6 hours');
    }

    const start = floorToInterval(startTimestamp);
    const end = floorToInterval(endTimestamp);
    const frames = [];
    for (let timestamp = start; timestamp <= end; timestamp += REPLAY_INTERVAL_MS) {
        frames.push({
            time: timestamp / 1000,
            path: archiveRadarUrl(timestamp),
            kind: 'replay',
            timeSource: 'IEM NEXRAD composite archive'
        });
    }
    if (frames.length < 2) throw new Error('Historical replay needs at least two 5-minute frames');
    if (frames.length > MAX_REPLAY_FRAMES) throw new Error('Historical replay exceeds the frame limit');
    return frames;
}

export function warningActiveAt(feature, timestamp) {
    const properties = feature?.properties || {};
    const start = new Date(properties.polygon_begin || properties.issue).getTime();
    const end = new Date(properties.polygon_end || properties.expire_utc || properties.expire).getTime();
    return Number.isFinite(start) && Number.isFinite(end) && start <= timestamp && timestamp < end;
}
