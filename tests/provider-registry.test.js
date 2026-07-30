import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createProviderRegistry,
  OVERLAY_PROVIDER_IDS,
  RADAR_CAPABILITIES
} from '../src/providers/registry.js';

function adapter(id, calls) {
  return {
    attribution: `Attribution for ${id}`,
    load: (...args) => calls.push(['load', id, ...args]),
    cancel: () => calls.push(['cancel', id]),
    status: () => ({ state: 'current', id }),
    dispose: () => calls.push(['dispose', id])
  };
}

test('provider registry exposes complete lifecycle contracts and dispatches overlays', () => {
  const calls = [];
  const radar = Object.fromEntries(Object.keys(RADAR_CAPABILITIES).map(id => [id, adapter(id, calls)]));
  const overlays = Object.fromEntries(OVERLAY_PROVIDER_IDS.map(id => [id, adapter(id, calls)]));
  const registry = createProviderRegistry({ radar, overlays, cancel() {}, status() {} });

  for (const provider of [...registry.list('radar'), ...registry.list('overlay')]) {
    assert.equal(typeof provider.id, 'string');
    assert.ok(provider.capabilities);
    assert.ok(provider.coverage);
    assert.equal(typeof provider.attribution, 'string');
    assert.ok(provider.attribution);
    for (const method of ['load', 'cancel', 'status', 'dispose']) {
      assert.equal(typeof provider[method], 'function', `${provider.id}.${method}`);
    }
  }

  registry.setOverlayEnabled('alerts', true);
  registry.setOverlayEnabled('alerts', false);
  registry.radar('mrms').load('signal', 7);
  assert.deepEqual(calls, [
    ['load', 'alerts'],
    ['dispose', 'alerts'],
    ['load', 'mrms', 'signal', 7]
  ]);
});

test('provider registry rejects missing lifecycle adapters and unknown ids', () => {
  const calls = [];
  const radar = Object.fromEntries(Object.keys(RADAR_CAPABILITIES).map(id => [id, adapter(id, calls)]));
  const overlays = Object.fromEntries(OVERLAY_PROVIDER_IDS.map(id => [id, adapter(id, calls)]));
  delete overlays.alerts.dispose;
  assert.throws(
    () => createProviderRegistry({ radar, overlays, cancel() {}, status() {} }),
    /alerts is missing load\/dispose/
  );

  overlays.alerts = adapter('alerts', calls);
  const registry = createProviderRegistry({ radar, overlays, cancel() {}, status() {} });
  assert.throws(() => registry.radar('unknown'), /Unknown radar provider/);
  assert.throws(() => registry.overlay('unknown'), /Unknown overlay provider/);
});
