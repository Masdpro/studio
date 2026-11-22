import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button, Field, H1, Screen, Txt } from '@/components/ui';
import { API_URL } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useSide } from '@/lib/side';
import { rules } from '@/lib/field-rules';
import { useFieldChecks } from '@/lib/use-field-checks';

const SIGN_IN_RULES = { email: rules.email, password: (v: string) => (v ? null : 'Enter your password.') };

export default function SignIn() {
  const { signIn } = useSession();
  const { c } = useSide();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const checks = useFieldChecks<'email' | 'password'>(SIGN_IN_RULES);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!checks.validateAll({ email, password })) return;
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]}>
      <H1 style={{ marginTop: 8 }}>Welcome back</H1>
      <Txt muted style={{ marginBottom: 20 }}>Sign in to shop, book and manage your business.</Txt>
      <Field label="Email" {...checks.input('email', email, setEmail)}  autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="emailAddress" />
      <Field label="Password" {...checks.input('password', password, setPassword)}  secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={submit} />
      {error ? <Txt color={c.danger} style={{ marginBottom: 12 }}>{error}</Txt> : null}
      <Button title="Sign in" onPress={submit} loading={busy} disabled={!email || !password} />
      <Pressable onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/auth/forgot-password`)} style={{ marginTop: 18 }}>
        <Txt center weight="600" color={c.text}>Forgot your password?</Txt>
      </Pressable>
      <View style={{ marginTop: 28 }}>
        <Txt center muted>New to Closebuy?</Txt>
        <Button kind="ghost" title="Create an account" onPress={() => router.replace('/register')} style={{ marginTop: 10 }} />
      </View>
    </Screen>
  );
}
