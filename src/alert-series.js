const NWS_ZONE_ORIGIN = 'https://api.weather.gov';
const DEFAULT_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const FAILED_CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_CACHE_ENTRIES = 500;
const DEFAULT_MAX_ZONE_REQUESTS = 250;
const DEFAULT_CONCURRENCY = 6;

function alertId(feature) {
    const properties = feature?.properties || {};
    const fallback = [properties.sent, properties.event, properties.areaDesc].some(Boolean)
        ? `${properties.sent || ''}:${properties.event || ''}:${properties.areaDesc || ''}`
        : '';
    return String(feature?.id || properties.id || properties.identifier || fallback).trim().slice(0, 1000);
}

function referenceIds(feature) {
    const references = feature?.properties?.references;
    if (Array.isArray(references)) {
        return references.map(reference => String(
            typeof reference === 'string' ? reference.split(',')[1] || reference : reference?.identifier || ''
        ).trim()).filter(Boolean);
    }
    if (typeof references === 'string') {
        return references.split(/\s+/)
            .map(reference => reference.split(',')[1] || '')
            .map(reference => reference.trim())
            .filter(Boolean);
    }
    return [];
}

function alertTimestamp(feature) {
    const properties = feature?.properties || {};
    for (const value of [properties.sent, properties.effective, properties.onset, properties.updated]) {
        const timestamp = Date.parse(value || '');
        if (Number.isFinite(timestamp)) return timestamp;
    }
    return 0;
}

function messageRank(feature) {
    const messageType = String(feature?.properties?.messageType || '').toLowerCase();
    if (messageType === 'cancel') return 3;
    if (messageType === 'update') return 2;
    return 1;
}

function isExpired(feature, now) {
    const expires = Date.parse(feature?.properties?.expires || feature?.properties?.ends || '');
    return Number.isFinite(expires) && expires <= now;
}

function disjointSet() {
    const parents = new Map();
    const find = value => {
        if (!parents.has(value)) parents.set(value, value);
        const parent = parents.get(value);
        if (parent !== value) parents.set(value, find(parent));
        return parents.get(value);
    };
    const union = (left, right) => {
        const leftRoot = find(left);
        const rightRoot = find(right);
        if (leftRoot === rightRoot) return;
        const [root, child] = [leftRoot, rightRoot].sort();
        parents.set(child, root);
    };
    return { find, union };
}

export function normalizeAlertSeries(features, { now = Date.now() } = {}) {
    const validFeatures = (Array.isArray(features) ? features : [])
        .filter(feature => feature && typeof feature === 'object' && alertId(feature));
    const groups = disjointSet();
    for (const feature of validFeatures) {
        const id = alertId(feature);
        groups.find(id);
        referenceIds(feature).forEach(reference => groups.union(id, reference));
    }

    const bySeries = new Map();
    for (const feature of validFeatures) {
        const seriesId = groups.find(alertId(feature));
        const series = bySeries.get(seriesId) || [];
        series.push(feature);
        bySeries.set(seriesId, series);
    }

    return [...bySeries.entries()].flatMap(([seriesId, series]) => {
        const latest = [...series].sort((left, right) => (
            alertTimestamp(right) - alertTimestamp(left)
            || messageRank(right) - messageRank(left)
            || alertId(right).localeCompare(alertId(left))
        ))[0];
        if (String(latest.properties?.messageType || '').toLowerCase() === 'cancel' || isExpired(latest, now)) {
            return [];
        }
        return [{
            ...latest,
            properties: {
                ...(latest.properties || {}),
                _stormviewSeriesId: seriesId,
                _stormviewSeriesSize: series.length
            }
        }];
    }).sort((left, right) => alertTimestamp(right) - alertTimestamp(left));
}

function trustedZoneUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:'
            && url.origin === NWS_ZONE_ORIGIN
            && /^\/zones\/[a-z-]+\/[a-z0-9-]+$/i.test(url.pathname)
            ? url.href
            : '';
    } catch {
        return '';
    }
}

function polygonParts(geometry) {
    if (geometry?.type === 'Polygon' && Array.isArray(geometry.coordinates)) return [geometry.coordinates];
    if (geometry?.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) return geometry.coordinates;
    return [];
}

function mergeZoneGeometries(geometries) {
    const coordinates = geometries.flatMap(polygonParts);
    if (!coordinates.length) return null;
    return coordinates.length === 1
        ? { type: 'Polygon', coordinates: coordinates[0] }
        : { type: 'MultiPolygon', coordinates };
}

function readCached(cache, url, now) {
    const entry = cache.get(url);
    if (!entry || entry.expiresAt <= now) {
        cache.delete(url);
        return undefined;
    }
    cache.delete(url);
    cache.set(url, entry);
    return entry.geometry;
}

function writeCached(cache, url, geometry, now, ttlMs, maxEntries) {
    cache.delete(url);
    cache.set(url, {
        geometry,
        expiresAt: now + (geometry ? ttlMs : FAILED_CACHE_TTL_MS)
    });
    while (cache.size > maxEntries) cache.delete(cache.keys().next().value);
}

export async function resolveAlertZoneGeometries(features, {
    fetchZone,
    cache = new Map(),
    now = Date.now(),
    cacheTtlMs = DEFAULT_CACHE_TTL_MS,
    maxCacheEntries = DEFAULT_MAX_CACHE_ENTRIES,
    maxZoneRequests = DEFAULT_MAX_ZONE_REQUESTS,
    concurrency = DEFAULT_CONCURRENCY
} = {}) {
    if (typeof fetchZone !== 'function') throw new TypeError('fetchZone is required');
    const alerts = Array.isArray(features) ? features : [];
    const requestedUrls = [...new Set(alerts.flatMap(feature => (
        polygonParts(feature?.geometry).length
            ? []
            : (Array.isArray(feature?.properties?.affectedZones) ? feature.properties.affectedZones : [])
                .map(trustedZoneUrl)
                .filter(Boolean)
    )))].slice(0, Math.max(0, maxZoneRequests));
    const geometries = new Map();
    const pending = [];

    for (const url of requestedUrls) {
        const cached = readCached(cache, url, now);
        if (cached !== undefined) geometries.set(url, cached);
        else pending.push(url);
    }

    let cursor = 0;
    await Promise.all(Array.from({ length: Math.min(concurrency, pending.length) }, async () => {
        while (cursor < pending.length) {
            const url = pending[cursor++];
            let geometry = null;
            try {
                const payload = await fetchZone(url);
                geometry = mergeZoneGeometries([payload?.geometry || payload]);
            } catch (error) {
                if (error?.name === 'AbortError') throw error;
            }
            geometries.set(url, geometry);
            writeCached(cache, url, geometry, now, cacheTtlMs, maxCacheEntries);
        }
    }));

    let resolvedCount = 0;
    const resolvedFeatures = alerts.map(feature => {
        if (polygonParts(feature?.geometry).length) return feature;
        const zoneUrls = (Array.isArray(feature?.properties?.affectedZones)
            ? feature.properties.affectedZones : []).map(trustedZoneUrl).filter(Boolean);
        const geometry = mergeZoneGeometries(zoneUrls.map(url => geometries.get(url)).filter(Boolean));
        if (!geometry) return feature;
        resolvedCount += 1;
        return {
            ...feature,
            geometry,
            properties: {
                ...(feature.properties || {}),
                _stormviewGeometrySource: 'affectedZones',
                _stormviewResolvedZoneCount: zoneUrls.filter(url => geometries.get(url)).length
            }
        };
    });

    return {
        features: resolvedFeatures,
        resolvedCount,
        unresolvedCount: resolvedFeatures.filter(feature => !polygonParts(feature?.geometry).length).length,
        requestedZoneCount: pending.length
    };
}
