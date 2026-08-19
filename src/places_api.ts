/**
 * See the "How to get an API key" instructions in the Options dialog (see OptionsDialog.vue)
 * for how to obtain the Places API (New) key used by this module.
 */
const LS_API_KEY = 'gmaps-timeline-json-placesapi-key';
const SAMPLE_PLACE_ID = 'ChIJLU7jZClu5kcR4PcOOO6p3I0';
const DB_NAME = 'places-cache';
const DB_STORENAME = 'places';

const CACHE_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CachedPlace {
  placeId: string;
  name: string;
  fetchedAt: number;
}

class PlacesCache {
  private dbPromise: Promise<IDBDatabase> = this.openDatabase();
  async get(placeId: string): Promise<string> {
    if (!placeId) {
      return '';
    }
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORENAME, 'readonly');
      const store = tx.objectStore(DB_STORENAME);
      const request = store.get(placeId);
      request.onerror = () => reject(request.error);
      request.onsuccess = async () => {
        const item = request.result as CachedPlace | undefined;
        if (!item) {
          resolve('');
          return;
        }
        if (item.fetchedAt + CACHE_EXPIRATION_TIME <= Date.now()) {
          await this.delete(placeId);
          resolve('');
          return;
        }
        resolve(item.name);
      };
    });
  }
  async set(placeId: string, name: string): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORENAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(DB_STORENAME).put({
        placeId,
        name,
        fetchedAt: Date.now(),
      });
    });
  }
  async delete(placeId: string): Promise<void> {
    const db = await this.dbPromise;

    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORENAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(DB_STORENAME).delete(placeId);
    });
  }
  private async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(DB_STORENAME)) {
          db.createObjectStore(DB_STORENAME, {
            keyPath: 'placeId',
          });
        }
      };
    });
  }
}

const cache = new PlacesCache();

async function isApiKeyValid(apiKey: string): Promise<boolean> {
  if (!apiKey) {
    return false;
  }
  const response = await fetch(`https://places.googleapis.com/v1/places/${SAMPLE_PLACE_ID}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'displayName',
    },
  });
  let responseData: any;
  try {
    responseData = await response.json();
  } catch (error) {
    console.log('Error parsing JSON response:', error);
    return false;
  }
  if (!response.ok) {
    console.log('API key validation failed:', responseData);
    return false;
  }

  return true;
}

let apiKey: string = localStorage.getItem(LS_API_KEY) || '';

export function hasApiKey(): boolean {
  return !!apiKey;
}

export async function isCurrentApiKeyValid(): Promise<boolean> {
  return await isApiKeyValid(apiKey);
}

export async function setApiKey(newKey: string): Promise<boolean> {
  if (newKey === '') {
    apiKey = '';
    localStorage.removeItem(LS_API_KEY);
    return true;
  }
  if (newKey === apiKey) {
    return true;
  }
  if (!(await isApiKeyValid(newKey))) {
    return false;
  }
  apiKey = newKey;
  localStorage.setItem(LS_API_KEY, apiKey);
  return true;
}

export async function getPlaceDisplayNameFromCache(placeId: string): Promise<string> {
  return await cache.get(placeId);
}

export async function getPlaceDisplayName(placeId: string): Promise<string> {
  if (!apiKey) {
    return '';
  }
  const cachedName = await cache.get(placeId);
  if (cachedName) {
    return cachedName;
  }
  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'displayName',
    },
  });
  let responseData: any;
  try {
    responseData = await response.json();
  } catch (error) {
    console.log('Error parsing JSON response:', error);
    return '';
  }
  if (!response.ok) {
    console.log('Failed to fetch place display name:', responseData);
    return '';
  }
  const displayName = responseData.displayName?.text ?? '';
  await cache.set(placeId, displayName);

  return displayName;
}
