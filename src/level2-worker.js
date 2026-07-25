import { Buffer } from 'buffer';
import level2Data from 'nexrad-level-2-data';

globalThis.Buffer = Buffer;

const { Level2Radar } = level2Data;
const CANVAS_SIZE = 900;
const PRODUCT_FIELDS = Object.freeze({
    reflectivity: 'reflect',
    velocity: 'velocity',
    differentialReflectivity: 'zdr',
    correlationCoefficient: 'rho'
});

let radar = null;

function clamp(value, minimum, maximum) {
    return Math.max(minimum, Math.min(maximum, value));
}

function interpolateColor(stops, value) {
    if (!Number.isFinite(value)) return [0, 0, 0, 0];
    for (let index = 1; index < stops.length; index += 1) {
        const [upperValue, upperColor] = stops[index];
        const [lowerValue, lowerColor] = stops[index - 1];
        if (value <= upperValue) {
            const ratio = clamp((value - lowerValue) / (upperValue - lowerValue), 0, 1);
            return [
                Math.round(lowerColor[0] + (upperColor[0] - lowerColor[0]) * ratio),
                Math.round(lowerColor[1] + (upperColor[1] - lowerColor[1]) * ratio),
                Math.round(lowerColor[2] + (upperColor[2] - lowerColor[2]) * ratio),
                220
            ];
        }
    }
    const color = stops.at(-1)[1];
    return [color[0], color[1], color[2], 220];
}

const REFLECTIVITY_STOPS = [
    [5, [0, 0, 150]], [15, [0, 100, 255]], [25, [0, 180, 255]],
    [35, [0, 200, 0]], [45, [255, 255, 0]], [55, [255, 136, 0]],
    [65, [255, 0, 0]], [75, [255, 0, 255]]
];
const VELOCITY_STOPS = [
    [-64, [0, 0, 170]], [-40, [0, 85, 255]], [-15, [0, 190, 255]],
    [-5, [220, 255, 255]], [0, [255, 255, 255]], [5, [255, 245, 210]],
    [15, [255, 170, 0]], [40, [255, 85, 0]], [64, [220, 0, 0]]
];
const ZDR_STOPS = [
    [-4, [45, 45, 160]], [-1, [0, 150, 255]], [0, [230, 230, 230]],
    [1, [255, 255, 0]], [3, [255, 130, 0]], [6, [210, 0, 100]], [8, [120, 0, 130]]
];
const RHO_STOPS = [
    [0.65, [80, 30, 120]], [0.8, [220, 0, 140]], [0.9, [255, 100, 0]],
    [0.95, [255, 220, 0]], [0.98, [80, 210, 80]], [1, [0, 170, 255]], [1.05, [30, 60, 180]]
];

function productColor(product, value) {
    if (product === 'reflectivity') {
        return value < 5 || value > 100 ? [0, 0, 0, 0] : interpolateColor(REFLECTIVITY_STOPS, value);
    }
    if (product === 'velocity') {
        return value < -64 || value > 64 ? [0, 0, 0, 0] : interpolateColor(VELOCITY_STOPS, value);
    }
    if (product === 'differentialReflectivity') {
        return value < -4 || value > 8 ? [0, 0, 0, 0] : interpolateColor(ZDR_STOPS, value);
    }
    return value < 0.65 || value > 1.05 ? [0, 0, 0, 0] : interpolateColor(RHO_STOPS, value);
}

function selectSweep(product) {
    const field = PRODUCT_FIELDS[product];
    const candidates = radar.listElevations()
        .map(elevation => {
            const records = radar.data[elevation]?.map(item => item.record) || [];
            const productRecords = records.filter(record => record[field]?.moment_data?.length);
            if (!productRecords.length) return null;
            const angle = Math.min(...productRecords.map(record => Number(record.elevation_angle)));
            return { elevation, records: productRecords, angle };
        })
        .filter(Boolean)
        .sort((left, right) => left.angle - right.angle);
    if (!candidates.length) throw new Error(`This volume does not contain ${product}`);
    return candidates[0];
}

function renderProduct(product) {
    if (!radar) throw new Error('No Level II volume is loaded');
    const field = PRODUCT_FIELDS[product];
    if (!field) throw new Error(`Unsupported Level II product: ${product}`);
    const sweep = selectSweep(product);
    const firstRecord = sweep.records[0];
    const volume = firstRecord.volume;
    const moments = sweep.records.map(record => record[field]);
    const maxRangeKm = Math.min(
        460,
        Math.max(...moments.map(moment => moment.first_gate + moment.gate_count * moment.gate_size))
    );

    const radialLookup = new Array(720);
    sweep.records.forEach(record => {
        const index = Math.round(record.azimuth * 2) % 720;
        radialLookup[index] = record[field];
    });
    let lastSeen = null;
    for (let pass = 0; pass < 2; pass += 1) {
        for (let index = 0; index < radialLookup.length; index += 1) {
            if (radialLookup[index]) lastSeen = radialLookup[index];
            else if (lastSeen) radialLookup[index] = lastSeen;
        }
        radialLookup.reverse();
    }

    const canvas = new OffscreenCanvas(CANVAS_SIZE, CANVAS_SIZE);
    const context = canvas.getContext('2d', { alpha: true });
    const image = context.createImageData(CANVAS_SIZE, CANVAS_SIZE);
    const center = CANVAS_SIZE / 2;
    const kmPerPixel = (maxRangeKm * 2) / CANVAS_SIZE;

    for (let y = 0; y < CANVAS_SIZE; y += 1) {
        const dy = y + 0.5 - center;
        for (let x = 0; x < CANVAS_SIZE; x += 1) {
            const dx = x + 0.5 - center;
            const rangeKm = Math.hypot(dx, dy) * kmPerPixel;
            if (rangeKm > maxRangeKm) continue;
            const azimuth = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
            const moment = radialLookup[Math.round(azimuth * 2) % 720];
            if (!moment) continue;
            const gate = Math.floor((rangeKm - moment.first_gate) / moment.gate_size);
            if (gate < 0 || gate >= moment.moment_data.length) continue;
            const color = productColor(product, moment.moment_data[gate]);
            if (!color[3]) continue;
            const offset = (y * CANVAS_SIZE + x) * 4;
            image.data[offset] = color[0];
            image.data[offset + 1] = color[1];
            image.data[offset + 2] = color[2];
            image.data[offset + 3] = color[3];
        }
    }
    context.putImageData(image, 0, 0);
    return {
        bitmap: canvas.transferToImageBitmap(),
        latitude: Number(volume.latitude),
        longitude: Number(volume.longitude),
        maxRangeKm,
        elevationAngle: sweep.angle,
        site: radar.header.ICAO,
        hasGaps: radar.hasGaps,
        isTruncated: radar.isTruncated
    };
}

self.addEventListener('message', event => {
    const { id, type, buffer, product } = event.data || {};
    try {
        if (type === 'load') {
            radar = new Level2Radar(Buffer.from(buffer), { logger: false });
            self.postMessage({ id, type: 'loaded', site: radar.header.ICAO });
            return;
        }
        if (type === 'render') {
            const result = renderProduct(product);
            self.postMessage({ id, type: 'rendered', ...result }, [result.bitmap]);
            return;
        }
        throw new Error('Unknown Level II worker request');
    } catch (error) {
        self.postMessage({ id, type: 'error', message: error?.message || 'Level II processing failed' });
    }
});
