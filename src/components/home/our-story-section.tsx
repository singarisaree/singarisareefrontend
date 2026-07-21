import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { resolveStorefrontImageUrl, shouldUnoptimizeStorefrontImage } from '@/lib/image';

export function OurStorySection({ imageUrl }: { imageUrl?: string }) {
  const src = resolveStorefrontImageUrl(imageUrl);

  return (
    <section className="relative overflow-hidden bg-cream py-16 pattern-mandala sm:py-20" aria-labelledby="our-story">
      <div className="mx-auto grid max-w-[90rem] items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-10">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-maroon/5 lg:aspect-[5/4]">
          {src ? (
            <Image
              src={src}
              alt="Handloom weaving heritage"
              fill
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover"
              unoptimized={shouldUnoptimizeStorefrontImage(src)}
            />
          ) : null}
        </div>

        <div className="relative">
          <p className="text-xs font-semibold tracking-[0.3em] text-maroon">OUR STORY</p>
          <p className="mt-2 text-lg text-maroon/80" lang="te">
            మా కథ
          </p>
          <p className="mt-6 leading-relaxed text-muted">
            At Singari Sarees, we believe every thread carries the soul of its weaver. For generations,
            we have curated the finest handcrafted sarees from master artisans across India — preserving
            ancient weaving traditions while bringing timeless elegance to the modern woman.
          </p>
          <p className="mt-4 leading-relaxed text-muted">
            From the opulent Banarasi silks of Varanasi to the vibrant Kanjivarams of Tamil Nadu,
            each saree in our collection is a masterpiece waiting to become part of your story.
          </p>
          <Link
            href="/about"
            className="mt-8 inline-flex items-center gap-2 border border-maroon px-6 py-3 text-xs font-semibold tracking-[0.15em] text-maroon transition-colors hover:bg-maroon hover:text-white"
          >
            KNOW MORE ABOUT US
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
