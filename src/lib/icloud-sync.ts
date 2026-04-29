import { Platform } from 'react-native';

import { storage } from './storage';

const ICLOUD_SYNC_ENABLED_KEY = 'ICLOUD_SYNC_ENABLED';

type ICloudStore = {
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  setItem: (key: string, value: string) => Promise<void>;
};

let cachedStore: ICloudStore | null | undefined;

function getICloudStore(): ICloudStore | null {
  if (cachedStore !== undefined) {
    return cachedStore;
  }
  if (Platform.OS !== 'ios') {
    cachedStore = null;
    return cachedStore;
  }
  try {
    const module = require('react-native-icloudstore');
    cachedStore = (module.default ?? module) as ICloudStore;
    return cachedStore;
  }
  catch {
    cachedStore = null;
    return cachedStore;
  }
}

export function isICloudSyncSupported() {
  return getICloudStore() !== null;
}

export function isICloudSyncEnabled() {
  return storage.getBoolean?.(ICLOUD_SYNC_ENABLED_KEY) ?? false;
}

export function setICloudSyncEnabled(enabled: boolean) {
  storage.set(ICLOUD_SYNC_ENABLED_KEY, enabled);
}

export async function getICloudJson<T>(key: string): Promise<T | null> {
  const store = getICloudStore();
  if (!store) {
    return null;
  }
  try {
    const raw = await store.getItem(key);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as T;
  }
  catch {
    return null;
  }
}

export async function setICloudJson<T>(key: string, value: T) {
  const store = getICloudStore();
  if (!store) {
    return;
  }
  try {
    await store.setItem(key, JSON.stringify(value));
  }
  catch {
    // Ignore sync errors so local-first behavior remains intact.
  }
}

export async function removeICloudKey(key: string) {
  const store = getICloudStore();
  if (!store) {
    return;
  }
  try {
    await store.removeItem(key);
  }
  catch {
    // Ignore removal failures.
  }
}
