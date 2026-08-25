import { stormPaletteColor } from './visual-palette.js';

const FEET_PER_KILOFOOT = 1000;
const METERS_PER_FOOT = 0.3048;

function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function threatScore(cell) {
    const hasTvs = cell?.tvs && cell.tvs !== 'NONE';
    const hasMeso = cell?.meso && cell.meso !== 'NONE' && cell.meso !== '0';
    return (hasTvs ? 10000 : 0)
        + (hasMeso ? 5000 : 0)
        + finite(cell?.posh) * 20
        + finite(cell?.maxHailInches) * 100
        + Math.max(0, finite(cell?.maxDbz));
}

function columnColor(cell, palette) {
    return stormPaletteColor(cell, palette);
}

export function stormTopHeightMeters(cell) {
    const topKft = finite(cell?.topKft);
    if (topKft <= 0 || topKft > 100) return 0;
    return topKft * FEET_PER_KILOFOOT * METERS_PER_FOOT;
}

export function stormTopDisplayScale(zoom) {
    const boundedZoom = Math.max(2, Math.min(12, finite(zoom, 4)));
    if (boundedZoom <= 4) return 20;
    if (boundedZoom <= 5) return 12;
    if (boundedZoom <= 6) return 8;
    if (boundedZoom <= 7) return 5;
    if (boundedZoom <= 8) return 3;
    return 2;
}

export function buildStormTopColumns(cells, limit = 200, palette = 'standard') {
    const boundedLimit = Math.max(1, Math.min(300, Math.floor(finite(limit, 200))));
    return (Array.isArray(cells) ? cells : [])
        .map(cell => {
            const heightMeters = stormTopHeightMeters(cell);
            const latitude = finite(cell?.latitude, NaN);
            const longitude = finite(cell?.longitude, NaN);
            if (!heightMeters || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
            return {
                id: `${String(cell.radar || '').slice(0, 4)}-${String(cell.id || '').slice(0, 8)}`,
                latitude,
                longitude,
                heightMeters,
                radiusMeters: Math.max(3500, Math.min(9000, 3500 + Math.max(0, finite(cell.maxDbz) - 35) * 180)),
                color: columnColor(cell, palette),
                maxDbz: finite(cell.maxDbz),
                topKft: finite(cell.topKft),
                posh: finite(cell.posh),
                tvs: String(cell.tvs || ''),
                meso: String(cell.meso || ''),
                score: threatScore(cell)
            };
        })
        .filter(Boolean)
        .sort((left, right) => right.score - left.score || right.heightMeters - left.heightMeters)
        .slice(0, boundedLimit);
}
