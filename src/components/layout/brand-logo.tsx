import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BrandLogoProps {
  href?: string;
  variant?: 'navbar' | 'footer';
  className?: string;
  priority?: boolean;
  onNavigate?: () => void;
}

const variantConfig = {
  navbar: {
    src: '/logo-navbar.png',
    width: 1024,
    height: 487,
    // Cap width so the intrinsic 1024px asset cannot force horizontal page scroll.
    className:
      'h-[2.75rem] w-auto max-w-[9.5rem] sm:h-[3.25rem] sm:max-w-[11rem] md:h-[3.75rem] md:max-w-[12rem] lg:h-[4.25rem] lg:max-w-[13rem]',
  },
  footer: {
    src: '/logo-navbar.png',
    width: 1024,
    height: 487,
    className: 'h-[4rem] w-auto max-w-[14rem] sm:h-[4.75rem] sm:max-w-[16rem] md:h-[5.25rem] md:max-w-[18rem]',
  },
} as const;

export function BrandLogo({
  href = '/',
  variant = 'navbar',
  className,
  priority = false,
  onNavigate,
}: BrandLogoProps) {
  const config = variantConfig[variant];

  const image = (
    <Image
      src={config.src}
      alt="Singari Sarees"
      width={config.width}
      height={config.height}
      priority={priority}
      sizes="(max-width: 768px) 11rem, 13rem"
      className={cn('object-contain object-left', config.className, className)}
    />
  );

  const content =
    variant === 'footer' ? (
      <span className="inline-block shrink-0 overflow-hidden rounded-lg">{image}</span>
    ) : (
      image
    );

  if (!href) {
    return <span className="inline-block shrink-0">{content}</span>;
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="inline-block shrink-0"
      aria-label="Singari Sarees Home"
    >
      {content}
    </Link>
  );
}
