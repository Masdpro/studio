import AsyncStorage from '@react-native-async-storage/async-storage';
import { Bike, Briefcase, CircleHelp, CalendarCheck, ClipboardList, Clock, KeyRound, MapPin, Package, Scissors, Search, ShieldCheck, ShoppingBag, Sparkles, Store, Wallet, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, useWindowDimensions, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Row, Txt } from '@/components/ui';
import { useColors } from '@/lib/side';
import { radius, type Side } from '@/lib/theme';

export type TourKind = 'customer' | 'vendor' | 'agent' | 'provider';

type Step = { icon: LucideIcon; title: string; body: string; tint: string };

/** The few things each kind of user needs to know, one card each. */
const TOURS: Record<TourKind, { side: Side; steps: Step[] }> = {
  customer: {
    side: 'shop',
    steps: [
      { icon: Sparkles, title: 'Welcome to Closebuy', body: 'Shop from verified vendors and markets close to you, and book trusted pros, all in one app.', tint: '#ff8f66' },
      { icon: ShoppingBag, title: 'Shop or Book', body: 'Use the switch at the top of Home. Shop is for things you buy; Book is for services like hair, repairs and cleaning.', tint: '#f59e0b' },
      { icon: Search, title: 'Find it fast', body: 'Search by name, then use the filter button to narrow by area, price or shop.', tint: '#0f766e' },
      { icon: Wallet, title: 'Pay your way', body: 'Pay online with Paystack or from your Closebuy wallet. Refunds go straight back to your wallet.', tint: '#7c3aed' },
      { icon: Bike, title: 'Delivery or pickup', body: 'Delivery is a flat ₦1,000 per shop, or pick up yourself with a code. Follow your rider live from Orders.', tint: '#2563eb' },
      { icon: CalendarCheck, title: 'Book in a few taps', body: 'See real prices and free times. Free to cancel or move up to 24 hours before.', tint: '#db2777' },
    ],
  },
  vendor: {
    side: 'shop',
    steps: [
      { icon: Store, title: 'Welcome to your store', body: 'Run your shop from here: orders, products and earnings. Customers close to you find you on Closebuy.', tint: '#ff8f66' },
      { icon: ShieldCheck, title: 'Get verified', body: 'Upload your ID and business documents under Verification. You can sell as soon as our team approves you.', tint: '#0f766e' },
      { icon: Package, title: 'Add your products', body: 'Add photos, prices and stock, with colours and sizes if you have them. Set your address and opening hours in Store details.', tint: '#f59e0b' },
      { icon: ClipboardList, title: 'Accept and prepare', body: 'New orders show on your store home. Accept them, prepare the items, then tap Ready for a rider (or Ready to collect).', tint: '#2563eb' },
      { icon: KeyRound, title: 'Hand over safely', body: 'A rider collects deliveries. For pickups, ask the customer for the 4-digit pickup code in their app.', tint: '#7c3aed' },
      { icon: Wallet, title: 'Get paid', body: 'When an order is delivered or picked up, the money lands in your wallet. Withdraw to your bank from ₦1,000.', tint: '#16a34a' },
    ],
  },
  agent: {
    side: 'shop',
    steps: [
      { icon: Bike, title: 'Welcome, rider', body: 'Earn by delivering orders from shops close to you, on your own time.', tint: '#ff8f66' },
      { icon: ShieldCheck, title: 'Get verified', body: 'Upload your ID and take a quick selfie under Verification. You can take jobs once our team approves you.', tint: '#0f766e' },
      { icon: ClipboardList, title: 'Pick a job', body: 'Open Available to see the pickup and drop-off for each order, then tap Take this delivery.', tint: '#f59e0b' },
      { icon: MapPin, title: 'Collect and go', body: 'Use Directions to reach the shop, then tap I’ve collected it. Keep the app open so the customer can follow you live.', tint: '#2563eb' },
      { icon: KeyRound, title: 'Hand over', body: 'Ask the customer for their 4-digit delivery code and enter it to finish the job.', tint: '#7c3aed' },
      { icon: Wallet, title: 'Errands and earnings', body: 'Send quotes on Errands to shop for customers. Each delivery fee goes to your wallet; withdraw to your bank from ₦1,000.', tint: '#16a34a' },
    ],
  },
  provider: {
    side: 'book',
    steps: [
      { icon: Briefcase, title: 'Welcome to your business', body: 'Customers close to you can find you, see your work and book you from here.', tint: '#6366f1' },
      { icon: ShieldCheck, title: 'Get verified', body: 'Upload your ID under Verification. You can take bookings once our team approves you.', tint: '#0f766e' },
      { icon: Scissors, title: 'Add services and photos', body: 'List each service with its price and how long it takes, and add photos of your work.', tint: '#db2777' },
      { icon: Clock, title: 'Set your hours', body: 'Add your opening hours and days off. Customers only see times you’re actually free.', tint: '#f59e0b' },
      { icon: CalendarCheck, title: 'Answer bookings', body: 'Accept new requests within 4 hours (or turn on Instant booking). When you finish, enter the customer’s 4-digit code to close the job.', tint: '#2563eb' },
      { icon: Wallet, title: 'Get paid', body: 'Customers pay up front and Closebuy holds it. Your earnings go to your wallet; withdraw to your bank from ₦1,000.', tint: '#16a34a' },
    ],
  },
};

const doneKey = (kind: TourKind) => (kind === 'customer' ? 'closebuy-tour-done' : `closebuy-tour-done-${kind}`);

// Lets a screen replay a tour without a restart.
const listeners = new Map<TourKind, Set<() => void>>();
export function replayTour(kind: TourKind = 'customer') {
  AsyncStorage.removeItem(doneKey(kind)).catch(() => {});
  listeners.get(kind)?.forEach((l) => l());
}

/**
 * Whether a first-time tour is showing. `ready` turns true once we know, so other
 * first-launch prompts (like the location request) can wait until the tour is closed.
 */
export function useQuickTour(kind: TourKind = 'customer', enabled = true) {
  const [state, setState] = useState<{ ready: boolean; open: boolean }>({ ready: false, open: false });
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    AsyncStorage.getItem(doneKey(kind))
      .then((v) => live && setState({ ready: true, open: !v }))
      .catch(() => live && setState({ ready: true, open: false }));
    const replay = () => setState({ ready: true, open: true });
    const set = listeners.get(kind) ?? new Set();
    set.add(replay);
    listeners.set(kind, set);
    return () => {
      live = false;
      set.delete(replay);
    };
  }, [kind, enabled]);
  const close = () => {
    AsyncStorage.setItem(doneKey(kind), '1').catch(() => {});
    setState({ ready: true, open: false });
  };
  return { ...state, close };
}

/** A short swipeable welcome tour, shown the first time someone opens the app or their business screen. */
export function QuickTour({ visible, onClose, kind = 'customer' }: { visible: boolean; onClose: () => void; kind?: TourKind }) {
  const { side, steps: STEPS } = TOURS[kind];
  const c = useColors(side);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pager = useRef<{ scrollTo: (o: { x: number; animated?: boolean }) => void } | null>(null);
  const [i, setI] = useState(0);
  const [pageH, setPageH] = useState(0); // pages fill the pager's height so each card sits in the middle
  const last = i === STEPS.length - 1;

  useEffect(() => {
    if (visible) {
      setI(0);
      pager.current?.scrollTo({ x: 0, animated: false });
    }
  }, [visible]);

  const go = (n: number) => {
    setI(n);
    pager.current?.scrollTo({ x: n * width, animated: true });
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const n = Math.round(e.nativeEvent.contentOffset.x / width);
    if (n !== i) setI(Math.max(0, Math.min(STEPS.length - 1, n)));
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}>
        <Row style={{ justifyContent: 'space-between', paddingHorizontal: 20 }}>
          <Txt side={side} size={13} muted weight="600">{`${i + 1} of ${STEPS.length}`}</Txt>
          {!last ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Skip the tour" hitSlop={12} onPress={onClose}>
              <Txt side={side} size={15} weight="700" color={c.muted}>Skip</Txt>
            </Pressable>
          ) : <View />}
        </Row>

        <View style={{ flex: 1 }} onLayout={(e) => setPageH(e.nativeEvent.layout.height)}>
        <ScrollView
          ref={pager as never}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          style={{ flex: 1 }}
        >
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <View key={s.title} style={{ width, height: pageH || undefined, paddingHorizontal: 28, justifyContent: 'center', alignItems: 'center' }}>
                <View style={{ width: 168, height: 168, borderRadius: 84, backgroundColor: `${s.tint}22`, alignItems: 'center', justifyContent: 'center', marginBottom: 36 }}>
                  <View style={{ width: 104, height: 104, borderRadius: radius.xl, backgroundColor: s.tint, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-6deg' }] }}>
                    <Icon color="#fff" size={48} strokeWidth={2.2} />
                  </View>
                </View>
                <Txt side={side} size={26} weight="800" center style={{ letterSpacing: -0.5 }}>{s.title}</Txt>
                <Txt side={side} size={16} center color={c.muted} style={{ marginTop: 12, lineHeight: 23, maxWidth: 340 }}>{s.body}</Txt>
              </View>
            );
          })}
        </ScrollView>
        </View>

        <Row gap={6} style={{ justifyContent: 'center', marginBottom: 22 }}>
          {STEPS.map((s, n) => (
            <Pressable key={s.title} accessibilityLabel={`Go to step ${n + 1}`} hitSlop={6} onPress={() => go(n)}>
              <View style={{ width: n === i ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: n === i ? c.primary : c.border }} />
            </Pressable>
          ))}
        </Row>

        <View style={{ paddingHorizontal: 20 }}>
          <Button side={side} title={last ? 'Get started' : 'Next'} onPress={() => (last ? onClose() : go(i + 1))} />
        </View>
      </View>
    </Modal>
  );
}

/** A small "?" in a business screen's header that replays that screen's tour. */
export function TourButton({ kind }: { kind: TourKind }) {
  const c = useColors(TOURS[kind].side);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="How this works" hitSlop={10} onPress={() => replayTour(kind)} style={{ padding: 4 }}>
      <CircleHelp color={c.text} size={22} />
    </Pressable>
  );
}
