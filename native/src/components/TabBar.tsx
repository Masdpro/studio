import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Platform, Pressable, Text, View } from 'react-native';
import { useSide } from '@/lib/side';
import { font } from '@/lib/theme';
import { tap } from './ui';

/** The floating, rounded tab bar (dark on the Shop side, frosted navy on the Book side). */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { c, side } = useSide();
  const shop = side === 'shop';
  const routes = state.routes.filter((r) => !(descriptors[r.key]?.options as { hidden?: boolean })?.hidden);
  const bg = shop ? 'rgba(251,251,239,0.82)' : 'rgba(27,30,39,0.94)';
  const active = shop ? c.primary : c.text;
  const idle = c.muted;
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingBottom: Math.max(insets.bottom, 12) + 4 }}>
      <View
        accessibilityRole="tablist"
        style={[
          { height: 68, borderRadius: 26, backgroundColor: bg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, shadowColor: shop ? '#70705c' : '#000', shadowOpacity: shop ? 0.28 : 0.45, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 14 },
          { borderWidth: 1, borderColor: shop ? c.border : 'rgba(214,218,224,0.12)' },
          Platform.OS === 'web' && ({ backdropFilter: 'blur(18px)' } as object),
        ]}
      >
        {routes.map((route) => {
          const { options } = descriptors[route.key];
          const focused = state.routes[state.index]?.key === route.key;
          const color = focused ? active : idle;
          const label = typeof options.title === 'string' ? options.title : route.name;
          const badge = options.tabBarBadge;
          const press = () => {
            const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !e.defaultPrevented) {
              tap();
              navigateToTab(route.key);
            }
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={badge ? `${label}, ${badge}` : label}
              onPress={press}
              style={{ flex: 1, height: 56, marginHorizontal: 2, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: focused && shop ? c.primarySoft : 'transparent' }}
            >
              <View>
                {options.tabBarIcon?.({ focused, color, size: 22 })}
                {badge != null ? (
                  <View style={{ position: 'absolute', top: -6, right: -12, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: c.onPrimary, fontSize: 10, ...font('800') }}>{badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text numberOfLines={1} style={{ color, fontSize: 10, ...font(focused ? '800' : '600') }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
