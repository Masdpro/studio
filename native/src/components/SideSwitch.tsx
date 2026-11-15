import { Pressable, Text, View } from 'react-native';
import { useSide } from '@/lib/side';
import { CORAL } from '@/lib/theme';
import { tap } from './ui';

/** Shop / Book switch: flips the whole app between products and services instantly. */
export function SideSwitch() {
  const { side, setSide, c } = useSide();
  const opt = (s: 'shop' | 'book', label: string) => {
    const on = side === s;
    return (
      <Pressable
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        onPress={() => {
          if (!on) {
            tap();
            setSide(s);
          }
        }}
        style={{ paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, backgroundColor: on ? (s === 'shop' ? CORAL : c.primary) : 'transparent' }}
      >
        <Text style={{ fontWeight: '800', color: on ? (s === 'shop' ? '#fff' : c.onPrimary) : c.muted }}>{label}</Text>
      </Pressable>
    );
  };
  return (
    <View style={{ flexDirection: 'row', backgroundColor: c.soft, borderRadius: 999, padding: 4, alignSelf: 'flex-start' }}>
      {opt('shop', 'Shop')}
      {opt('book', 'Book')}
    </View>
  );
}
