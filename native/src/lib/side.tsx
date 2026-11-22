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

/** Fixes the side for everything inside (business areas keep their look whichever side the customer is browsing). */
const Fixed = createContext<Side | null>(null);
export const FixedSide = ({ side, children }: { side: Side; children: ReactNode }) => <Fixed.Provider value={side}>{children}</Fixed.Provider>;

/** Colours for the current side, or for `force` when given. */
export const useColors = (force?: Side) => {
  const { c } = useContext(Ctx);
  const fixed = useContext(Fixed);
  return force ? palettes[force] : fixed ? palettes[fixed] : c;
};
