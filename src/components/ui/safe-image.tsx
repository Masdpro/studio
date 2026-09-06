'use client';

import { useState, type CSSProperties, type ImgHTMLAttributes } from 'react';
import Image, { type ImageProps } from 'next/image';
import { ALLOWED_IMAGE_HOSTS } from '@/lib/image-hosts';

const FALLBACK_SRC = 'https://placehold.co/600x400.png';

function isOptimizable(src: ImageProps['src']): boolean {
  if (typeof src !== 'string') return true;
  if (src.startsWith('data:') || src.startsWith('/')) return true;
  try {
    return ALLOWED_IMAGE_HOSTS.includes(new URL(src).hostname);
  } catch {
    return false;
  }
}

/**
 * Product/market images can come from a vendor-pasted URL on any site, but
 * next/image throws a hard render error (not just a broken-image icon) for
 * any host missing from next.config's remotePatterns. Fall back to a plain
 * <img> — no optimization, but it degrades to a broken-image icon instead of
 * crashing the page — for hosts we haven't allow-listed, and swap in a
 * placeholder if even that fails to load.
 */
export function SafeImage({ src, alt, fill, style, className, sizes, priority, ...rest }: ImageProps) {
  const [failed, setFailed] = useState(false);

  if (!failed && isOptimizable(src)) {
    return (
      <Image
        src={src}
        alt={alt}
        fill={fill}
        style={style}
        className={className}
        sizes={sizes}
        priority={priority}
        onError={() => setFailed(true)}
        {...rest}
      />
    );
  }

  return (
    <img
      src={failed ? FALLBACK_SRC : (src as string)}
      alt={alt as string}
      className={className}
      style={
        fill
          ? { position: 'absolute', inset: 0, width: '100%', height: '100%', ...(style as CSSProperties) }
          : (style as CSSProperties)
      }
      onError={(e) => {
        if (e.currentTarget.src !== FALLBACK_SRC) e.currentTarget.src = FALLBACK_SRC;
      }}
      {...(rest as ImgHTMLAttributes<HTMLImageElement>)}
    />
  );
}
