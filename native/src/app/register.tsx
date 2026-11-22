import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Captcha } from '@/components/Captcha';
import { Button, Card, Chip, Field, H1, Screen, Txt } from '@/components/ui';
import { api } from '@/lib/api';
import { SERVICE_CATEGORIES } from '@/lib/service-categories';
import { useSession } from '@/lib/session';
import { useSide } from '@/lib/side';
import { rules, type Rule } from '@/lib/field-rules';
import { useFieldChecks } from '@/lib/use-field-checks';

type Kind = 'customer' | 'vendor' | 'provider' | 'delivery_agent';

/** What each kind of sign-up must fill in, and the rule for each entry. */
function rulesFor(kind: Kind, signedIn: boolean): Record<string, Rule> {
  const out: Record<string, Rule> = {};
  if (kind === 'customer' || kind === 'delivery_agent') out.name = rules.personName;
  if (kind === 'vendor' || kind === 'provider') out.businessName = rules.businessName;
  if (kind === 'provider') out.category = (v) => (v ? null : 'Choose what you offer.');
  if (!signedIn) out.email = rules.email;
  if (kind !== 'customer') {
    out.phone = rules.phone;
    out.streetAddress = rules.streetAddress;
    out.city = rules.place;
  }
  if (kind === 'provider') out.area = rules.place;
  if (kind === 'delivery_agent') out.vehicleDetails = rules.maxLength(80, 'the vehicle details');
  if (!signedIn) out.password = rules.newPassword;
  return out;
}
const KINDS: { id: Kind; label: string; blurb: string }[] = [
  { id: 'customer', label: 'Shop and book', blurb: 'Buy from local shops and book services' },
  { id: 'vendor', label: 'Sell products', blurb: 'Open a store on Closebuy' },
  { id: 'provider', label: 'Offer a service', blurb: 'Get booked for what you do' },
  { id: 'delivery_agent', label: 'Deliver orders', blurb: 'Earn by delivering for shops' },
];

export default function Register() {
  const { signIn, user } = useSession();
  const { c } = useSide();
  const [kind, setKind] = useState<Kind>('customer');
  const [f, setF] = useState<Record<string, string>>({ city: 'Lagos', country: 'Nigeria' });
  const set = (k: string) => (v: string) => setF((s) => ({ ...s, [k]: v }));
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [needsCaptcha, setNeedsCaptcha] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ email: string; password: string; devCode?: string } | null>(null);
  const [code, setCode] = useState('');
  const [codeLeft, setCodeLeft] = useState(false);

  const business = kind !== 'customer';
  const fieldRules = useMemo(() => rulesFor(kind, !!user), [kind, user]);
  const checks = useFieldChecks<string>(fieldRules);
  /** Value, change and leave handlers plus the message for one entry. */
  const field = (k: string) => ({
    value: f[k],
    onChangeText: (v: string) => {
      set(k)(v);
      checks.changed(k, v);
    },
    onBlur: () => checks.blur(k, f[k] ?? ''),
    error: checks.error(k),
  });

  const submit = async () => {
    setError(null);
    if (!checks.validateAll(f)) {
      setError('Some entries need fixing. Check the messages above.');
      return;
    }
    setBusy(true);
    try {
      const email = (f.email ?? '').trim().toLowerCase();
      if (user && business) {
        // Already signed in: add the business to this account.
        const path = kind === 'vendor' ? '/api/vendor/profile' : kind === 'provider' ? '/api/provider/profile' : '/api/delivery-agent/profile';
        await api(path, { method: 'POST', body: profileFor(kind, f, user.email) });
        router.replace('/verification');
        return;
      }
      const profile = business ? profileFor(kind, f, email) : undefined;
      const res = await api<{ devCode?: string; emailVerified?: boolean }>('/api/auth/register', {
        body: { email, password: f.password, role: kind, displayName: kind === 'delivery_agent' ? f.name : business ? f.businessName : f.name, phone: f.phone, profile, turnstileToken: captcha },
      });
      if (res.emailVerified) {
        await signIn(email, f.password ?? '');
        router.replace(business ? '/verification' : '/');
        return;
      }
      setPending({ email, password: f.password ?? '', devCode: res.devCode });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!pending) return;
    setError(null);
    setBusy(true);
    try {
      await api('/api/auth/verify-email', { body: { email: pending.email, code: code.trim() } });
      await signIn(pending.email, pending.password);
      router.replace(business ? '/verification' : '/');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (pending) {
    return (
      <Screen edges={[]}>
        <H1>Check your email</H1>
        <Txt muted style={{ marginVertical: 12 }}>We sent a 6-digit code to {pending.email}. Enter it below to finish.</Txt>
        {pending.devCode ? <Txt muted size={12}>Test code: {pending.devCode}</Txt> : null}
        <Field label="Code" value={code} onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))} onBlur={() => setCodeLeft(true)} error={codeLeft ? rules.digits(6, 'the code from the email')(code) : null} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" />
        {error ? <Txt color={c.danger} style={{ marginBottom: 12 }}>{error}</Txt> : null}
        <Button title="Confirm" onPress={confirm} loading={busy} disabled={code.trim().length !== 6} />
        <Button kind="ghost" title="Send a new code" style={{ marginTop: 10 }} onPress={() => api('/api/auth/resend-verification', { body: { email: pending.email } }).catch(() => {})} />
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <H1>{user ? 'Add a business' : 'Join Closebuy'}</H1>
      <Txt muted style={{ marginBottom: 14 }}>What would you like to do?</Txt>
      {KINDS.filter((k) => !user || k.id !== 'customer').map((k) => (
        <Card key={k.id} onPress={() => { setKind(k.id); checks.reset(); setError(null); }} style={{ marginBottom: 8, borderColor: kind === k.id ? c.primary : c.border, borderWidth: kind === k.id ? 2 : 1 }}>
          <Txt weight="700">{k.label}</Txt>
          <Txt muted size={13}>{k.blurb}</Txt>
        </Card>
      ))}
      <View style={{ height: 12 }} />
      {kind === 'customer' || kind === 'delivery_agent' ? <Field label="Your name" {...field('name')} autoComplete="name" /> : null}
      {kind === 'vendor' || kind === 'provider' ? <Field label="Business name" {...field('businessName')} /> : null}
      {kind === 'provider' ? (
        <View style={{ marginBottom: 14 }}>
          <Txt size={13} weight="600" style={{ marginBottom: 6 }}>What do you offer?</Txt>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {SERVICE_CATEGORIES.map((k) => (
              <Chip key={k.id} label={k.label} active={f.category === k.id} onPress={() => { set('category')(k.id); checks.blur('category', k.id); }} />
            ))}
          </ScrollView>
          {checks.error('category') ? <Txt size={12} color={c.danger} style={{ marginTop: 4 }}>{checks.error('category')}</Txt> : null}
        </View>
      ) : null}
      {!user ? <Field label="Email" {...field('email')} autoCapitalize="none" keyboardType="email-address" autoComplete="email" /> : null}
      {business ? <Field label="Mobile number" {...field('phone')} keyboardType="phone-pad" placeholder="08012345678" /> : null}
      {business ? <Field label={kind === 'delivery_agent' ? 'Home address' : 'Business address'} {...field('streetAddress')} /> : null}
      {kind === 'provider' ? <Field label="Area" {...field('area')} placeholder="e.g. Lekki Phase 1" /> : null}
      {business ? <Field label="City" {...field('city')} /> : null}
      {kind === 'delivery_agent' ? <Field label="Vehicle" {...field('vehicleDetails')} placeholder="e.g. Motorcycle, plate ABC123XY" /> : null}
      {!user ? <Field label="Password" {...field('password')} secureTextEntry hint="At least 8 characters" autoComplete="new-password" /> : null}
      {!user ? <Captcha onToken={setCaptcha} onNeeded={setNeedsCaptcha} /> : null}
      {error ? <Txt color={c.danger} style={{ marginBottom: 12 }}>{error}</Txt> : null}
      <Button title={user ? 'Add business' : 'Create account'} onPress={submit} loading={busy} disabled={needsCaptcha && !captcha && !user} />
      <Txt muted size={12} center style={{ marginTop: 14 }}>By continuing you agree to Closebuy’s terms and privacy policy.</Txt>
    </Screen>
  );
}

function profileFor(kind: Kind, f: Record<string, string>, email: string) {
  if (kind === 'vendor') return { contactEmail: email, businessName: f.businessName, phone: f.phone, streetAddress: f.streetAddress, city: f.city, country: f.country ?? 'Nigeria' };
  if (kind === 'provider') return { contactEmail: email, businessName: f.businessName, category: f.category ?? 'other', phone: f.phone, streetAddress: f.streetAddress, area: f.area, city: f.city };
  return { email, name: f.name, phone: f.phone, streetAddress: f.streetAddress, city: f.city, country: f.country ?? 'Nigeria', vehicleDetails: f.vehicleDetails };
}
