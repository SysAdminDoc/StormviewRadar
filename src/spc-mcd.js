const SPC_ORIGIN = 'https://www.spc.noaa.gov';
const MAX_MCD_ITEMS = 20;

function decodeEntities(value) {
    return String(value || '')
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;/gi, '"')
        .replace(/&apos;|&#39;/gi, "'");
}

function extractElement(markup, tagName) {
    const match = String(markup || '').match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
    return decodeEntities(match?.[1] || '').trim();
}

function plainText(markup) {
    return decodeEntities(String(markup || '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, ' '))
        .replace(/\r/g, '')
        .replace(/[ \t]+/g, ' ')
        .replace(/ *\n */g, '\n')
        .trim();
}

function trustedDetailUrl(value) {
    try {
        const url = new URL(value, SPC_ORIGIN);
        return url.protocol === 'https:'
            && url.origin === SPC_ORIGIN
            && /^\/products\/md\/md\d{4}\.html$/i.test(url.pathname)
            ? url.href
            : '';
    } catch {
        return '';
    }
}

function resolveUtcDay(day, hour, minute, reference) {
    const candidates = [-1, 0, 1].map(monthOffset => new Date(Date.UTC(
        reference.getUTCFullYear(),
        reference.getUTCMonth() + monthOffset,
        day,
        hour,
        minute
    )));
    return candidates.reduce((closest, candidate) => (
        Math.abs(candidate - reference) < Math.abs(closest - reference) ? candidate : closest
    ));
}

function parseValidPeriod(validText, publishedAt) {
    const match = String(validText || '').match(/(\d{2})(\d{2})(\d{2})Z\s*-\s*(\d{2})(\d{2})(\d{2})Z/i);
    const reference = new Date(publishedAt);
    if (!match || !Number.isFinite(reference.getTime())) return {};
    const start = resolveUtcDay(Number(match[1]), Number(match[2]), Number(match[3]), reference);
    const endReference = new Date(start);
    const end = resolveUtcDay(Number(match[4]), Number(match[5]), Number(match[6]), endReference);
    if (end < start) end.setUTCMonth(end.getUTCMonth() + 1);
    return { validStart: start.toISOString(), validEnd: end.toISOString() };
}

export function parseSpcMcdFeed(xml) {
    return [...String(xml || '').matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)]
        .map(match => {
            const item = match[1];
            const url = trustedDetailUrl(extractElement(item, 'link'));
            if (!url) return null;
            return {
                url,
                title: plainText(extractElement(item, 'title')),
                description: plainText(extractElement(item, 'description')),
                publishedAt: extractElement(item, 'pubDate')
            };
        })
        .filter(Boolean)
        .slice(0, MAX_MCD_ITEMS);
}

export function parseSpcMcdDetail(html, feedItem = {}) {
    const preformatted = String(html || '').match(/<pre\b[^>]*>([\s\S]*?)<\/pre>/i)?.[1];
    const text = plainText(preformatted || '');
    const number = text.match(/Mesoscale Discussion\s+(\d{1,4})/i)?.[1];
    const coordinateText = text.slice(Math.max(0, text.search(/LAT\.\.\.LON/i)))
        .replace(/^.*?LAT\.\.\.LON\s*/is, '');
    const coordinates = [];
    for (const token of coordinateText.split(/\s+/)) {
        if (!/^\d{8}$/.test(token)) break;
        const latitude = Number(token.slice(0, 4)) / 100;
        const longitude = -Number(token.slice(4)) / 100;
        if (latitude < 20 || latitude > 55 || longitude < -130 || longitude > -60) continue;
        coordinates.push([longitude, latitude]);
    }
    if (!number || coordinates.length < 3) throw new Error('SPC MCD detail did not contain a valid discussion polygon');
    if (coordinates.at(-1)[0] !== coordinates[0][0] || coordinates.at(-1)[1] !== coordinates[0][1]) {
        coordinates.push([...coordinates[0]]);
    }

    const area = text.match(/Areas affected\.\.\.([^\n]+)/i)?.[1]?.trim() || '';
    const concerning = text.match(/Concerning\.\.\.([^\n]+)/i)?.[1]?.trim() || '';
    const validText = text.match(/Valid\s+(\d{6}Z\s*-\s*\d{6}Z)/i)?.[1]?.replace(/\s+/g, ' ') || '';
    const summary = text.match(/SUMMARY\.\.\.([\s\S]*?)(?:\n\s*DISCUSSION\.\.\.|$)/i)?.[1]
        ?.replace(/\s+/g, ' ')
        .trim() || '';
    const publishedAt = feedItem.publishedAt || '';

    return {
        type: 'Feature',
        id: `spc-md-${number}`,
        geometry: { type: 'Polygon', coordinates: [coordinates] },
        properties: {
            number,
            event: `Mesoscale Discussion ${number}`,
            areasAffected: area,
            concerning,
            summary: summary || feedItem.description || '',
            validText,
            publishedAt,
            ...parseValidPeriod(validText, publishedAt),
            sourceUrl: trustedDetailUrl(feedItem.url)
        }
    };
}
