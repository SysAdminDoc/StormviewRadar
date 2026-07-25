const SEVERITY_RANK = Object.freeze({
    unknown: 0,
    minor: 1,
    moderate: 2,
    severe: 3,
    extreme: 4
});

function visitCoordinates(value, bounds) {
    if (!Array.isArray(value)) return;
    if (value.length >= 2 && Number.isFinite(Number(value[0])) && Number.isFinite(Number(value[1]))) {
        const longitude = Number(value[0]);
        const latitude = Number(value[1]);
        bounds.west = Math.min(bounds.west, longitude);
        bounds.east = Math.max(bounds.east, longitude);
        bounds.south = Math.min(bounds.south, latitude);
        bounds.north = Math.max(bounds.north, latitude);
        return;
    }
    value.forEach(child => visitCoordinates(child, bounds));
}

export function featureBounds(feature) {
    const bounds = { west: Infinity, east: -Infinity, south: Infinity, north: -Infinity };
    visitCoordinates(feature?.geometry?.coordinates, bounds);
    return Object.values(bounds).every(Number.isFinite) ? bounds : null;
}

export function alertBannerIdentifier(feature) {
    const properties = feature?.properties || {};
    return String(feature?.id || properties.id
        || `${properties.sent || ''}:${properties.event || ''}:${properties.areaDesc || ''}`).slice(0, 500);
}

export function featureIntersectsBounds(feature, viewport) {
    const bounds = featureBounds(feature);
    if (!bounds || !viewport) return false;
    return bounds.east >= viewport.west
        && bounds.west <= viewport.east
        && bounds.north >= viewport.south
        && bounds.south <= viewport.north;
}

function alertRank(feature) {
    const properties = feature?.properties || {};
    const severity = String(properties.severity || 'unknown').toLowerCase();
    const event = String(properties.event || properties.ps || '').toLowerCase();
    const tornadoBoost = event.includes('tornado') ? 10 : 0;
    const warningBoost = event.includes('warning') ? 2 : event.includes('watch') ? 1 : 0;
    const sent = Date.parse(properties.sent || properties.issue || '') || 0;
    return {
        score: tornadoBoost + warningBoost + (SEVERITY_RANK[severity] || 0) * 10,
        sent
    };
}

export function selectMobileAlert(features, viewport, dismissedIds = new Set()) {
    const visible = (Array.isArray(features) ? features : [])
        .filter(feature => {
            const identifier = alertBannerIdentifier(feature);
            return identifier && !dismissedIds.has(identifier) && featureIntersectsBounds(feature, viewport);
        })
        .sort((left, right) => {
            const leftRank = alertRank(left);
            const rightRank = alertRank(right);
            return rightRank.score - leftRank.score || rightRank.sent - leftRank.sent;
        });
    return {
        feature: visible[0] || null,
        count: visible.length,
        id: visible[0] ? alertBannerIdentifier(visible[0]) : ''
    };
}
