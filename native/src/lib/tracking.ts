import * as Location from 'expo-location';
import { useEffect } from 'react';
import { api } from './api';

/** While a rider has orders on the way, shares their position with those customers (every ~30 s, app open). */
export function useShareLocation(orderIds: string[]) {
  const key = orderIds.join(',');
  useEffect(() => {
    if (!orderIds.length) return;
    let sub: Location.LocationSubscription | null = null;
    let last = 0;
    let stopped = false;
    (async () => {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted || stopped) return;
      sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, timeInterval: 15000, distanceInterval: 30 }, (pos) => {
        if (Date.now() - last < 30000) return;
        last = Date.now();
        for (const id of orderIds) {
          api(`/api/orders/${id}/location`, { method: 'PATCH', body: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } }).catch(() => {});
        }
      });
    })();
    return () => {
      stopped = true;
      sub?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
