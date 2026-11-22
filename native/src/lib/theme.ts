/** Closebuy's two looks: the coral Shop side and the dark silver Book side (same as the website). */
export type Side = 'shop' | 'book';

export type Palette = {
  bg: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  primary: string; // buttons and highlights
  onPrimary: string; // text on primary
  ink: string; // selected tabs and feature cards: glassy cream (Shop) or silver (Book)
  onInk: string; // text on ink
  inkBorder: string; // edge around ink fills
  accent: string; // Add to cart buttons (the website's mellow yellow)
  onAccent: string;
  primarySoft: string; // light tint of primary behind active items
  soft: string; // chips, inputs
  danger: string;
  success: string;
  dark: boolean;
};

export const palettes: Record<Side, Palette> = {
  shop: {
    bg: '#f5f5db',
    card: '#fbfbef',
    text: '#0c0a09',
    muted: '#70705c',
    border: '#dbdbbd',
    primary: '#ff8f66', // the website's coral orange
    onPrimary: '#ffffff',
    ink: 'rgba(251,251,239,0.72)',
    onInk: '#0c0a09',
    inkBorder: '#dbdbbd',
    accent: '#ece393',
    onAccent: '#1a1a1a',
    primarySoft: 'rgba(255,143,102,0.15)',
    soft: '#f0edc2',
    danger: '#e5484d',
    success: '#2f9e5b',
    dark: false,
  },
  book: {
    bg: '#0b0d13',
    card: '#12141c',
    text: '#f3f1ec',
    muted: '#9a9eac',
    border: '#252732',
    primary: '#d6dae0',
    onPrimary: '#0b0d13',
    ink: '#d6dae0',
    onInk: '#0b0d13',
    inkBorder: '#d6dae0',
    accent: '#d6dae0',
    onAccent: '#0b0d13',
    primarySoft: 'rgba(214,218,224,0.12)',
    soft: '#1b1e27',
    danger: '#ef5b5b',
    success: '#4cc38a',
    dark: true,
  },
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 24, pill: 999 };

/** Plus Jakarta Sans, one file per weight (loaded in the root layout). */
export type Weight = '400' | '500' | '600' | '700' | '800';
export const FONT: Record<Weight, string> = {
  '400': 'PlusJakartaSans_400Regular',
  '500': 'PlusJakartaSans_500Medium',
  '600': 'PlusJakartaSans_600SemiBold',
  '700': 'PlusJakartaSans_700Bold',
  '800': 'PlusJakartaSans_800ExtraBold',
};
export const font = (w: Weight = '400') => ({ fontFamily: FONT[w] });
/** Space to leave at the bottom of tab screens so the floating tab bar doesn't cover content. */
export const TAB_BAR_SPACE = 112;
export const space = (n: number) => n * 4;
export const CORAL = '#ff8f66';

/** The soft shadow that makes glassy cream fills float (none on the dark Book side). */
export const glassShadow = { shadowColor: '#70705c', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 };

export const naira = (n: number | null | undefined) =>
  n == null ? '' : `₦${Math.round(n).toLocaleString('en-NG')}`;
