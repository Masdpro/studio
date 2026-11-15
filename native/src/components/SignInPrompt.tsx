import { router } from 'expo-router';
import { Button, Empty, Screen } from './ui';

export function SignInPrompt({ title, body }: { title: string; body: string }) {
  return (
    <Screen>
      <Empty title={title} body={body} action={<Button title="Sign in" onPress={() => router.push('/sign-in')} />} />
      <Button kind="ghost" title="Create an account" onPress={() => router.push('/register')} />
    </Screen>
  );
}
