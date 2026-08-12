const MIN_LAYER_OPACITY = 0.1;
const MAX_LAYER_OPACITY = 1;

const opacityBases = new WeakMap();

function boundedOpacity(value, fallback = MAX_LAYER_OPACITY) {
  const number = Number(value);
  return Number.isFinite(number)
    ? Math.max(MIN_LAYER_OPACITY, Math.min(MAX_LAYER_OPACITY, number))
    : fallback;
}

export function normalizeLayerOpacities(candidate, layerIds, fallback = {}) {
  const source = candidate && typeof candidate === 'object' && !Array.isArray(candidate)
    ? candidate
    : {};
  return Object.fromEntries(layerIds.map(id => [
    id,
    boundedOpacity(source[id], boundedOpacity(fallback[id]))
  ]));
}

function opacityBase(layer) {
  let base = opacityBases.get(layer);
  if (base) return base;
  base = {
    opacity: Number.isFinite(Number(layer.options?.opacity)) ? Number(layer.options.opacity) : 1,
    fillOpacity: Number.isFinite(Number(layer.options?.fillOpacity)) ? Number(layer.options.fillOpacity) : null
  };
  opacityBases.set(layer, base);
  return base;
}

export function applyLayerOpacity(layer, value) {
  if (!layer) return;
  const opacity = boundedOpacity(value);

  if (typeof layer.eachLayer === 'function') {
    layer.eachLayer(child => applyLayerOpacity(child, opacity));
    return;
  }

  const base = opacityBase(layer);
  if (typeof layer.setOpacity === 'function') {
    layer.setOpacity(base.opacity * opacity);
    return;
  }

  const element = layer.getElement?.();
  if (element) {
    element.style.opacity = String(opacity);
    return;
  }

  if (typeof layer.setStyle === 'function') {
    const style = { opacity: base.opacity * opacity };
    if (base.fillOpacity !== null) style.fillOpacity = base.fillOpacity * opacity;
    layer.setStyle(style);
  }
}

export { MAX_LAYER_OPACITY, MIN_LAYER_OPACITY };
