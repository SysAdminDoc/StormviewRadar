const SEVERITY_RANK = Object.freeze({
    unknown: 0,
    minor: 1,
    moderate: 2,
    severe: 3,
    extreme: 4
});

function radians(value) {
    return value * Math.PI / 180;
}

function pointInRing(longitude, latitude, ring) {
    let inside = false;
    for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
        const currentPoint = ring[index];
        const previousPoint = ring[previous];
        if (!Array.isArray(currentPoint) || !Array.isArray(previousPoint)) continue;
        const [currentLongitude, currentLatitude] = currentPoint.map(Number);
        const [previousLongitude, previousLatitude] = previousPoint.map(Number);
        if (![currentLongitude, currentLatitude, previousLongitude, previousLatitude].every(Number.isFinite)) continue;
        const intersects = ((currentLatitude > latitude) !== (previousLatitude > latitude))
            && (longitude < (previousLongitude - currentLongitude) * (latitude - currentLatitude)
                / (previousLatitude - currentLatitude) + currentLongitude);
        if (intersects) inside = !inside;
    }
    return inside;
}

function pointInPolygon(longitude, latitude, polygon) {
    if (!Array.isArray(polygon?.[0]) || !pointInRing(longitude, latitude, polygon[0])) return false;
    return !polygon.slice(1).some(ring => pointInRing(longitude, latitude, ring));
}

function segmentDistanceKm(longitude, latitude, start, end) {
    if (!Array.isArray(start) || !Array.isArray(end)) return Infinity;
    const [startLongitude, startLatitude] = start.map(Number);
    const [endLongitude, endLatitude] = end.map(Number);
    if (![startLongitude, startLatitude, endLongitude, endLatitude].every(Number.isFinite)) return Infinity;

    const latitudeScale = 111.195;
    const longitudeScale = latitudeScale * Math.cos(radians(latitude));
    const startX = (startLongitude - longitude) * longitudeScale;
    const startY = (startLatitude - latitude) * latitudeScale;
    const endX = (endLongitude - longitude) * longitudeScale;
    const endY = (endLatitude - latitude) * latitudeScale;
    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const lengthSquared = deltaX * deltaX + deltaY * deltaY;
    const fraction = lengthSquared
        ? Math.max(0, Math.min(1, -(startX * deltaX + startY * deltaY) / lengthSquared))
        : 0;
    return Math.hypot(startX + fraction * deltaX, startY + fraction * deltaY);
}

function polygonDistanceKm(longitude, latitude, polygon) {
    if (pointInPolygon(longitude, latitude, polygon)) return 0;
    let minimum = Infinity;
    for (const ring of polygon || []) {
        for (let index = 1; index < ring.length; index += 1) {
            minimum = Math.min(minimum, segmentDistanceKm(longitude, latitude, ring[index - 1], ring[index]));
        }
    }
    return minimum;
}

export function geometryDistanceKm(geometry, point) {
    const latitude = Number(point?.latitude);
    const longitude = Number(point?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return Infinity;
    if (geometry?.type === 'Polygon') return polygonDistanceKm(longitude, latitude, geometry.coordinates);
    if (geometry?.type === 'MultiPolygon') {
        return Math.min(...(geometry.coordinates || []).map(polygon => polygonDistanceKm(longitude, latitude, polygon)));
    }
    return Infinity;
}

export function alertIdentifier(feature) {
    const properties = feature?.properties || {};
    return String(properties._stormviewSeriesId || feature?.id || properties.id
        || `${properties.sent || ''}:${properties.event || ''}:${properties.areaDesc || ''}`).slice(0, 500);
}

export function alertMatchesAudioSettings(feature, settings, point) {
    const properties = feature?.properties || {};
    const event = String(properties.event || '').toLowerCase();
    const severity = String(properties.severity || 'unknown').toLowerCase();
    const threshold = SEVERITY_RANK[settings.alertAudioSeverity] ?? SEVERITY_RANK.severe;
    if ((SEVERITY_RANK[severity] ?? 0) < threshold) return false;

    const typeMatches = settings.alertAudioType === 'all'
        || (settings.alertAudioType === 'tornado' && event.includes('tornado'))
        || (settings.alertAudioType === 'warnings' && event.includes('warning'))
        || (settings.alertAudioType === 'watchesWarnings'
            && (event.includes('watch') || event.includes('warning')));
    if (!typeMatches) return false;

    const distanceMiles = Number(settings.alertAudioDistanceMiles);
    if (!Number.isFinite(distanceMiles) || distanceMiles <= 0) return true;
    return geometryDistanceKm(feature?.geometry, point) <= distanceMiles * 1.609344;
}

export function alertUrgency(feature) {
    const properties = feature?.properties || {};
    const event = String(properties.event || '').toLowerCase();
    const severity = String(properties.severity || '').toLowerCase();
    if (event.includes('tornado') || severity === 'extreme') return 'extreme';
    if (severity === 'severe' || event.includes('warning')) return 'severe';
    return 'standard';
}
