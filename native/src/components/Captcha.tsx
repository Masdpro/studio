import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { api, API_URL } from '@/lib/api';
import { Txt } from './ui';

/**
 * Cloudflare's "are you a person?" check, shown only when the server has it switched on.
 * Calls onToken with the token (or null when it expires). onReady(false) means no check is needed.
 */
export function Captcha({ onToken, onNeeded }: { onToken: (t: string | null) => void; onNeeded?: (needed: boolean) => void }) {
  const [siteKey, setSiteKey] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    api<{ siteKey: string | null }>('/api/auth/captcha')
      .then((r) => {
        setSiteKey(r.siteKey);
        onNeeded?.(!!r.siteKey);
      })
      .catch(() => {
        setSiteKey(null);
        onNeeded?.(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!siteKey) return null;
  if (Platform.OS === 'web') return <Txt muted size={13}>The security check runs in the phone app.</Txt>;
  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
<style>body{margin:0;display:flex;justify-content:center;background:transparent}</style></head><body>
<div class="cf-turnstile" data-sitekey="${siteKey}" data-callback="ok" data-expired-callback="gone" data-error-callback="gone"></div>
<script>function ok(t){window.ReactNativeWebView.postMessage(t)}function gone(){window.ReactNativeWebView.postMessage('')}</script>
</body></html>`;
  return (
    <View style={{ height: 80, marginBottom: 12 }}>
      <WebView
        originWhitelist={['*']}
        source={{ html, baseUrl: API_URL }}
        style={{ backgroundColor: 'transparent' }}
        onMessage={(e) => onToken(e.nativeEvent.data || null)}
        scrollEnabled={false}
      />
    </View>
  );
}
