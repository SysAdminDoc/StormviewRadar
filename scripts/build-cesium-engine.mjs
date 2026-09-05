import { build } from 'esbuild';

const stormViewCesiumPlugin = {
  name: 'stormview-cesium',
  setup(context) {
    // Cesium 1.145.0 contains a handful of internal package self-imports.
    // Resolve only the symbols those modules request so the public barrel does
    // not pull every engine export (including unused worker transcoders).
    context.onResolve({ filter: /^@cesium\/engine$/ }, () => ({
      path: 'cesium-self-imports',
      namespace: 'stormview'
    }));
    context.onLoad({ filter: /^cesium-self-imports$/, namespace: 'stormview' }, () => ({
      contents: `
        export { default as Check } from '@cesium/engine/Source/Core/Check.js';
        export { default as destroyObject } from '@cesium/engine/Source/Core/destroyObject.js';
        export { default as MetadataComponentType } from '@cesium/engine/Source/Scene/MetadataComponentType.js';
      `,
      resolveDir: process.cwd(),
      loader: 'js'
    }));

    // StormView renders local imagery and cylinders, never Gaussian-splat SPZ
    // models. Excluding that decoder removes its dynamic code generator and
    // keeps the lazy runtime compatible with the application's strict CSP.
    context.onResolve({ filter: /^@spz-loader\/core$/ }, () => ({
      path: 'disabled-spz',
      namespace: 'stormview'
    }));
    context.onLoad({ filter: /^disabled-spz$/, namespace: 'stormview' }, () => ({
      contents: `
        export function loadSpz() {
          return Promise.reject(new Error('SPZ models are disabled in StormView Radar'));
        }
      `,
      loader: 'js'
    }));
  }
};

await build({
  entryPoints: ['src/cesium-engine-entry.js'],
  bundle: true,
  format: 'esm',
  minify: true,
  outfile: 'vendor/cesium/engine.js',
  platform: 'browser',
  target: ['es2022'],
  // Keep dependency license notices in the deployed bundle in addition to the
  // exact package license copied into vendor/cesium/LICENSE.md.
  legalComments: 'eof',
  plugins: [stormViewCesiumPlugin],
  logLevel: 'info'
});
