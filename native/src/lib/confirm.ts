import { Alert, Platform } from 'react-native';

/** Native "are you sure?" dialog (browser confirm when testing on the web). */
export const confirmAsk = (title: string, body: string, yes: string, onYes: () => void) => {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(`${title}\n\n${body}`)) onYes();
    return;
  }
  Alert.alert(title, body, [{ text: 'No', style: 'cancel' }, { text: yes, style: 'destructive', onPress: onYes }]);
};

/** A simple message box. */
export const tell = (title: string, body?: string) => {
  if (Platform.OS === 'web') globalThis.alert?.(body ? `${title}\n\n${body}` : title);
  else Alert.alert(title, body);
};
