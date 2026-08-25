import { stormPaletteColor } from './visual-palette.js';

export const STORM_HISTORY_WINDOW_MS = 60 * 60 * 1000;
export const STORM_HISTORY_LIMIT = 12;

function finite(value, min, max, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) && number >= min && number <= max ? number : fallback;
}

function shortText(value, maxLength) {
    return String(value ?? '').replace(/[\u0000-\u001F]/g, '').slice(0, maxLength);
}

export function stormCellKey(cell) {
    return `${cell.radar}:${cell.id}`;
}

export function normalizeStormFeature(feature) {
    if (feature?.geometry?.type !== 'Point' || !Array.isArray(feature.geometry.coordinates)) return null;
    const [longitude, latitude] = feature.geometry.coordinates.map(Number);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
        || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;

    const properties = feature.properties || {};
    const radar = shortText(properties.nexrad, 4).toUpperCase();
    const id = shortText(properties.storm_id, 8).toUpperCase();
    const valid = new Date(properties.valid).getTime();
    if (!radar || !id || !Number.isFinite(valid)) return null;

    return {
        radar,
        id,
        latitude,
        longitude,
        valid,
        tvs: shortText(properties.tvs, 16).toUpperCase(),
        meso: shortText(properties.meso, 16).toUpperCase(),
        posh: finite(properties.posh, 0, 100),
        poh: finite(properties.poh, 0, 100),
        maxHailInches: finite(properties.max_size, 0, 20),
        vil: finite(properties.vil, 0, 500),
        maxDbz: finite(properties.max_dbz, -50, 100),
        maxDbzHeightKft: finite(properties.max_dbz_height, 0, 100),
        topKft: finite(properties.top, 0, 100),
        direction: finite(properties.drct, 0, 360),
        speedKnots: finite(properties.sknt, 0, 250)
    };
}

export function stormThreatScore(cell) {
    const hasTvs = cell.tvs && cell.tvs !== 'NONE';
    const hasMeso = cell.meso && cell.meso !== 'NONE' && cell.meso !== '0';
    return (hasTvs ? 10000 : 0)
        + (hasMeso ? 5000 : 0)
        + cell.posh * 20
        + cell.maxHailInches * 100
        + Math.max(0, cell.maxDbz);
}

export function stormTrackColor(cell, palette = 'standard') {
    return stormPaletteColor(cell, palette);
}

export function mergeStormHistory(histories, cells, referenceTime = Date.now()) {
    const cutoff = referenceTime - STORM_HISTORY_WINDOW_MS;
    for (const cell of cells) {
        const key = stormCellKey(cell);
        const existing = histories.get(key) || [];
        const withoutDuplicate = existing.filter(point => point.valid !== cell.valid);
        withoutDuplicate.push({
            latitude: cell.latitude,
            longitude: cell.longitude,
            valid: cell.valid
        });
        withoutDuplicate.sort((left, right) => left.valid - right.valid);
        const retained = withoutDuplicate
            .filter(point => point.valid >= cutoff && point.valid <= referenceTime + 5 * 60 * 1000)
            .slice(-STORM_HISTORY_LIMIT);
        if (retained.length) histories.set(key, retained);
    }

    for (const [key, points] of histories) {
        const retained = points.filter(point => point.valid >= cutoff).slice(-STORM_HISTORY_LIMIT);
        if (retained.length) histories.set(key, retained);
        else histories.delete(key);
    }
    return histories;
}

export function projectStormCell(cell, minutes) {
    const distanceKm = cell.speedKnots * 1.852 * (minutes / 60);
    const angularDistance = distanceKm / 6371;
    const bearing = cell.direction * Math.PI / 180;
    const latitude = cell.latitude * Math.PI / 180;
    const longitude = cell.longitude * Math.PI / 180;
    const projectedLatitude = Math.asin(
        Math.sin(latitude) * Math.cos(angularDistance)
        + Math.cos(latitude) * Math.sin(angularDistance) * Math.cos(bearing)
    );
    const projectedLongitude = longitude + Math.atan2(
        Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(latitude),
        Math.cos(angularDistance) - Math.sin(latitude) * Math.sin(projectedLatitude)
    );
    return {
        latitude: projectedLatitude * 180 / Math.PI,
        longitude: ((projectedLongitude * 180 / Math.PI + 540) % 360) - 180
    };
}
