import { X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { API_URL } from '@/lib/api';
import { useColors } from '@/lib/side';
import { Row, Txt } from './ui';

export type SheetResult = { status: 'done'; reference: string } | { status: 'cancelled' };

/**
 * Paystack's checkout inside the app: a full-screen sheet with Paystack's payment page in it
 * (card, bank transfer, USSD and the rest), so the customer never leaves Closebuy for a browser.
 *
 * When Paystack sends the customer back to Closebuy (the callback address, or its own "Cancel payment"
 * link), the sheet closes itself and reports the result. The caller then confirms the payment with the
 * server, which is what actually credits the wallet. A bank's own app may open briefly to approve a payment.
 */
export function PaystackSheet({ url, onClose }: { url: string | null; onClose: (r: SheetResult) => void }) {
  const c = useColors('shop');
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  // Report the result only once, however many navigation events arrive.
  const finished = useRef(false);
  useEffect(() => { if (url) { finished.current = false; setLoading(true); } }, [url]);
  const finish = (r: SheetResult) => {
    if (finished.current) return;
    finished.current = true;
    onClose(r);
  };
  const host = API_URL.replace(/^https?:\/\//, '');

  /** True when the page is heading back to Closebuy: finish instead of loading it. */
  const handle = (next: string): boolean => {
    if (!next.includes(host) || !/[?&](reference|trxref)=/.test(next)) return false;
    const q = new URL(next).searchParams;
    const reference = q.get('reference') ?? q.get('trxref') ?? '';
    finish(q.get('cancelled') ? { status: 'cancelled' } : { status: 'done', reference });
    return true;
  };

  const shouldStart = (req: { url: string }): boolean => {
    if (handle(req.url)) return false;
    // A bank's app or a USSD/phone link: hand it to the phone, keep the sheet open.
    if (!/^https?:/i.test(req.url) && !req.url.startsWith('about:')) {
      Linking.openURL(req.url).catch(() => {});
      return false;
    }
    return true;
  };

  return (
    <Modal visible={!!url} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => finish({ status: 'cancelled' })}>
      <View style={{ flex: 1, backgroundColor: '#ffffff', paddingTop: Platform.OS === 'android' ? insets.top : 0 }}>
        <Row style={{ justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#eeeeee' }}>
          <Txt size={16} weight="700" color="#111111">Secure payment</Txt>
          <Pressable accessibilityRole="button" accessibilityLabel="Close payment" hitSlop={12} onPress={() => finish({ status: 'cancelled' })}>
            <X size={22} color="#111111" />
          </Pressable>
        </Row>
        {url ? (
          <WebView
            source={{ uri: url }}
            onShouldStartLoadWithRequest={shouldStart}
            onNavigationStateChange={(n: WebViewNavigation): void => { handle(n.url); }}
            onLoadEnd={() => setLoading(false)}
            setSupportMultipleWindows={false}
            javaScriptEnabled
            domStorageEnabled
            startInLoadingState
            style={{ flex: 1 }}
          />
        ) : null}
        {loading ? (
          <View pointerEvents="none" style={{ position: 'absolute', top: 120, left: 0, right: 0, alignItems: 'center' }}>
            <ActivityIndicator color={c.primary} />
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

/** Asks the server whether a payment went through, waiting a little for Paystack to confirm it. */
export async function confirmPayment(
  verify: (reference: string) => Promise<{ success: boolean; pending?: boolean; amount?: number; error?: string }>,
  reference: string,
  tries = 10,
) {
  for (let i = 0; i < tries; i++) {
    const r = await verify(reference).catch(() => null);
    if (r && (r.success || !r.pending)) return r;
    await new Promise((res) => setTimeout(res, 3000));
  }
  return { success: false, pending: true } as const;
}
