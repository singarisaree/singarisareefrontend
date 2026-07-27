import { Suspense } from 'react';
import { HomeHashScroll } from '@/components/home/home-hash-scroll';
import { HomePageContent, HomePageLoadingShell } from '@/app/home-page-content';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home',
  alternates: { canonical: '/' },
};

export const revalidate = 5;

export default function HomePage() {
  return (
    <>
      <HomeHashScroll />
      <Suspense fallback={<HomePageLoadingShell />}>
        <HomePageContent />
      </Suspense>
    </>
  );
}
