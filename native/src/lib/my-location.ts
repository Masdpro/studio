import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useEffect } from 'react';
import { api } from './api';

const ADDRESS_KEY = 'closebuy-delivery-address';
const ASKED_KEY = 'closebuy-location-asked';

/** `source`: 'auto' from the phone's location, 'manual' when the customer typed or picked it. */
export type SavedAddress = { address: string; latitude?: number; longitude?: number; source: 'auto' | 'manual' };

export async function getSavedAddress(): Promise<SavedAddress | null> {
  try {
    const raw = await AsyncStorage.getItem(ADDRESS_KEY);
    const v = raw ? (JSON.parse(raw) as SavedAddress) : null;
    return v?.address?.trim() ? v : null;
  } catch {
    return null;
  }
}

export function saveAddress(a: SavedAddress) {
  return AsyncStorage.setItem(ADDRESS_KEY, JSON.stringify(a)).catch(() => {});
}

let locatedThisLaunch = false;

/**
 * On landing, asks once to use the phone's location, then keeps the delivery address set to where the
 * customer is (refreshed once per app launch), unless they've chosen an address themselves.
 */
export function useAutoLocation() {
  useEffect(() => {
    if (locatedThisLaunch) return;
    locatedThisLaunch = true;
    (async () => {
      const saved = await getSavedAddress();
      if (saved?.source === 'manual') return;
      let perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted) {
        const asked = await AsyncStorage.getItem(ASKED_KEY).catch(() => null);
        if (asked || !perm.canAskAgain) return; // asked before and they said no: don't nag
        await AsyncStorage.setItem(ASKED_KEY, '1').catch(() => {});
        perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted) return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
      if (!pos) return;
      const { latitude, longitude } = pos.coords;
      const r = await api<{ address?: string }>(`/api/geocode/reverse?lat=${latitude}&lon=${longitude}`).catch(() => null);
      if (!r?.address) return;
      if ((await getSavedAddress())?.source === 'manual') return; // they chose one meanwhile
      await saveAddress({ address: r.address, latitude, longitude, source: 'auto' });
    })().catch(() => {});
  }, []);
}
