import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { CartProvider } from '@/lib/cart';
import { queryClient } from '@/lib/query';
import { SessionProvider, useSession } from '@/lib/session';
import { SideProvider, useSide } from '@/lib/side';
import { font } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Titles shown while a screen loads (screens refine them once their data arrives).
const TITLES: Record<string, string> = {
  'product/[id]': '',
  'store/[id]': 'Shop',
  'market/[id]': 'Market',
  'order/[id]': 'Order',
  'provider/[slug]': '',
  'book/[serviceId]': 'Book',
  'booking/[id]': 'Booking',
  'portfolio/[serviceId]': 'Photos',
  'errands/index': 'Errands',
  'errands/[id]': 'Errand',
  'verification/index': 'Verification',
  'verification/selfie': 'Selfie check',
  checkout: 'Checkout',
  search: 'Search',
  notifications: 'Notifications',
  profile: 'Profile',
  'delete-account': 'Delete account',
  withdraw: 'Withdraw earnings',
};

export const unstable_settings = { anchor: '(tabs)' };

function Navigator() {
  const { ready: signedInChecked } = useSession();
  const { c } = useSide();
  const [fontsLoaded, fontError] = useFonts({ PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold });
  const ready = signedInChecked && (fontsLoaded || !!fontError);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  if (!ready) return null;
  return (
    <>
      <StatusBar style={c.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerTintColor: c.text,
          headerTitleStyle: { ...font('800'), fontSize: 18 },
          headerShadowVisible: false,
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: c.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ presentation: 'modal', title: 'Sign in' }} />
        <Stack.Screen name="register" options={{ presentation: 'modal', title: 'Create account' }} />
        {Object.entries(TITLES).map(([name, title]) => (
          <Stack.Screen key={name} name={name} options={{ title }} />
        ))}
        {['vendor', 'pro', 'agent', 'admin'].map((name) => (
          <Stack.Screen key={name} name={name} options={{ headerShown: false }} />
        ))}
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <SessionProvider>
          <SideProvider>
            <CartProvider>
              <Navigator />
            </CartProvider>
          </SideProvider>
        </SessionProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
