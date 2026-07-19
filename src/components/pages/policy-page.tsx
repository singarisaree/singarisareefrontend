import { Footer } from '@/components/layout/footer';

interface PolicyPageProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function PolicyPage({ title, lastUpdated, children }: PolicyPageProps) {
  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="font-serif text-4xl text-charcoal">{title}</h1>
        <p className="mt-2 text-sm text-brown-light">Last updated: {lastUpdated}</p>
        <div className="prose-policy mt-10 space-y-4 text-brown-light leading-relaxed [&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-xl [&_h2]:text-charcoal">
          {children}
        </div>
      </div>
      <Footer />
    </>
  );
}
