import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { palettes, type Palette, type Side } from './theme';

type SideState = { side: Side; setSide: (s: Side) => void; c: Palette };
const Ctx = createContext<SideState>({ side: 'shop', setSide: () => {}, c: palettes.shop });
const KEY = 'closebuy.side';

/** Which side of Closebuy is showing: Shop (products) or Book (services). Remembered between launches. */
export function SideProvider({ children }: { children: ReactNode }) {
  const [side, setSide] = useState<Side>('shop');
  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => (v === 'book' || v === 'shop') && setSide(v))
      .catch(() => {});
  }, []);
  const value = useMemo(
    () => ({
      side,
      c: palettes[side],
      setSide: (s: Side) => {
        setSide(s);
        AsyncStorage.setItem(KEY, s).catch(() => {});
      },
    }),
    [side]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useSide = () => useContext(Ctx);

/** Colours for the current side. Business and admin screens always use the Shop look unless told otherwise. */
export const useColors = (force?: Side) => {
  const { c } = useContext(Ctx);
  return force ? palettes[force] : c;
};
