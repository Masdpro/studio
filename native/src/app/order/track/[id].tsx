import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { ArrowLeft, Bike, Phone, Share2, ShoppingBag } from 'lucide-react-native';
import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Pressable, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Row, Txt } from '@/components/ui';
import { useGet } from '@/lib/query';
import { useColors } from '@/lib/side';
import { radius } from '@/lib/theme';

type LatLng = { lat: number; lng: number };
type Tracking = {
  status: string;
  step: number;
  total: number;
  headline: string;
  firstName: string | null;
  shop: { name: string; position: LatLng | null } | null;
  destination: LatLng | null;
  rider: { name: string; whatsapp: string | null; position: LatLng | null; updatedAt: string | null } | null;
  etaMinutes: number | null;
  live: boolean;
};

const clock = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/**
 * The map is a small Leaflet page (OpenStreetMap, no API key) inside a WebView.
 * Positions are pushed in with `window.update(...)` so the map never reloads.
 */
const MAP_HTML = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#m{margin:0;height:100%;background:#e8eae6}.p{border-radius:50%;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;color:#fff;font:700 16px sans-serif}</style>
</head><body><div id="m"></div><script>
var map=L.map('m',{zoomControl:false}).setView([6.5244,3.3792],13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'&copy; OpenStreetMap',maxZoom:19}).addTo(map);
var layer=L.layerGroup().addTo(map),fitted=false;
function icon(bg,txt,s){return L.divIcon({className:'',html:'<div class="p" style="width:'+s+'px;height:'+s+'px;background:'+bg+'">'+txt+'</div>',iconSize:[s,s],iconAnchor:[s/2,s/2]});}
window.update=function(d){layer.clearLayers();var pts=[];
 if(d.shop){L.marker([d.shop.lat,d.shop.lng],{icon:icon('#0f766e','&#127978;',40)}).addTo(layer);pts.push([d.shop.lat,d.shop.lng]);}
 if(d.dest){L.marker([d.dest.lat,d.dest.lng],{icon:icon('#111827','&#127968;',34)}).addTo(layer);pts.push([d.dest.lat,d.dest.lng]);}
 if(d.rider){L.marker([d.rider.lat,d.rider.lng],{icon:icon('#f97316','&#128757;',44),zIndexOffset:1000}).addTo(layer);pts.push([d.rider.lat,d.rider.lng]);}
 var from=d.rider||d.shop;if(from&&d.dest){L.polyline([[from.lat,from.lng],[d.dest.lat,d.dest.lng]],{color:'#0f766e',weight:4,dashArray:'2 8',lineCap:'round'}).addTo(layer);}
 if(pts.length>1&&!fitted){map.fitBounds(pts,{padding:[48,48],maxZoom:16});fitted=true;}else if(pts.length===1){map.setView(pts[0],15);}
 else if(d.rider&&!map.getBounds().pad(-0.1).contains([d.rider.lat,d.rider.lng])){map.panTo([d.rider.lat,d.rider.lng]);}
};
</script></body></html>`;

/** Live tracking for a delivery: progress, ETA, the rider (WhatsApp call) and a map. */
export default function TrackOrder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors('shop');
  const insets = useSafeAreaInsets();
  const q = useGet<{ tracking: Tracking }>(['tracking', id], `/api/orders/${id}/tracking`, { refetchInterval: 10000 });
  const t = q.data?.tracking;
  const web = useRef<WebView>(null);
  const done = t?.status === 'Delivered' || t?.status === 'Cancelled';
  const checkedAt = useMemo(() => new Date(q.dataUpdatedAt || Date.now()), [q.dataUpdatedAt]);
  const eta = t?.etaMinutes ? clock(new Date(checkedAt.getTime() + t.etaMinutes * 60000)) : null;

  const payload = t ? JSON.stringify({ shop: t.shop?.position ?? null, dest: t.destination, rider: t.rider?.position ?? null }) : null;
  useEffect(() => {
    if (payload) web.current?.injectJavaScript(`window.update && window.update(${payload}); true;`);
  }, [payload]);

  const share = () => Share.share({ message: eta ? `My Closebuy order should arrive around ${eta}.` : 'Tracking my Closebuy order.' }).catch(() => {});

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ paddingTop: insets.top + 6, paddingHorizontal: 16 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={10} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ padding: 6, marginLeft: -6 }}>
            <ArrowLeft color={c.text} size={24} />
          </Pressable>
          <Row gap={8}>
            <Pressable onPress={() => Linking.openURL('https://cbuyapp.com/contact')} style={{ backgroundColor: c.primarySoft, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 }}>
              <Txt side="shop" size={12} weight="800" color={c.primary}>NEED HELP?</Txt>
            </Pressable>
            <Pressable accessibilityLabel="Share" onPress={share} style={{ backgroundColor: c.primarySoft, borderRadius: 999, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
              <Share2 color={c.primary} size={16} />
            </Pressable>
          </Row>
        </Row>

        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 12 }}>
          <View style={{ flex: 1 }}>
            <Txt side="shop" size={24} weight="800" numberOfLines={1}>Hi{t?.firstName ? ` ${t.firstName}` : ''},</Txt>
            <Txt side="shop" size={15} style={{ marginTop: 2 }}>{t?.headline ?? 'Loading your order…'}</Txt>
          </View>
          <View style={{ width: 54, height: 54, borderRadius: radius.lg, backgroundColor: c.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
            <ShoppingBag color={c.primary} size={26} />
          </View>
        </Row>

        <Row gap={6} style={{ marginTop: 16 }}>
          {Array.from({ length: t?.total ?? 6 }, (_, i) => (
            <View key={i} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: t && i < t.step ? c.primary : c.soft }} />
          ))}
        </Row>
        <Txt side="shop" size={14} style={{ marginTop: 10, marginBottom: 12 }}>
          {eta ? <><Txt side="shop" size={14} weight="800">{eta}</Txt> · Estimated arrival (about {t?.etaMinutes} min)</> : t?.status === 'Delivered' ? 'Delivered. Enjoy!' : `Updated ${clock(checkedAt)}`}
        </Txt>

        {t?.rider && !done ? (
          <Row gap={12} style={{ backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: radius.xl, padding: 12, marginBottom: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: radius.md, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' }}>
              <Bike color="#b45309" size={24} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt side="shop" weight="700" numberOfLines={1}>{t.rider.name}</Txt>
              <Txt side="shop" size={12} muted>Your rider{t.live ? ' · live' : ''}</Txt>
            </View>
            {t.rider.whatsapp ? (
              <Pressable accessibilityLabel={`WhatsApp call ${t.rider.name}`} onPress={() => Linking.openURL(`https://wa.me/${t.rider!.whatsapp}`)} style={{ backgroundColor: '#25D366', borderRadius: 999, paddingHorizontal: 16, height: 40, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Phone color="#fff" size={16} />
                <Txt color="#fff" weight="700" size={14}>Call</Txt>
              </Pressable>
            ) : null}
          </Row>
        ) : null}
      </View>

      <View style={{ flex: 1, borderTopWidth: 1, borderColor: c.border }}>
        {t ? (
          <WebView
            ref={web as never}
            source={{ html: MAP_HTML }}
            originWhitelist={['*']}
            javaScriptEnabled
            onLoadEnd={(): void => { if (payload) web.current?.injectJavaScript(`window.update && window.update(${payload}); true;`); }}
            style={{ flex: 1 }}
          />
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={c.primary} /></View>
        )}
        {t && !t.rider && !done ? (
          <View pointerEvents="none" style={{ position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 16, backgroundColor: c.card, borderRadius: radius.lg, padding: 12 }}>
            <Txt side="shop" size={13} center>We’ll show your rider here once one picks up your order.</Txt>
          </View>
        ) : null}
      </View>
    </View>
  );
}
