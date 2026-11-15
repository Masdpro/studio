import * as ImagePicker from 'expo-image-picker';
import { tell } from './confirm';

/** Lets the person take a photo or choose one. Returns the local uri, or null if they cancelled. */
export async function pickPhoto(opts: { camera?: boolean; square?: boolean } = {}): Promise<string | null> {
  const perm = opts.camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    tell('Permission needed', opts.camera ? 'Allow Closebuy to use the camera in your phone settings.' : 'Allow Closebuy to use your photos in your phone settings.');
    return null;
  }
  const o: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 0.8, allowsEditing: !!opts.square, aspect: opts.square ? [1, 1] : undefined };
  const res = opts.camera ? await ImagePicker.launchCameraAsync(o) : await ImagePicker.launchImageLibraryAsync(o);
  if (res.canceled || !res.assets?.[0]) return null;
  return res.assets[0].uri;
}
