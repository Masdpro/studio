import { useState } from 'react';
import { Button, Field, Sheet, Txt } from './ui';
import { useColors } from '@/lib/side';
import type { Side } from '@/lib/theme';

/** Asks for a short reason (or code) before an admin action, then runs it. */
export function ReasonSheet({ title, label, action, visible, onClose, onSubmit, min = 3, numeric, side = 'shop', danger }: { title: string; label: string; action: string; visible: boolean; onClose: () => void; onSubmit: (text: string) => Promise<void>; min?: number; numeric?: boolean; side?: Side; danger?: boolean }) {
  const c = useColors(side);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const go = async () => {
    setErr(null);
    setBusy(true);
    try {
      await onSubmit(text.trim());
      setText('');
      onClose();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet side={side} visible={visible} onClose={onClose} title={title}>
      <Field side={side} label={label} value={text} onChangeText={setText} multiline={!numeric} keyboardType={numeric ? 'number-pad' : undefined} style={numeric ? undefined : { minHeight: 60 }} />
      {err ? <Txt side={side} color={c.danger} style={{ marginBottom: 10 }}>{err}</Txt> : null}
      <Button side={side} kind={danger ? 'danger' : 'primary'} title={action} loading={busy} disabled={text.trim().length < min} onPress={go} />
    </Sheet>
  );
}
