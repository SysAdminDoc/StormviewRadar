const WARNING_PHENOMENA = new Set(['TO', 'SV', 'FF', 'MA', 'DS', 'SQ']);
const MAX_GRADIENT_AGE_MINUTES = 180;
const NEW_WARNING_OPACITY = 0.42;
const OLD_WARNING_OPACITY = 0.14;

function propertiesOf(feature) {
    return feature?.properties && typeof feature.properties === 'object'
        ? feature.properties
        : {};
}

function parseTime(value) {
    const timestamp = new Date(value).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
}

function isWarning(feature) {
    const properties = propertiesOf(feature);
    const event = String(properties.event || properties.ps || '').toLowerCase();
    const phenomena = String(properties.phenomena || '').toUpperCase();
    return event.includes('warning')
        || /(?:^|\.)w(?:$|\.)/i.test(event)
        || WARNING_PHENOMENA.has(phenomena);
}

export function alertIssuedAt(feature) {
    const properties = propertiesOf(feature);
    for (const candidate of [
        properties.sent,
        properties.issue,
        properties.effective,
        properties.onset
    ]) {
        const timestamp = parseTime(candidate);
        if (timestamp !== null) return timestamp;
    }
    return null;
}

export function alertHazardColor(feature) {
    const properties = propertiesOf(feature);
    const event = String(properties.event || properties.ps || '').toLowerCase();
    const phenomena = String(properties.phenomena || '').toUpperCase();
    if (event.includes('tornado') || phenomena === 'TO') return '#ff0000';
    if (event.includes('severe thunderstorm') || phenomena === 'SV') return '#ff6600';
    if (event.includes('flash flood') || phenomena === 'FF') return '#00ff00';
    if (event.includes('flood')) return '#00aa00';
    if (event.includes('winter') || event.includes('blizzard')) return '#ff69b4';
    if (event.includes('warning')) return '#ff6600';
    if (event.includes('watch')) return '#ffcc00';
    return '#6699ff';
}

export function alertIssuanceProfile(feature, referenceTime = Date.now()) {
    const issuedAt = alertIssuedAt(feature);
    const reference = Number(referenceTime);
    const warning = isWarning(feature);
    if (!warning) {
        return {
            ageMinutes: issuedAt === null || !Number.isFinite(reference)
                ? null
                : Math.max(0, Math.round((reference - issuedAt) / 60000)),
            bucket: 'static',
            fillOpacity: 0.14,
            lineWeight: 2,
            issuedAt
        };
    }
    if (issuedAt === null || !Number.isFinite(reference)) {
        return {
            ageMinutes: null,
            bucket: 'unknown',
            fillOpacity: 0.2,
            lineWeight: 2,
            issuedAt
        };
    }

    const ageMinutes = Math.max(0, Math.round((reference - issuedAt) / 60000));
    const progress = Math.min(1, ageMinutes / MAX_GRADIENT_AGE_MINUTES);
    const fillOpacity = NEW_WARNING_OPACITY
        - (NEW_WARNING_OPACITY - OLD_WARNING_OPACITY) * progress;
    const bucket = ageMinutes <= 15
        ? 'new'
        : ageMinutes <= 60
            ? 'recent'
            : ageMinutes <= MAX_GRADIENT_AGE_MINUTES ? 'aging' : 'old';
    return {
        ageMinutes,
        bucket,
        fillOpacity: Math.round(fillOpacity * 1000) / 1000,
        lineWeight: ageMinutes <= 15 ? 3 : 2,
        issuedAt
    };
}
