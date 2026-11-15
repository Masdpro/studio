import { Pressable, View } from 'react-native';
import { useColors } from '@/lib/side';
import { radius, type Side } from '@/lib/theme';
import { Txt } from './ui';

export function Stat({ label, value, side, tone }: { label: string; value: string | number; side?: Side; tone?: 'warn' }) {
  const c = useColors(side);
  return (
    <View style={{ flex: 1, minWidth: 140, backgroundColor: c.card, borderRadius: radius.lg, padding: 14, borderWidth: 1, borderColor: tone === 'warn' ? c.primary : c.border }}>
      <Txt side={side} size={12} muted weight="600">{label}</Txt>
      <Txt side={side} size={22} weight="800" style={{ marginTop: 4 }}>{value}</Txt>
    </View>
  );
}

/** Verification status for one business role, shown on that role's dashboard until approved. */
export function ApprovalBanner({ status, note, onPress, side }: { status?: string; note?: string | null; onPress: () => void; side?: Side }) {
  if (!status || status === 'approved') return null;
  return (
    <View style={{ backgroundColor: status === 'rejected' ? '#fde0e0' : '#fff1cc', borderRadius: radius.lg, padding: 14, marginTop: 12 }}>
      <Txt color="#3b2a00" weight="700">{status === 'rejected' ? 'Your verification needs changes' : 'Finish verification to start trading'}</Txt>
      {note ? <Txt color="#3b2a00" size={13} style={{ marginTop: 4 }}>{note}</Txt> : null}
      <Pressable onPress={onPress} hitSlop={8}>
        <Txt color="#b4471f" weight="700" style={{ marginTop: 8 }}>Open verification ›</Txt>
      </Pressable>
    </View>
  );
}
