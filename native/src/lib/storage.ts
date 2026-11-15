import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/** Small key/value storage: the phone's secure keychain, or localStorage when testing in a browser. */
export const storage = {
  async get(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string | null) {
    if (Platform.OS === 'web') {
      try {
        if (value == null) globalThis.localStorage?.removeItem(key);
        else globalThis.localStorage?.setItem(key, value);
      } catch {
        /* storage blocked: stay signed in for this visit only */
      }
      return;
    }
    if (value == null) await SecureStore.deleteItemAsync(key);
    else await SecureStore.setItemAsync(key, value);
  },
};
