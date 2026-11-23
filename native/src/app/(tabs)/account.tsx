import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Bell, Bike, Briefcase, ChevronRight, Compass, FileText, LogOut, Package, PlusCircle, Shield, ShieldCheck, Store, Trash2, UserCog } from 'lucide-react-native';
import { Alert, Platform, View } from 'react-native';
import { replayTour } from '@/components/QuickTour';
import { SignInPrompt } from '@/components/SignInPrompt';
import { Card, Divider, H1, ListItem, Screen, Txt } from '@/components/ui';
import { API_URL } from '@/lib/api';
import { useSession } from '@/lib/session';
import { useSide } from '@/lib/side';

export default function Account() {
  const { user, has, signOut } = useSession();
  const { c } = useSide();
  if (!user) return <SignInPrompt title="Your account" body="Sign in to shop, book and run your business on Closebuy." />;
  const chev = <ChevronRight color={c.muted} size={18} />;
  const icon = (I: typeof Bell) => <I color={c.text} size={20} />;
  const business = has('vendor') || has('provider') || has('delivery_agent');

  const confirmSignOut = () => {
    if (Platform.OS === 'web') return void signOut();
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <Screen tabs>
      <H1>{user.name || 'Account'}</H1>
      <Txt muted>{user.email}</Txt>

      {business || has('admin') || has('branch') ? (
        <Card style={{ marginTop: 18 }}>
          <Txt weight="700" muted size={12} style={{ marginBottom: 2 }}>YOUR WORK</Txt>
          {has('vendor') ? <ListItem icon={icon(Store)} title="My store" detail="Orders, products and stock" onPress={() => router.push('/vendor')} right={chev} /> : null}
          {has('branch') ? <ListItem icon={icon(Store)} title="Branch orders" detail="Orders for your branch" onPress={() => router.push('/vendor/orders?as=branch')} right={chev} /> : null}
          {has('provider') ? <ListItem icon={icon(Briefcase)} title="My service business" detail="Bookings, services and hours" onPress={() => router.push('/pro')} right={chev} /> : null}
          {has('delivery_agent') ? <ListItem icon={icon(Bike)} title="Deliveries" detail="Jobs near you and errands" onPress={() => router.push('/agent')} right={chev} /> : null}
          {has('admin') ? <ListItem icon={icon(Shield)} title="Admin" detail="Run Closebuy" onPress={() => router.push('/admin')} right={chev} /> : null}
          {business ? <ListItem icon={icon(ShieldCheck)} title="Verification" detail="ID documents and selfie" onPress={() => router.push('/verification')} right={chev} /> : null}
        </Card>
      ) : null}

      <Card style={{ marginTop: 14 }}>
        <ListItem icon={icon(Bell)} title="Notifications" onPress={() => router.push('/notifications')} right={chev} />
        <ListItem icon={icon(Package)} title="Errands" detail="Ask a rider to buy anything for you" onPress={() => router.push('/errands')} right={chev} />
        <ListItem icon={icon(Compass)} title="App tour" detail="A quick look at how shopping and booking work" onPress={() => { router.navigate('/'); replayTour(); }} right={chev} />
        <ListItem icon={icon(UserCog)} title="Profile and password" onPress={() => router.push('/profile')} right={chev} />
        {!has('admin') ? <ListItem icon={icon(PlusCircle)} title="Add a business" detail="Sell, offer a service or deliver" onPress={() => router.push('/register')} right={chev} /> : null}
      </Card>

      <Card style={{ marginTop: 14 }}>
        <ListItem icon={icon(FileText)} title="Terms" onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/terms`)} right={chev} />
        <ListItem icon={icon(FileText)} title="Privacy policy" onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/privacy`)} right={chev} />
        <Divider />
        <ListItem icon={<LogOut color={c.text} size={20} />} title="Sign out" onPress={confirmSignOut} />
        <ListItem icon={<Trash2 color={c.danger} size={20} />} title="Delete my account" danger onPress={() => router.push('/delete-account')} />
      </Card>
      <View style={{ height: 20 }} />
      <Txt center muted size={12}>Closebuy 1.0</Txt>
    </Screen>
  );
}
