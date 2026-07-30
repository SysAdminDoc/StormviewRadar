import test from 'node:test';
import assert from 'node:assert/strict';

import { parseSpcMcdDetail, parseSpcMcdFeed } from '../src/spc-mcd.js';

const feed = `<?xml version="1.0"?>
<rss><channel>
  <item>
    <title>Mesoscale Discussion 1799</title>
    <link>https://www.spc.noaa.gov/products/md/md1799.html</link>
    <description>Severe-weather discussion</description>
    <pubDate>Wed, 29 Jul 2026 20:40:00 +0000</pubDate>
  </item>
  <item>
    <title>No MDs are in effect</title>
    <link>https://www.spc.noaa.gov/products/md/</link>
  </item>
</channel></rss>`;

const detail = `<pre>
Mesoscale Discussion 1799
Areas affected...Southern Georgia into northern Florida
Concerning...Severe Thunderstorm Watch 532...
Valid 292040Z - 292245Z
SUMMARY...Damaging wind and isolated large hail remain possible.
DISCUSSION...Additional technical detail.
LAT...LON   30128117 29888235 30248425 31378709 30128117
</pre>`;

test('SPC feed parsing accepts only official MCD detail links', () => {
    const entries = parseSpcMcdFeed(feed);
    assert.equal(entries.length, 1);
    assert.equal(entries[0].url, 'https://www.spc.noaa.gov/products/md/md1799.html');
});

test('SPC detail parsing returns the official polygon and discussion text', () => {
    const [entry] = parseSpcMcdFeed(feed);
    const feature = parseSpcMcdDetail(detail, entry);
    assert.equal(feature.id, 'spc-md-1799');
    assert.equal(feature.properties.areasAffected, 'Southern Georgia into northern Florida');
    assert.equal(feature.properties.concerning, 'Severe Thunderstorm Watch 532...');
    assert.match(feature.properties.summary, /Damaging wind/);
    assert.equal(feature.properties.validStart, '2026-07-29T20:40:00.000Z');
    assert.equal(feature.properties.validEnd, '2026-07-29T22:45:00.000Z');
    assert.deepEqual(feature.geometry.coordinates[0][0], [-81.17, 30.12]);
});

test('SPC detail parsing rejects a discussion without a usable polygon', () => {
    assert.throws(() => parseSpcMcdDetail('<pre>Mesoscale Discussion 1</pre>'), /valid discussion polygon/);
});
