'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, Gem, Crown, Heart } from 'lucide-react';
import type { HeroBanner } from '@/types';

interface HeroSectionProps {
  banners: HeroBanner[];
}

const pillars = [
  { icon: Sparkles, label: 'AUTHENTIC WEAVES' },
  { icon: Gem, label: 'PURE TRADITION' },
  { icon: Crown, label: 'TIMELESS ELEGANCE' },
  { icon: Heart, label: 'MADE FOR EVERY YOU' },
];

export function HeroSection({ banners }: HeroSectionProps) {
  const activeBanners = banners.filter((banner) => banner.isActive);
  const slides = activeBanners.length > 0 ? activeBanners : banners;
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const banner = slides[activeIndex];
  const hasMultiple = slides.length > 1;

  const goTo = useCallback(
    (index: number) => {
      if (!slides.length) return;
      setActiveIndex((index + slides.length) % slides.length);
    },
    [slides.length],
  );

  useEffect(() => {
    if (activeIndex < slides.length) return;
    setActiveIndex(0);
  }, [activeIndex, slides.length]);

  useEffect(() => {
    if (!hasMultiple || paused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [hasMultiple, paused, slides.length]);

  return (
    <section
      className="relative min-h-[32rem] overflow-hidden bg-beige pattern-mandala sm:min-h-[38rem] lg:min-h-[42rem]"
      aria-roledescription="carousel"
      aria-label="Featured collections"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current == null) return;
        const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
        const delta = endX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(delta) > 50) goTo(activeIndex + (delta < 0 ? 1 : -1));
      }}
    >
      {slides.map((slide, index) => {
        const desktopImage = slide.imageUrl;
        const mobileImage = slide.mobileImageUrl || desktopImage;
        const visible = index === activeIndex;
        return (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              visible ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            aria-hidden={!visible}
          >
            {mobileImage ? (
              <div className="absolute inset-0 sm:hidden">
                <Image
                  src={mobileImage}
                  alt={slide.title || 'Singari Sarees'}
                  fill
                  priority={index === 0}
                  loading={index === 0 ? undefined : 'lazy'}
                  sizes="100vw"
                  className="object-cover object-top"
                  unoptimized={mobileImage.startsWith('http')}
                />
                <div className="absolute inset-0 bg-cream/10" />
              </div>
            ) : null}
            {desktopImage ? (
              <div className="absolute inset-0 hidden sm:block">
                <Image
                  src={desktopImage}
                  alt={slide.title || 'Singari Sarees'}
                  fill
                  priority={index === 0}
                  loading={index === 0 ? undefined : 'lazy'}
                  sizes="100vw"
                  className="object-cover object-right-top"
                  unoptimized={desktopImage.startsWith('http')}
                />
                <div className="absolute inset-0 bg-cream/10" />
              </div>
            ) : null}
          </div>
        );
      })}

      {/* Decorative corner motifs */}
      <div className="pointer-events-none absolute left-4 top-8 h-24 w-24 opacity-[0.06] sm:left-8">
        <svg viewBox="0 0 100 100" className="h-full w-full fill-maroon">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.5" />
          <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </svg>
      </div>

      <div className="relative mx-auto flex max-w-[90rem] flex-col px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10 lg:py-16">
        {/* Left content */}
        <motion.div
          key={banner?.id || 'fallback'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-xl lg:flex-1"
          aria-live="polite"
        >
          <p className="text-xs font-semibold tracking-[0.3em] text-maroon">SINGARI SAREES</p>
          <h1 className="mt-3 font-serif text-3xl leading-tight tracking-wide text-charcoal sm:text-4xl lg:text-[2.75rem]">
            {banner?.title ? (
              banner.title
            ) : (
              <>
                WHERE EVERY WEAVE
                <br />
                TELLS A <span className="text-maroon">STORY</span>
              </>
            )}
          </h1>
          <p className="mt-3 text-lg text-maroon/80" lang={banner?.subtitle ? undefined : 'te'}>
            {banner?.subtitle || 'ప్రతి అల్లికలో ఒక కథ'}
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={banner?.linkUrl || '/collections'}
              className="inline-flex items-center gap-2 bg-maroon px-6 py-3 text-xs font-semibold tracking-[0.15em] text-white transition-colors hover:bg-maroon-dark"
            >
              SHOP COLLECTIONS
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </motion.div>

        {/* Right pillars */}
        <div className="mt-10 hidden flex-col gap-5 lg:mt-0 lg:flex">
          {pillars.map((p) => {
            const Icon = p.icon;
            return (
              <div key={p.label} className="flex items-center gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/40 text-gold">
                  <Icon className="h-5 w-5" strokeWidth={1.25} />
                </div>
                <span className="text-xs font-medium tracking-[0.2em] text-charcoal">{p.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {hasMultiple ? (
        <>
          <button
            type="button"
            onClick={() => goTo(activeIndex - 1)}
            className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/30 bg-black/25 p-2.5 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/45 sm:block lg:left-5"
            aria-label="Previous hero banner"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={() => goTo(activeIndex + 1)}
            className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-full border border-white/30 bg-black/25 p-2.5 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/45 sm:block lg:right-5"
            aria-label="Next hero banner"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/20 px-3 py-2 backdrop-blur-sm">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => goTo(index)}
                className={`h-2 rounded-full transition-all ${
                  index === activeIndex ? 'w-7 bg-white' : 'w-2 bg-white/55 hover:bg-white/80'
                }`}
                aria-label={`Show banner ${index + 1}`}
                aria-current={index === activeIndex}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
