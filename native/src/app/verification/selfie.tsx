import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, Stack } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button, Empty, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { useColors } from '@/lib/side';

const PROMPTS: Record<string, string> = {
  turn_left: 'Slowly turn your head to your left',
  turn_right: 'Slowly turn your head to your right',
  nod: 'Nod your head: down, then back up',
  open_mouth: 'Open your mouth wide',
  blink: 'Blink both eyes',
};

/** Live selfie check: a straight-on photo, then one photo per random move, taken by the camera. */
export default function Selfie() {
  const c = useColors('shop');
  const [perm, ask] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const [check, setCheck] = useState<{ id: string; steps: string[] } | null>(null);
  const [step, setStep] = useState(-1); // -1 = straight on
  const [count, setCount] = useState<number | null>(null);
  const [shots, setShots] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const start = async () => {
    setErr(null);
    setShots([]);
    setStep(-1);
    try {
      setCheck(await api('/api/account/liveness', { method: 'POST' }));
      setCount(3);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  // Count down, then take the photo for the current step.
  useEffect(() => {
    if (count === null) return;
    if (count > 0) {
      const t = setTimeout(() => setCount(count - 1), 1000);
      return () => clearTimeout(t);
    }
    (async () => {
      const pic = await cam.current?.takePictureAsync({ quality: 0.6 });
      if (!pic) return setErr('Could not take the photo. Try again.');
      const next = [...shots, pic.uri];
      setShots(next);
      if (check && step + 1 < check.steps.length) {
        setStep(step + 1);
        setCount(3);
      } else {
        setCount(null);
        submit(next);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const submit = async (all: string[]) => {
    if (!check) return;
    setBusy(true);
    try {
      const form = new FormData();
      all.forEach((uri, i) => form.append(i === 0 ? 'neutral' : `move${i - 1}`, { uri, name: `${i}.jpg`, type: 'image/jpeg' } as any));
      await api(`/api/account/liveness/${check.id}`, { method: 'POST', form });
      setDone(true);
    } catch (e: any) {
      setErr(e.message);
      setCheck(null);
    } finally {
      setBusy(false);
    }
  };

  if (!perm) return <Screen side="shop" edges={[]}><Txt side="shop">Loading camera…</Txt></Screen>;
  if (!perm.granted) {
    return (
      <Screen side="shop" edges={[]}>
        <Empty title="Camera needed" body="The selfie check uses your front camera to make sure it’s really you." action={<Button side="shop" title="Allow camera" onPress={ask} />} />
      </Screen>
    );
  }
  if (done) {
    return (
      <Screen side="shop" edges={[]}>
        <Empty title="Selfie check sent" body="Thanks. We’ll review it with your documents." action={<Button side="shop" title="Done" onPress={() => router.back()} />} />
      </Screen>
    );
  }
  const prompt = !check ? 'Hold the phone at eye level in good light.' : step === -1 ? 'Look straight at the camera' : PROMPTS[check.steps[step]] ?? check.steps[step];
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Stack.Screen options={{ title: 'Selfie check' }} />
      <CameraView ref={cam} facing="front" style={{ flex: 1 }} />
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 20, paddingBottom: 40, backgroundColor: 'rgba(0,0,0,0.6)', gap: 10 }}>
        <Txt color="#fff" size={20} weight="800" center>{prompt}</Txt>
        {count !== null ? <Txt color="#fff" size={44} weight="800" center>{count || ' '}</Txt> : null}
        {err ? <Txt color="#ffb4b4" center>{err}</Txt> : null}
        {!check && !busy ? <Button side="shop" title="Start" onPress={start} /> : null}
        {busy ? <Txt color="#fff" center>Sending…</Txt> : null}
        {check ? <Txt color={c.muted} size={12} center>Step {step + 2} of {check.steps.length + 1}</Txt> : null}
      </View>
    </View>
  );
}
