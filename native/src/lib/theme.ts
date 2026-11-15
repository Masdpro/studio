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
    primary: '#ff8f66',
    onPrimary: '#ffffff',
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
    soft: '#1b1e27',
    danger: '#ef5b5b',
    success: '#4cc38a',
    dark: true,
  },
};

export const radius = { sm: 8, md: 12, lg: 18, pill: 999 };
export const space = (n: number) => n * 4;
export const CORAL = '#ff8f66';

export const naira = (n: number | null | undefined) =>
  n == null ? '' : `₦${Math.round(n).toLocaleString('en-NG')}`;
