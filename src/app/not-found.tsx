import { Footer } from '@/components/layout/footer';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <>
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <p className="font-serif text-8xl text-gold/30">404</p>
        <h1 className="mt-4 font-serif text-3xl text-charcoal">Page Not Found</h1>
        <p className="mt-2 text-brown-light">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="mt-8">
          <Button variant="gold">Return Home</Button>
        </Link>
      </div>
      <Footer />
    </>
  );
}
