import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { authHeaders, fileUrl } from '@/lib/api';
import { useColors } from '@/lib/side';
import { radius, type Side } from '@/lib/theme';

export const tap = () => {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
};

type TxtProps = { children?: ReactNode; style?: StyleProp<TextStyle>; muted?: boolean; size?: number; weight?: '400' | '500' | '600' | '700' | '800'; numberOfLines?: number; color?: string; center?: boolean; side?: Side; selectable?: boolean };
export function Txt({ children, style, muted, size = 15, weight = '400', numberOfLines, color, center, side, selectable }: TxtProps) {
  const c = useColors(side);
  return (
    <Text selectable={selectable} numberOfLines={numberOfLines} style={[{ color: color ?? (muted ? c.muted : c.text), fontSize: size, fontWeight: weight, textAlign: center ? 'center' : undefined, lineHeight: Math.round(size * 1.35) }, style]}>
      {children}
    </Text>
  );
}

export const H1 = (p: TxtProps) => <Txt size={26} weight="800" {...p} style={[{ letterSpacing: -0.5 }, p.style]} />;
export const H2 = (p: TxtProps) => <Txt size={19} weight="700" {...p} style={[{ letterSpacing: -0.3 }, p.style]} />;

/** A full screen: safe area, background, optional pull-to-refresh. */
export function Screen({ children, refreshing, onRefresh, scroll = true, padded = true, side, style, footer, edges = ['top'] }: { children: ReactNode; refreshing?: boolean; onRefresh?: () => void; scroll?: boolean; padded?: boolean; side?: Side; style?: StyleProp<ViewStyle>; footer?: ReactNode; edges?: ('top' | 'bottom')[] }) {
  const c = useColors(side);
  const insets = useSafeAreaInsets();
  const pad = { paddingTop: edges.includes('top') ? insets.top + 8 : 12, paddingHorizontal: padded ? 16 : 0, paddingBottom: (edges.includes('bottom') ? insets.bottom : 0) + 24 };
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[pad, style]}
          keyboardShouldPersistTaps="handled"
          refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.primary} colors={[c.primary]} /> : undefined}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, pad, style]}>{children}</View>
      )}
      {footer ? <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 10, borderTopWidth: StyleSheet.hairlineWidth, borderColor: c.border, backgroundColor: c.card }}>{footer}</View> : null}
    </KeyboardAvoidingView>
  );
}

type BtnProps = { title: string; onPress?: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'danger'; loading?: boolean; disabled?: boolean; icon?: ReactNode; style?: StyleProp<ViewStyle>; small?: boolean; side?: Side };
export function Button({ title, onPress, kind = 'primary', loading, disabled, icon, style, small, side }: BtnProps) {
  const c = useColors(side);
  const bg = kind === 'primary' ? c.primary : kind === 'danger' ? c.danger : kind === 'secondary' ? c.soft : 'transparent';
  const fg = kind === 'primary' ? c.onPrimary : kind === 'danger' ? '#fff' : c.text;
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={off}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        { backgroundColor: bg, borderRadius: radius.md, paddingVertical: small ? 8 : 14, paddingHorizontal: small ? 12 : 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: off ? 0.5 : pressed ? 0.85 : 1 },
        kind === 'ghost' && { borderWidth: 1, borderColor: c.border },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon}
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 14 : 16 }}>{title}</Text>
    </Pressable>
  );
}

export function Field({ label, hint, error, side, ...props }: TextInputProps & { label?: string; hint?: string; error?: string | null; side?: Side }) {
  const c = useColors(side);
  return (
    <View style={{ marginBottom: 14 }}>
      {label ? <Txt size={13} weight="600" side={side} style={{ marginBottom: 6 }}>{label}</Txt> : null}
      <TextInput
        placeholderTextColor={c.muted}
        {...props}
        value={props.value ?? ''}
        style={[{ backgroundColor: c.card, borderWidth: 1, borderColor: error ? c.danger : c.border, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: c.text, minHeight: props.multiline ? 90 : undefined, textAlignVertical: props.multiline ? 'top' : undefined }, props.style]}
      />
      {error ? <Txt size={12} color={c.danger} style={{ marginTop: 4 }}>{error}</Txt> : hint ? <Txt size={12} muted side={side} style={{ marginTop: 4 }}>{hint}</Txt> : null}
    </View>
  );
}

export function Card({ children, style, onPress, side }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; side?: Side }) {
  const c = useColors(side);
  const s = [{ backgroundColor: c.card, borderRadius: radius.lg, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }, style];
  if (!onPress) return <View style={s}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  );
}

export function Chip({ label, active, onPress, side }: { label: string; active?: boolean; onPress?: () => void; side?: Side }) {
  const c = useColors(side);
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: active ? c.primary : c.soft, marginRight: 8 }}
    >
      <Text style={{ color: active ? c.onPrimary : c.text, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info' }) {
  const c = useColors();
  const map = { neutral: [c.soft, c.text], good: ['#d9f3e3', '#17663a'], warn: ['#fff1cc', '#8a5a00'], bad: ['#fde0e0', '#a12828'], info: ['#e1ecff', '#1f4fa8'] } as const;
  const [bg, fg] = map[tone];
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' }}>
      <Text style={{ color: fg, fontSize: 12, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Row({ children, style, gap = 8 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Loading({ side }: { side?: Side }) {
  const c = useColors(side);
  return (
    <View style={{ padding: 40, alignItems: 'center' }}>
      <ActivityIndicator color={c.primary} size="large" />
    </View>
  );
}

export function Empty({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 8 }}>
      {icon}
      <Txt size={17} weight="700" center>{title}</Txt>
      {body ? <Txt muted center>{body}</Txt> : null}
      {action ? <View style={{ marginTop: 10, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  );
}

export function ErrorNote({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const c = useColors();
  if (!error) return null;
  return (
    <Card style={{ borderColor: c.danger, marginVertical: 8 }}>
      <Txt color={c.danger}>{(error as Error)?.message ?? 'Something went wrong.'}</Txt>
      {onRetry ? <Button small kind="ghost" title="Try again" onPress={onRetry} style={{ marginTop: 8, alignSelf: 'flex-start' }} /> : null}
    </Card>
  );
}

export function Img({ uri, style, radius: r = radius.md, contentFit = 'cover', auth }: { uri?: string | null; style?: StyleProp<any>; radius?: number; contentFit?: 'cover' | 'contain'; auth?: boolean }) {
  const c = useColors();
  return <Image source={uri ? { uri: fileUrl(uri), headers: auth ? authHeaders() : undefined } : undefined} style={[{ backgroundColor: c.soft, borderRadius: r }, style]} contentFit={contentFit} transition={150} />;
}

export function Section({ title, action, children, side }: { title: string; action?: ReactNode; children: ReactNode; side?: Side }) {
  return (
    <View style={{ marginTop: 22 }}>
      <Row style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <H2 side={side}>{title}</H2>
        {action}
      </Row>
      {children}
    </View>
  );
}

/** A bottom sheet (native modal sliding up). */
export function Sheet({ visible, onClose, title, children, side }: { visible: boolean; onClose: () => void; title?: string; children: ReactNode; side?: Side }) {
  const c = useColors(side);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} />
        </Pressable>
        <View style={{ backgroundColor: c.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingHorizontal: 18, paddingTop: 10, paddingBottom: insets.bottom + 16, maxHeight: '90%' }}>
          <View style={{ alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: c.border, marginBottom: 12 }} />
          {title ? <H2 side={side} style={{ marginBottom: 12 }}>{title}</H2> : null}
          <ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function Divider() {
  const c = useColors();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: 12 }} />;
}

/** A tappable list row with a label, optional detail and icon. */
export function ListItem({ title, detail, icon, onPress, right, danger }: { title: string; detail?: string; icon?: ReactNode; onPress?: () => void; right?: ReactNode; danger?: boolean }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, opacity: pressed ? 0.6 : 1 }]}>
      {icon}
      <View style={{ flex: 1 }}>
        <Txt weight="600" color={danger ? c.danger : undefined}>{title}</Txt>
        {detail ? <Txt size={13} muted>{detail}</Txt> : null}
      </View>
      {right}
    </Pressable>
  );
}
