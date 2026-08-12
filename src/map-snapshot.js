const SNAPSHOT_MAX_DIMENSION = 4096;
const SNAPSHOT_MAX_PIXELS = 16_000_000;
const SNAPSHOT_MAX_SCALE = 2;
const SNAPSHOT_FOOTER_HEIGHT = 88;

function finitePositive(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function normalizedText(value, fallback = '') {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || fallback;
}

export function snapshotScale(width, height, requestedScale = SNAPSHOT_MAX_SCALE) {
  const safeWidth = finitePositive(width);
  const safeHeight = finitePositive(height);
  if (!safeWidth || !safeHeight) return 1;
  const requested = Math.max(1, Math.min(SNAPSHOT_MAX_SCALE, finitePositive(requestedScale) || 1));
  const dimensionScale = SNAPSHOT_MAX_DIMENSION / Math.max(safeWidth, safeHeight + SNAPSHOT_FOOTER_HEIGHT);
  const pixelScale = Math.sqrt(SNAPSHOT_MAX_PIXELS / (safeWidth * (safeHeight + SNAPSHOT_FOOTER_HEIGHT)));
  return Math.min(requested, dimensionScale, pixelScale);
}

export function snapshotFilename(source, product, frameTime = new Date()) {
  const date = frameTime instanceof Date ? frameTime : new Date(frameTime);
  const safeDate = Number.isFinite(date.getTime()) ? date : new Date(0);
  const timestamp = safeDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'z');
  const descriptor = [source, product]
    .map(value => normalizedText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    .filter(Boolean)
    .join('-');
  return `stormview-${descriptor || 'radar'}-${timestamp}.png`;
}

export function snapshotAttribution(value) {
  const text = normalizedText(value, 'Provider credits unavailable');
  return text.replace(/^Leaflet\s*\|\s*/i, '');
}

function elementOpacity(element, root) {
  let opacity = 1;
  for (let current = element; current && current !== root.parentElement; current = current.parentElement) {
    const style = getComputedStyle(current);
    if (style.display === 'none' || style.visibility === 'hidden') return 0;
    const value = Number(style.opacity);
    if (Number.isFinite(value)) opacity *= value;
    if (current === root) break;
  }
  return opacity;
}

function elementFilters(element, root) {
  const filters = [];
  for (let current = element; current && current !== root.parentElement; current = current.parentElement) {
    const filter = getComputedStyle(current).filter;
    if (filter && filter !== 'none') filters.unshift(filter);
    if (current === root) break;
  }
  return filters.join(' ') || 'none';
}

function intersects(rect, viewport) {
  return rect.width > 0 && rect.height > 0
    && rect.right > viewport.left && rect.left < viewport.right
    && rect.bottom > viewport.top && rect.top < viewport.bottom;
}

function paneZIndex(pane) {
  const value = Number.parseInt(getComputedStyle(pane).zIndex, 10);
  return Number.isFinite(value) ? value : 0;
}

function collectVisualElements(container) {
  const mapPane = container.querySelector('.leaflet-map-pane');
  if (!mapPane) return [];
  return [...mapPane.children]
    .filter(element => element.classList?.contains('leaflet-pane'))
    .map((pane, order) => ({ pane, order, zIndex: paneZIndex(pane) }))
    .sort((left, right) => left.zIndex - right.zIndex || left.order - right.order)
    .flatMap(({ pane }) => [...pane.querySelectorAll('img, canvas, svg, .leaflet-marker-icon:not(img), .leaflet-tooltip')]
      .filter(element => {
        if (element.matches('svg') && element.closest('svg') !== element) return false;
        if (element.matches('.leaflet-marker-icon:not(img), .leaflet-tooltip')) {
          return !element.parentElement?.closest('.leaflet-marker-icon:not(img), .leaflet-tooltip');
        }
        return !element.closest('.leaflet-marker-icon:not(img), .leaflet-tooltip');
      }));
}

function cloneCanvas(source) {
  const copy = document.createElement('canvas');
  copy.width = source.width;
  copy.height = source.height;
  if (copy.width && copy.height) copy.getContext('2d').drawImage(source, 0, 0);
  return copy;
}

function loadImage(source, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = setTimeout(() => reject(new Error('Snapshot image timed out')), timeoutMs);
    image.onload = () => {
      clearTimeout(timeout);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Snapshot image could not be decoded'));
    };
    image.src = source;
  });
}

async function serializedSvgImage(svg) {
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

const INLINE_STYLE_PROPERTIES = [
  'align-items', 'background', 'background-color', 'border', 'border-radius', 'box-shadow',
  'color', 'display', 'font-family', 'font-size', 'font-weight', 'height', 'justify-content',
  'line-height', 'opacity', 'place-items', 'text-align', 'width'
];

function inlineComputedStyles(source, clone) {
  const style = getComputedStyle(source);
  INLINE_STYLE_PROPERTIES.forEach(property => clone.style.setProperty(property, style.getPropertyValue(property)));
  [...source.children].forEach((child, index) => {
    if (clone.children[index]) inlineComputedStyles(child, clone.children[index]);
  });
}

async function htmlMarkerImage(element, rect) {
  const clone = element.cloneNode(true);
  inlineComputedStyles(element, clone);
  clone.style.margin = '0';
  clone.style.transform = 'none';
  const markup = new XMLSerializer().serializeToString(clone);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(rect.width)}" height="${Math.ceil(rect.height)}"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml">${markup}</div></foreignObject></svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    return await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function drawWrappedText(context, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = normalizedText(text).split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines - 1) break;
  }
  if (line && lines.length < maxLines) lines.push(line);
  const consumed = lines.join(' ').length;
  if (consumed < normalizedText(text).length && lines.length) {
    let last = lines.at(-1);
    while (last.length && context.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last.trimEnd()}…`;
  }
  lines.forEach((value, index) => context.fillText(value, x, y + index * lineHeight));
}

function canvasBlob(canvas) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('The browser could not encode the snapshot'));
      }, 'image/png');
    } catch (error) {
      reject(error);
    }
  });
}

export async function captureLeafletSnapshot(container, options = {}) {
  if (!(container instanceof HTMLElement)) throw new Error('A map container is required');
  const viewport = container.getBoundingClientRect();
  const width = Math.round(viewport.width);
  const height = Math.round(viewport.height);
  if (width < 1 || height < 1) throw new Error('The map is not visible');

  // Copy drawing buffers synchronously before the browser may recycle a WebGL frame.
  const canvasCopies = new Map();
  container.querySelectorAll('canvas').forEach(source => canvasCopies.set(source, cloneCanvas(source)));

  const scale = snapshotScale(width, height, options.scale);
  const footerHeight = SNAPSHOT_FOOTER_HEIGHT;
  const output = document.createElement('canvas');
  output.width = Math.round(width * scale);
  output.height = Math.round((height + footerHeight) * scale);
  const context = output.getContext('2d', { alpha: false });
  context.scale(scale, scale);
  context.fillStyle = normalizedText(options.backgroundColor, '#111827');
  context.fillRect(0, 0, width, height + footerHeight);

  const elements = collectVisualElements(container);
  context.save();
  context.beginPath();
  context.rect(0, 0, width, height);
  context.clip();
  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    if (!intersects(rect, viewport)) continue;
    const opacity = elementOpacity(element, container);
    if (opacity <= 0) continue;
    const x = rect.left - viewport.left;
    const y = rect.top - viewport.top;
    context.save();
    context.globalAlpha = Math.min(1, opacity);
    const filter = elementFilters(element, container);
    if ('filter' in context) context.filter = filter;
    try {
      if (element instanceof HTMLCanvasElement) {
        context.drawImage(canvasCopies.get(element), x, y, rect.width, rect.height);
      } else if (element instanceof HTMLImageElement) {
        if (element.complete && element.naturalWidth > 0) {
          context.drawImage(element, x, y, rect.width, rect.height);
        }
      } else if (element instanceof SVGElement) {
        context.drawImage(await serializedSvgImage(element), x, y, rect.width, rect.height);
      } else {
        context.drawImage(await htmlMarkerImage(element, rect), x, y, rect.width, rect.height);
      }
    } catch (error) {
      if (element instanceof HTMLCanvasElement || element instanceof HTMLImageElement || element instanceof SVGElement) {
        context.restore();
        throw error;
      }
    }
    context.restore();
  }
  context.restore();

  const footerTop = height;
  const darkFooter = normalizedText(options.footerColor, '#07111f');
  context.fillStyle = darkFooter;
  context.fillRect(0, footerTop, width, footerHeight);
  context.fillStyle = normalizedText(options.accentColor, '#38bdf8');
  context.fillRect(0, footerTop, width, 4);

  const padding = Math.max(14, Math.min(24, width * 0.025));
  context.textBaseline = 'top';
  context.fillStyle = '#f8fafc';
  context.font = '700 14px system-ui, -apple-system, Segoe UI, sans-serif';
  const title = normalizedText(options.title, 'StormView Radar');
  context.fillText(title, padding, footerTop + 14, width - padding * 2);
  context.fillStyle = '#cbd5e1';
  context.font = '500 11px system-ui, -apple-system, Segoe UI, sans-serif';
  const frameLabel = normalizedText(options.frameLabel, 'Current radar frame');
  context.fillText(frameLabel, padding, footerTop + 36, width - padding * 2);
  context.fillStyle = '#94a3b8';
  context.font = '400 10px system-ui, -apple-system, Segoe UI, sans-serif';
  drawWrappedText(
    context,
    `Map/data: ${snapshotAttribution(options.attribution)}`,
    padding,
    footerTop + 56,
    width - padding * 2,
    13,
    2
  );

  try {
    return await canvasBlob(output);
  } catch (error) {
    if (error?.name === 'SecurityError') {
      throw new Error('A visible map provider does not permit browser image export');
    }
    throw error;
  }
}

export { SNAPSHOT_FOOTER_HEIGHT, SNAPSHOT_MAX_DIMENSION, SNAPSHOT_MAX_PIXELS };
