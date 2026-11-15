import { router, Stack } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Pressable } from 'react-native';
import { palettes, type Side } from '@/lib/theme';

/** A screen stack that always uses one side's look (business areas keep their colours whichever side is showing). */
export function SideStack({ side }: { side: Side }) {
  const c = palettes[side];
  return (
    <Stack
      screenOptions={({ route }) => ({
        headerStyle: { backgroundColor: c.bg },
        headerTintColor: c.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: c.bg },
        // The first screen of an area goes back to wherever it was opened from.
        headerLeft:
          route.name === 'index'
            ? () => (
                <Pressable accessibilityLabel="Back" hitSlop={12} onPress={() => (router.canGoBack() ? router.back() : router.replace('/account'))} style={{ marginRight: 8 }}>
                  <ChevronLeft color={c.text} size={26} />
                </Pressable>
              )
            : undefined,
      })}
    />
  );
}
