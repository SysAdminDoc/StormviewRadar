const DAY_MS = 24 * 60 * 60 * 1000;
const DYNAMIC_RADAR_MAX_AGE_MS = 5 * 60 * 1000;
const DEFAULT_MAX_AGE_MS = 6 * 60 * 60 * 1000;
const BASEMAP_MAX_AGE_MS = 7 * DAY_MS;
const ARCHIVE_RADAR_MAX_AGE_MS = 30 * DAY_MS;
const SENSITIVE_QUERY_KEYS = new Set([
  'access_token', 'api_key', 'apikey', 'appid', 'key', 'token'
]);

function requestValue(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'));
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'));
  });
}

function isQuotaError(error) {
  return error?.name === 'QuotaExceededError'
    || /quota/i.test(String(error?.message || ''));
}

export function isCacheableTileUrl(value) {
  try {
    const url = new URL(String(value));
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    return ![...url.searchParams.keys()].some(key => SENSITIVE_QUERY_KEYS.has(key.toLowerCase()));
  } catch {
    return false;
  }
}

export function tileCacheMaxAge(value) {
  try {
    const url = new URL(String(value));
    const host = url.hostname.toLowerCase();
    if (host.endsWith('.basemaps.cartocdn.com')
      || host.endsWith('.tile.opentopomap.org')
      || host === 'server.arcgisonline.com') return BASEMAP_MAX_AGE_MS;
    if (host === 'mesonet.agron.iastate.edu' && url.pathname.includes('/archive/data/')) {
      return ARCHIVE_RADAR_MAX_AGE_MS;
    }
    if (host === 'mesonet.agron.iastate.edu' && url.pathname.includes('/hrrr::')) {
      return ARCHIVE_RADAR_MAX_AGE_MS;
    }
    if (host === 'mesonet.agron.iastate.edu' && url.pathname.includes('/cache/tile.py/')) {
      return DYNAMIC_RADAR_MAX_AGE_MS;
    }
  } catch {}
  return DEFAULT_MAX_AGE_MS;
}

export class IndexedDbTileCache {
  constructor(options = {}) {
    this.indexedDB = options.indexedDB ?? globalThis.indexedDB;
    this.databaseName = options.databaseName || 'stormview-tile-cache';
    this.maxEntries = Math.max(1, Number(options.maxEntries) || 1200);
    this.maxBytes = Math.max(1, Number(options.maxBytes) || 96 * 1024 * 1024);
    this.maxTileBytes = Math.max(1, Number(options.maxTileBytes) || 2 * 1024 * 1024);
    this.now = typeof options.now === 'function' ? options.now : () => Date.now();
    this.onStatus = typeof options.onStatus === 'function' ? options.onStatus : () => {};
    this.openPromise = null;
    this.statsPromise = null;
    this.prunePromise = null;
    this.entryCount = 0;
    this.byteCount = 0;
    this.disabled = !this.indexedDB;
  }

  async open() {
    if (this.disabled) return null;
    if (this.openPromise) return this.openPromise;
    this.openPromise = new Promise((resolve, reject) => {
      const request = this.indexedDB.open(this.databaseName, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        const store = database.objectStoreNames.contains('tiles')
          ? request.transaction.objectStore('tiles')
          : database.createObjectStore('tiles', { keyPath: 'url' });
        if (!store.indexNames.contains('lastAccess')) {
          store.createIndex('lastAccess', 'lastAccess', { unique: false });
        }
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => {
          database.close();
          this.openPromise = null;
        };
        resolve(database);
      };
      request.onerror = () => reject(request.error || new Error('Tile cache could not open'));
      request.onblocked = () => reject(new Error('Tile cache upgrade is blocked'));
    }).catch(error => {
      this.disabled = true;
      this.onStatus({ state: 'disabled', error });
      return null;
    });
    return this.openPromise;
  }

  async ensureStats() {
    if (this.statsPromise) return this.statsPromise;
    this.statsPromise = (async () => {
      const database = await this.open();
      if (!database) return;
      const transaction = database.transaction('tiles', 'readonly');
      const request = transaction.objectStore('tiles').openCursor();
      let count = 0;
      let bytes = 0;
      await new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) {
            resolve();
            return;
          }
          count += 1;
          bytes += Math.max(0, Number(cursor.value?.size) || Number(cursor.value?.blob?.size) || 0);
          cursor.continue();
        };
        request.onerror = () => reject(request.error || new Error('Tile cache scan failed'));
      });
      await transactionComplete(transaction);
      this.entryCount = count;
      this.byteCount = bytes;
      this.onStatus({ state: 'ready', count, bytes });
    })().catch(error => {
      this.disabled = true;
      this.onStatus({ state: 'disabled', error });
    });
    return this.statsPromise;
  }

  async get(url, maxAgeMs = DEFAULT_MAX_AGE_MS) {
    if (!isCacheableTileUrl(url)) return null;
    const database = await this.open();
    if (!database) return null;
    try {
      const transaction = database.transaction('tiles', 'readonly');
      const record = await requestValue(transaction.objectStore('tiles').get(url));
      await transactionComplete(transaction);
      if (!record?.blob) return null;
      const ageLimit = Math.max(0, Number(maxAgeMs) || DEFAULT_MAX_AGE_MS);
      if (this.now() - Number(record.createdAt || 0) > ageLimit) {
        await this.delete(url, record.size);
        return null;
      }
      await this.touch(record).catch(error => this.onStatus({ state: 'touch-error', error }));
      return record.blob;
    } catch (error) {
      this.onStatus({ state: 'read-error', error });
      return null;
    }
  }

  async touch(record) {
    const database = await this.open();
    if (!database) return;
    const transaction = database.transaction('tiles', 'readwrite');
    transaction.objectStore('tiles').put({ ...record, lastAccess: this.now() });
    await transactionComplete(transaction);
  }

  async put(url, blob) {
    if (!isCacheableTileUrl(url) || !blob || !Number.isFinite(blob.size)
      || blob.size <= 0 || blob.size > this.maxTileBytes) return false;
    await this.ensureStats();
    if (this.disabled) return false;
    const record = {
      url,
      blob,
      size: blob.size,
      createdAt: this.now(),
      lastAccess: this.now()
    };

    try {
      await this.writeRecord(record);
    } catch (error) {
      if (!isQuotaError(error)) {
        this.onStatus({ state: 'write-error', error });
        return false;
      }
      await this.prune(
        Math.max(1, Math.floor(this.maxEntries * 0.75)),
        Math.max(1, Math.floor(this.maxBytes * 0.75))
      );
      try {
        await this.writeRecord(record);
      } catch (retryError) {
        this.onStatus({ state: 'quota-error', error: retryError });
        return false;
      }
    }

    if (this.entryCount > this.maxEntries || this.byteCount > this.maxBytes) {
      await this.prune();
    }
    this.onStatus({ state: 'stored', count: this.entryCount, bytes: this.byteCount });
    return true;
  }

  async writeRecord(record) {
    const database = await this.open();
    if (!database) throw new Error('Tile cache is unavailable');
    const transaction = database.transaction('tiles', 'readwrite');
    const store = transaction.objectStore('tiles');
    let prior = null;
    const priorRequest = store.get(record.url);
    priorRequest.onsuccess = () => {
      prior = priorRequest.result || null;
      store.put(record);
    };
    await transactionComplete(transaction);
    this.entryCount += prior ? 0 : 1;
    this.byteCount += record.size - (Number(prior?.size) || 0);
  }

  async delete(url, knownSize = null) {
    const database = await this.open();
    if (!database) return;
    await this.ensureStats();
    const transaction = database.transaction('tiles', 'readwrite');
    const store = transaction.objectStore('tiles');
    let prior = null;
    if (knownSize === null) {
      const priorRequest = store.get(url);
      priorRequest.onsuccess = () => {
        prior = priorRequest.result || null;
        store.delete(url);
      };
    } else {
      store.delete(url);
    }
    await transactionComplete(transaction);
    const size = knownSize === null ? Number(prior?.size) || 0 : Number(knownSize) || 0;
    if (size || prior) {
      this.entryCount = Math.max(0, this.entryCount - 1);
      this.byteCount = Math.max(0, this.byteCount - size);
    }
  }

  async prune(targetEntries = this.maxEntries, targetBytes = this.maxBytes) {
    if (this.prunePromise) return this.prunePromise;
    this.prunePromise = (async () => {
      await this.ensureStats();
      const database = await this.open();
      if (!database) return;
      let count = this.entryCount;
      let bytes = this.byteCount;
      if (count <= targetEntries && bytes <= targetBytes) return;

      const transaction = database.transaction('tiles', 'readwrite');
      const request = transaction.objectStore('tiles').index('lastAccess').openCursor();
      await new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor || (count <= targetEntries && bytes <= targetBytes)) {
            resolve();
            return;
          }
          bytes = Math.max(0, bytes - (Number(cursor.value?.size) || 0));
          count = Math.max(0, count - 1);
          cursor.delete();
          cursor.continue();
        };
        request.onerror = () => reject(request.error || new Error('Tile cache eviction failed'));
      });
      await transactionComplete(transaction);
      this.entryCount = count;
      this.byteCount = bytes;
      this.onStatus({ state: 'pruned', count, bytes });
    })().finally(() => {
      this.prunePromise = null;
    });
    return this.prunePromise;
  }

  async clear() {
    const database = await this.open();
    if (!database) return;
    const transaction = database.transaction('tiles', 'readwrite');
    transaction.objectStore('tiles').clear();
    await transactionComplete(transaction);
    this.entryCount = 0;
    this.byteCount = 0;
    this.statsPromise = Promise.resolve();
  }

  async snapshot() {
    await this.ensureStats();
    return {
      available: !this.disabled,
      count: this.entryCount,
      bytes: this.byteCount,
      maxEntries: this.maxEntries,
      maxBytes: this.maxBytes
    };
  }

  async close() {
    const database = await this.open();
    database?.close();
    this.openPromise = null;
  }
}

export {
  ARCHIVE_RADAR_MAX_AGE_MS,
  BASEMAP_MAX_AGE_MS,
  DEFAULT_MAX_AGE_MS,
  DYNAMIC_RADAR_MAX_AGE_MS
};
