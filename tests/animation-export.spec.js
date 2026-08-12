import { expect, test } from '@playwright/test';

const basemapSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="#172554"/><path d="M0 64h128M64 0v128" stroke="#64748b" stroke-width="2"/></svg>');

function radarSvg(color) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" fill="${color}"/><circle cx="64" cy="64" r="38" fill="#ffff00" opacity=".75"/></svg>`);
}

async function prepareAnimationPage(page, { mockMp4 = false, forecastMinute = 180 } = {}) {
  await page.addInitScript(({ enableMp4 }) => {
    localStorage.setItem('stormview_welcomed', '1');
    localStorage.setItem('stormview_settings', JSON.stringify({
      schemaVersion: 9,
      settings: {
        source: 'hrrr',
        basemap: 'dark',
        autoRefresh: false,
        layers: {
          radar: true,
          alerts: false,
          spcOutlook: false,
          states: false,
          counties: false,
          labels: false
        }
      }
    }));
    if (enableMp4) {
      window.__mp4RecorderState = { options: null, starts: 0, stops: 0 };
      class MockMediaRecorder extends EventTarget {
        static isTypeSupported(type) { return type.startsWith('video/mp4'); }
        constructor(stream, options) {
          super();
          this.stream = stream;
          this.mimeType = options.mimeType;
          this.state = 'inactive';
          window.__mp4RecorderState.options = options;
        }
        start() {
          this.state = 'recording';
          window.__mp4RecorderState.starts += 1;
        }
        stop() {
          if (this.state === 'inactive') return;
          this.state = 'inactive';
          window.__mp4RecorderState.stops += 1;
          queueMicrotask(() => {
            const dataEvent = new Event('dataavailable');
            Object.defineProperty(dataEvent, 'data', {
              value: new Blob([new Uint8Array([0, 0, 0, 20, 102, 116, 121, 112, 105, 115, 111, 109])], { type: this.mimeType })
            });
            this.dispatchEvent(dataEvent);
            this.dispatchEvent(new Event('stop'));
          });
        }
      }
      Object.defineProperty(window, 'MediaRecorder', { configurable: true, value: MockMediaRecorder });
    }
  }, { enableMp4: mockMp4 });
  await page.route('https://mesonet.agron.iastate.edu/data/gis/images/4326/hrrr/refd_1080.json', route => route.fulfill({
    json: { model_init_utc: '2026-08-12T12:00:00Z', forecast_minute: forecastMinute }
  }));
  await page.route('https://mesonet.agron.iastate.edu/cache/tile.py/**', route => {
    const url = route.request().url();
    const colors = ['#0064ff', '#00c800', '#ff9900', '#ff0000'];
    const match = url.match(/F(\d{4})/);
    const frameIndex = match ? Math.min(3, Math.round(Number(match[1]) / 60)) : 0;
    return route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: radarSvg(colors[frameIndex])
    });
  });
  await page.route('https://*.basemaps.cartocdn.com/**', route => route.fulfill({
    status: 200,
    contentType: 'image/svg+xml',
    body: basemapSvg
  }));
}

test('animated GIF export captures bounded attributed frames and restores the playhead', async ({ page }) => {
  await prepareAnimationPage(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await page.locator('#playBtn').click();
  const originalFrame = await page.locator('#timeline').getAttribute('aria-valuenow');
  await page.locator('#animationExportBtn').click();
  await expect(page.locator('#animationExportPanel')).toBeVisible();
  await expect(page.locator('#animationExportSummary')).toContainText('4 sampled frames');
  await expect(page.locator('#animationExportFormat')).toHaveValue('gif');
  const nativeMp4 = await page.evaluate(() => [
    'video/mp4;codecs=avc1.42E01E',
    'video/mp4;codecs=avc1.424028',
    'video/mp4'
  ].some(type => MediaRecorder.isTypeSupported(type)));
  expect(await page.locator('#animationExportFormat option[value="mp4"]').isDisabled()).toBe(!nativeMp4);
  await expect(page.locator('#animationExportCancel')).toBeHidden();

  await page.locator('#animationExportDelay').selectOption('250');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#animationExportStart').click();
  await expect(page.locator('#animationExportProgress')).toBeVisible();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^stormview-hrrr.*-reflectivity-animation-\d{8}T\d{6}z\.gif$/);
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const gif = Buffer.concat(chunks);
  expect(gif.subarray(0, 6).toString()).toBe('GIF89a');
  expect(gif.at(-1)).toBe(0x3b);
  expect(gif.length).toBeGreaterThan(5000);

  const decoded = await page.evaluate(async encoded => {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Animated GIF could not be decoded'));
      image.src = `data:image/gif;base64,${encoded}`;
    });
    return { width: image.naturalWidth, height: image.naturalHeight };
  }, gif.toString('base64'));
  expect(decoded.width).toBeGreaterThanOrEqual(280);
  expect(decoded.height).toBeGreaterThan(700);
  expect(decoded.width * decoded.height).toBeLessThanOrEqual(600_000);
  await expect(page.locator('#animationExportPanel')).toBeHidden();
  await expect(page.locator('#timeline')).toHaveAttribute('aria-valuenow', originalFrame);
  await expect(page.getByText('GIF animation saved')).toBeVisible();
});

test('MP4 export uses the browser-supported recorder MIME without relabeling the download', async ({ page }) => {
  await prepareAnimationPage(page, { mockMp4: true });
  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await page.locator('#playBtn').click();
  const originalFrame = await page.locator('#timeline').getAttribute('aria-valuenow');
  await page.locator('#animationExportBtn').click();
  await expect(page.locator('#animationExportFormat option[value="mp4"]')).toBeEnabled();
  await page.locator('#animationExportFormat').selectOption('mp4');
  await page.locator('#animationExportDelay').selectOption('250');
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#animationExportStart').click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.mp4$/);
  const state = await page.evaluate(() => window.__mp4RecorderState);
  expect(state.starts).toBe(1);
  expect(state.stops).toBe(1);
  expect(state.options.mimeType).toMatch(/^video\/mp4/);
  await expect(page.locator('#timeline')).toHaveAttribute('aria-valuenow', originalFrame);
  await expect(page.getByText('MP4 animation saved')).toBeVisible();
});

test('animation export cancellation restores the original frame without downloading', async ({ page }) => {
  await prepareAnimationPage(page, { forecastMinute: 1020 });
  let downloads = 0;
  page.on('download', () => { downloads += 1; });
  await page.goto('/');
  await expect(page.locator('#dataStatus')).toHaveAttribute('data-state', 'current');
  await page.locator('#playBtn').click();
  const originalFrame = await page.locator('#timeline').getAttribute('aria-valuenow');
  await page.locator('#animationExportBtn').click();
  await expect(page.locator('#animationExportSummary')).toContainText('18 sampled frames');
  await page.locator('#animationExportStart').click();
  await expect(page.locator('#animationExportCancel')).toBeVisible();
  await page.locator('#animationExportCancel').click();
  await expect(page.getByText('Animation export cancelled')).toBeVisible();
  await expect(page.locator('body')).not.toHaveClass(/animation-exporting/);
  await expect(page.locator('#timeline')).toHaveAttribute('aria-valuenow', originalFrame);
  expect(downloads).toBe(0);
});
