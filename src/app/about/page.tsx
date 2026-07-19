import { Footer } from '@/components/layout/footer';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'About Us' };

export default function AboutPage() {
  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-serif text-4xl text-charcoal text-center">About Singari Sarees</h1>
        <div className="mt-10 space-y-6 text-brown-light leading-relaxed">
          <p>
            Singari Sarees is a celebration of India&apos;s rich textile heritage. For generations, we have been
            curating the finest handcrafted sarees from master weavers across the country — from the
            opulent Banarasi silks of Varanasi to the vibrant Kanjivarams of Tamil Nadu.
          </p>
          <p>
            Every saree in our collection tells a story of tradition, craftsmanship, and timeless elegance.
            We work directly with artisan communities, ensuring fair practices and preserving ancient weaving techniques.
          </p>
          <p>
            Our mission is to bring the luxury of authentic Indian sarees to discerning women who appreciate
            quality, heritage, and understated elegance.
          </p>
        </div>
      </div>
      <Footer />
    </>
  );
}
