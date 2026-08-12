export const MIN_PRELOAD_WINDOW = 0;
export const MAX_PRELOAD_WINDOW = 8;
export const REDUCED_DATA_PRELOAD_WINDOW = 2;

export function normalizePreloadWindow(value, fallback = 4) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return normalizePreloadWindow(fallback, 4);
  return Math.min(MAX_PRELOAD_WINDOW, Math.max(MIN_PRELOAD_WINDOW, Math.round(numeric)));
}

export function effectivePreloadWindow(value, reducedData = false) {
  const normalized = normalizePreloadWindow(value);
  return reducedData ? Math.min(normalized, REDUCED_DATA_PRELOAD_WINDOW) : normalized;
}

export function frameWindowIndices(length, current, radius, { loop = true } = {}) {
  const frameCount = Math.max(0, Math.floor(Number(length) || 0));
  if (!frameCount) return [];
  const playhead = Math.min(frameCount - 1, Math.max(0, Math.floor(Number(current) || 0)));
  const windowRadius = Math.min(frameCount - 1, normalizePreloadWindow(radius));
  const indices = new Set([playhead]);

  for (let offset = 1; offset <= windowRadius && indices.size < frameCount; offset += 1) {
    const next = playhead + offset;
    const previous = playhead - offset;
    if (loop || next < frameCount) indices.add(loop ? next % frameCount : next);
    if (loop || previous >= 0) indices.add(loop ? (previous + frameCount) % frameCount : previous);
  }
  return [...indices];
}
