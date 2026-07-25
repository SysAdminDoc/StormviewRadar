const MAX_MERCATOR_LATITUDE = 85.05112878;

function reportPoint(feature) {
    if (feature?.geometry?.type !== 'Point' || !Array.isArray(feature.geometry.coordinates)) return null;
    const longitude = Number(feature.geometry.coordinates[0]);
    const latitude = Number(feature.geometry.coordinates[1]);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;
    return { latitude, longitude };
}

function worldPixel(point, zoom) {
    const scale = 256 * (2 ** zoom);
    const latitude = Math.max(-MAX_MERCATOR_LATITUDE, Math.min(MAX_MERCATOR_LATITUDE, point.latitude));
    const sine = Math.sin(latitude * Math.PI / 180);
    return {
        x: (point.longitude + 180) / 360 * scale,
        y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale
    };
}

export function clusterStormReports(features, zoom, options = {}) {
    const individualZoom = Math.max(1, Math.min(18, Number(options.individualZoom) || 9));
    const gridSize = Math.max(32, Math.min(160, Number(options.gridSize) || 72));
    const maxReports = Math.max(1, Math.min(2000, Number(options.maxReports) || 1000));
    const valid = (Array.isArray(features) ? features : [])
        .map(feature => ({ feature, point: reportPoint(feature) }))
        .filter(item => item.point)
        .slice(0, maxReports);

    if (Number(zoom) >= individualZoom) {
        return valid.map(item => ({
            kind: 'report',
            count: 1,
            latitude: item.point.latitude,
            longitude: item.point.longitude,
            features: [item.feature]
        }));
    }

    const groups = new Map();
    for (const item of valid) {
        const pixel = worldPixel(item.point, Number(zoom) || 5);
        const key = `${Math.floor(pixel.x / gridSize)}:${Math.floor(pixel.y / gridSize)}`;
        const group = groups.get(key) || {
            latitudeTotal: 0,
            longitudeTotal: 0,
            features: []
        };
        group.latitudeTotal += item.point.latitude;
        group.longitudeTotal += item.point.longitude;
        group.features.push(item.feature);
        groups.set(key, group);
    }

    return [...groups.entries()]
        .map(([key, group]) => ({
            kind: group.features.length > 1 ? 'cluster' : 'report',
            key,
            count: group.features.length,
            latitude: group.latitudeTotal / group.features.length,
            longitude: group.longitudeTotal / group.features.length,
            features: group.features
        }))
        .sort((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

export function stormReportTypeCounts(features) {
    const counts = new Map();
    for (const feature of Array.isArray(features) ? features : []) {
        const type = String(feature?.properties?.typetext || 'Report').trim().slice(0, 80) || 'Report';
        counts.set(type, (counts.get(type) || 0) + 1);
    }
    return [...counts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]));
}
