export const VISUAL_PALETTE_IDS = Object.freeze(['standard', 'highContrast', 'colorblind']);

const PALETTE_LABELS = Object.freeze({
  standard: 'Standard',
  highContrast: 'High contrast',
  colorblind: 'Color-blind safe'
});

const ALERT_COLORS = Object.freeze({
  standard: Object.freeze({
    tornado: '#ff0000', severe: '#ff6600', flashFlood: '#00ff00', flood: '#00aa00',
    winter: '#ff69b4', warning: '#ff6600', watch: '#ffcc00', info: '#6699ff'
  }),
  highContrast: Object.freeze({
    tornado: '#ff1744', severe: '#ff9100', flashFlood: '#00e676', flood: '#00bfa5',
    winter: '#ff4db8', warning: '#ff9100', watch: '#ffe600', info: '#00b8ff'
  }),
  colorblind: Object.freeze({
    tornado: '#d55e00', severe: '#e69f00', flashFlood: '#0072b2', flood: '#56b4e9',
    winter: '#cc79a7', warning: '#d55e00', watch: '#f0e442', info: '#0072b2'
  })
});

const MESH_STOPS = Object.freeze({
  standard: Object.freeze([
    [6.35, [34, 211, 238, 90]], [12.7, [59, 130, 246, 125]],
    [25.4, [34, 197, 94, 165]], [44.45, [250, 204, 21, 190]],
    [63.5, [249, 115, 22, 210]], [101.6, [239, 68, 68, 230]]
  ]),
  highContrast: Object.freeze([
    [6.35, [0, 229, 255, 125]], [12.7, [0, 102, 255, 150]],
    [25.4, [0, 255, 128, 180]], [44.45, [255, 238, 0, 210]],
    [63.5, [255, 119, 0, 230]], [101.6, [255, 0, 64, 245]]
  ]),
  colorblind: Object.freeze([
    [6.35, [0, 32, 76, 105]], [12.7, [25, 59, 106, 135]],
    [25.4, [59, 86, 135, 165]], [44.45, [127, 137, 150, 195]],
    [63.5, [203, 183, 120, 220]], [101.6, [253, 234, 69, 240]]
  ])
});

const STORM_COLORS = Object.freeze({
  standard: Object.freeze({ tornado: '#ef4444', rotation: '#a855f7', hail: '#f97316', general: '#22d3ee' }),
  highContrast: Object.freeze({ tornado: '#ff1744', rotation: '#c86bff', hail: '#ffb000', general: '#00e5ff' }),
  colorblind: Object.freeze({ tornado: '#d55e00', rotation: '#cc79a7', hail: '#e69f00', general: '#0072b2' })
});

const LEVEL2_STOPS = Object.freeze({
  standard: Object.freeze({
    reflectivity: [[5, [0, 0, 150]], [15, [0, 100, 255]], [25, [0, 180, 255]], [35, [0, 200, 0]], [45, [255, 255, 0]], [55, [255, 136, 0]], [65, [255, 0, 0]], [75, [255, 0, 255]]],
    velocity: [[-64, [0, 0, 170]], [-40, [0, 85, 255]], [-15, [0, 190, 255]], [-5, [220, 255, 255]], [0, [255, 255, 255]], [5, [255, 245, 210]], [15, [255, 170, 0]], [40, [255, 85, 0]], [64, [220, 0, 0]]],
    differentialReflectivity: [[-4, [45, 45, 160]], [-1, [0, 150, 255]], [0, [230, 230, 230]], [1, [255, 255, 0]], [3, [255, 130, 0]], [6, [210, 0, 100]], [8, [120, 0, 130]]],
    correlationCoefficient: [[0.65, [80, 30, 120]], [0.8, [220, 0, 140]], [0.9, [255, 100, 0]], [0.95, [255, 220, 0]], [0.98, [80, 210, 80]], [1, [0, 170, 255]], [1.05, [30, 60, 180]]]
  }),
  highContrast: Object.freeze({
    reflectivity: [[5, [0, 20, 255]], [15, [0, 150, 255]], [25, [0, 255, 255]], [35, [0, 255, 100]], [45, [255, 255, 0]], [55, [255, 128, 0]], [65, [255, 0, 50]], [75, [255, 255, 255]]],
    velocity: [[-64, [0, 0, 255]], [-30, [0, 150, 255]], [-5, [190, 245, 255]], [0, [255, 255, 255]], [5, [255, 240, 190]], [30, [255, 100, 0]], [64, [255, 0, 0]]],
    differentialReflectivity: [[-4, [0, 0, 255]], [-1, [0, 180, 255]], [0, [255, 255, 255]], [1, [255, 255, 0]], [3, [255, 120, 0]], [6, [255, 0, 120]], [8, [160, 0, 255]]],
    correlationCoefficient: [[0.65, [90, 0, 180]], [0.8, [255, 0, 160]], [0.9, [255, 100, 0]], [0.95, [255, 255, 0]], [0.98, [0, 255, 100]], [1, [0, 200, 255]], [1.05, [0, 20, 255]]]
  }),
  colorblind: Object.freeze({
    reflectivity: [[5, [0, 32, 76]], [15, [25, 59, 106]], [25, [59, 86, 135]], [35, [92, 111, 148]], [45, [127, 137, 150]], [55, [165, 156, 143]], [65, [203, 183, 120]], [75, [253, 234, 69]]],
    velocity: [[-64, [0, 70, 140]], [-30, [86, 180, 233]], [-5, [210, 235, 245]], [0, [245, 245, 245]], [5, [250, 225, 180]], [30, [230, 159, 0]], [64, [213, 94, 0]]],
    differentialReflectivity: [[-4, [0, 32, 76]], [-1, [0, 114, 178]], [0, [230, 230, 230]], [1, [240, 228, 66]], [3, [230, 159, 0]], [6, [213, 94, 0]], [8, [204, 121, 167]]],
    correlationCoefficient: [[0.65, [0, 32, 76]], [0.8, [0, 114, 178]], [0.9, [86, 180, 233]], [0.95, [230, 230, 230]], [0.98, [240, 228, 66]], [1, [230, 159, 0]], [1.05, [213, 94, 0]]]
  })
});

export function normalizeVisualPalette(value, fallback = 'standard') {
  return VISUAL_PALETTE_IDS.includes(value) ? value : (VISUAL_PALETTE_IDS.includes(fallback) ? fallback : 'standard');
}

export function visualPaletteLabel(value) {
  return PALETTE_LABELS[normalizeVisualPalette(value)];
}

function alertKind(feature) {
  const properties = feature?.properties || {};
  const event = String(properties.event || properties.ps || '').toLowerCase();
  const phenomena = String(properties.phenomena || '').toUpperCase();
  if (event.includes('tornado') || phenomena === 'TO') return 'tornado';
  if (event.includes('severe thunderstorm') || phenomena === 'SV') return 'severe';
  if (event.includes('flash flood') || phenomena === 'FF') return 'flashFlood';
  if (event.includes('flood')) return 'flood';
  if (event.includes('winter') || event.includes('blizzard')) return 'winter';
  if (event.includes('warning')) return 'warning';
  if (event.includes('watch')) return 'watch';
  return 'info';
}

export function alertPaletteColor(feature, palette = 'standard') {
  return ALERT_COLORS[normalizeVisualPalette(palette)][alertKind(feature)];
}

export function alertPaletteDash(feature, palette = 'standard') {
  const kind = alertKind(feature);
  if (normalizeVisualPalette(palette) !== 'colorblind') return kind === 'watch' ? '5, 5' : null;
  return ({ severe: '10, 4', flashFlood: '3, 5', flood: '3, 5', winter: '12, 4, 2, 4', watch: '7, 5' })[kind] || null;
}

export function meshPaletteStops(palette = 'standard') {
  return MESH_STOPS[normalizeVisualPalette(palette)].map(([threshold, color]) => [threshold, [...color]]);
}

export function stormPaletteColor(cell, palette = 'standard') {
  const colors = STORM_COLORS[normalizeVisualPalette(palette)];
  if (cell?.tvs && cell.tvs !== 'NONE') return colors.tornado;
  if (cell?.meso && cell.meso !== 'NONE' && cell.meso !== '0') return colors.rotation;
  if (Number(cell?.posh) >= 50 || Number(cell?.maxHailInches) >= 1) return colors.hail;
  return colors.general;
}

export function level2PaletteStops(product, palette = 'standard') {
  const normalizedProduct = Object.hasOwn(LEVEL2_STOPS.standard, product) ? product : 'correlationCoefficient';
  return LEVEL2_STOPS[normalizeVisualPalette(palette)][normalizedProduct].map(([value, color]) => [value, [...color]]);
}
