'use client';

import {
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from 'react';
import {
  getInstagramHref,
  handleInstagramLinkClick,
  parseInstagramMedia,
} from '@/lib/open-instagram';

type InstagramAppLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href' | 'onClick' | 'children'
> & {
  instagramUrl: string;
  children?: ReactNode;
};

function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Link that opens the exact Instagram reel/post in the native app on phones.
 * iPhone href becomes instagram://media?id={numericId} after mount.
 */
export function InstagramAppLink({
  instagramUrl,
  children,
  className,
  ...rest
}: InstagramAppLinkProps) {
  const webHref = useMemo(() => getInstagramHref(instagramUrl), [instagramUrl]);
  const media = useMemo(() => parseInstagramMedia(instagramUrl), [instagramUrl]);
  const [href, setHref] = useState(webHref);

  useEffect(() => {
    if (isIOSDevice() && media?.mediaId) {
      // Direct app deep link to that media — opens the respective reel in Instagram.
      setHref(`instagram://media?id=${media.mediaId}`);
      return;
    }
    setHref(webHref);
  }, [media?.mediaId, webHref]);

  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Android always uses intent; iOS uses native instagram:// href when available.
    handleInstagramLinkClick(event, instagramUrl);
  };

  return (
    <a {...rest} href={href} onClick={onClick} className={className}>
      {children}
    </a>
  );
}
