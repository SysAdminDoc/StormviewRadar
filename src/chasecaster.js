const CARDINAL_DIRECTIONS = Object.freeze(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);

export function normalizeHeading(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return ((number % 360) + 360) % 360;
}

export function cardinalDirection(value) {
  const heading = normalizeHeading(value);
  if (heading === null) return '—';
  return CARDINAL_DIRECTIONS[Math.round(heading / 45) % CARDINAL_DIRECTIONS.length];
}

export function smoothHeading(previous, next, factor = 0.25) {
  const target = normalizeHeading(next);
  const current = normalizeHeading(previous);
  if (target === null) return current;
  if (current === null) return target;
  const boundedFactor = Math.max(0, Math.min(1, Number(factor) || 0));
  const shortestDelta = ((target - current + 540) % 360) - 180;
  return normalizeHeading(current + shortestDelta * boundedFactor);
}

export function orientationHeading(event, screenAngle = 0) {
  const webkitHeading = event?.webkitCompassHeading === null || event?.webkitCompassHeading === undefined
    ? null
    : normalizeHeading(event.webkitCompassHeading);
  if (webkitHeading !== null) {
    const accuracy = Number(event?.webkitCompassAccuracy);
    return {
      heading: webkitHeading,
      absolute: true,
      calibrated: !Number.isFinite(accuracy) || accuracy >= 0
    };
  }
  const alpha = event?.alpha === null || event?.alpha === undefined ? Number.NaN : Number(event.alpha);
  if (!Number.isFinite(alpha)) return null;
  return {
    heading: normalizeHeading(360 - alpha + (Number(screenAngle) || 0)),
    absolute: event?.absolute === true || event?.type === 'deviceorientationabsolute',
    calibrated: event?.absolute === true || event?.type === 'deviceorientationabsolute'
  };
}

export function normalizeChasePosition(position) {
  const coords = position?.coords || position;
  const latitude = Number(coords?.latitude);
  const longitude = Number(coords?.longitude);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90
    || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  const accuracy = Number(coords?.accuracy);
  const speed = Number(coords?.speed);
  const course = normalizeHeading(coords?.heading);
  return {
    latitude,
    longitude,
    accuracyMeters: Number.isFinite(accuracy) && accuracy >= 0 ? Math.min(100000, accuracy) : null,
    speedMps: Number.isFinite(speed) && speed >= 0 ? Math.min(200, speed) : null,
    course,
    timestamp: Number.isFinite(Number(position?.timestamp)) ? Number(position.timestamp) : Date.now()
  };
}
