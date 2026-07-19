import Link from 'next/link';
import Image from 'next/image';
import { Mail, Clock } from 'lucide-react';
import { FaInstagram, FaFacebook, FaYoutube, FaWhatsapp } from 'react-icons/fa';
import { BrandLogo } from '@/components/layout/brand-logo';
import { STORE_CONTACT } from '@/lib/store-contact';

interface FooterProps {
  settings?: {
    store_email?: string;
    store_phone?: string;
    store_address?: string;
    instagram_url?: string;
    facebook_url?: string;
    whatsapp_number?: string;
    youtube_url?: string;
  };
}

export function Footer({ settings }: FooterProps) {
  const email = settings?.store_email || STORE_CONTACT.email;
  const whatsappUrl = 'https://wa.me/919490458789';

  return (
    <footer className="bg-charcoal-dark text-white">
      <div className="mx-auto max-w-[90rem] px-4 py-12 sm:px-6 lg:px-10 lg:py-14">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-5 lg:gap-10">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <BrandLogo variant="footer" />
            <p className="mt-3 text-sm leading-relaxed text-white/60">
              Where Every Weave Tells a Story
            </p>
            <div className="mt-5 flex gap-4">
              <a
                href={settings?.instagram_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-white/50 transition-colors hover:text-gold"
              >
                <FaInstagram className="h-5 w-5" />
              </a>
              <a
                href={settings?.facebook_url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-white/50 transition-colors hover:text-gold"
              >
                <FaFacebook className="h-5 w-5" />
              </a>
              <a
                href={settings?.youtube_url || settings?.instagram_url || 'https://www.youtube.com'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="text-white/50 transition-colors hover:text-gold"
              >
                <FaYoutube className="h-5 w-5" />
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="text-white/50 transition-colors hover:text-gold"
              >
                <FaWhatsapp className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-xs font-semibold tracking-[0.2em] text-gold">QUICK LINKS</h4>
            <ul className="space-y-2.5 text-sm text-white/60">
              <li><Link href="/" className="transition-colors hover:text-white">Home</Link></li>
              <li><Link href="/collections" className="transition-colors hover:text-white">Shop</Link></li>
              <li><Link href="/collections" className="transition-colors hover:text-white">Collections</Link></li>
              <li><Link href="/collections" className="transition-colors hover:text-white">New Arrivals</Link></li>
              <li><Link href="/about" className="transition-colors hover:text-white">About Us</Link></li>
              <li><Link href="/contact" className="transition-colors hover:text-white">Contact Us</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="mb-4 text-xs font-semibold tracking-[0.2em] text-gold">CUSTOMER SERVICE</h4>
            <ul className="space-y-2.5 text-sm text-white/60">
              <li><Link href="/contact" className="transition-colors hover:text-white">FAQ</Link></li>
              <li><Link href="/shipping-policy" className="transition-colors hover:text-white">Shipping &amp; Delivery</Link></li>
              <li><Link href="/refund-policy" className="transition-colors hover:text-white">Returns &amp; Exchange</Link></li>
              <li><Link href="/terms" className="transition-colors hover:text-white">Terms &amp; Conditions</Link></li>
              <li><Link href="/privacy-policy" className="transition-colors hover:text-white">Privacy Policy</Link></li>
            </ul>
          </div>

          {/* Help & Support */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-1">
            <h4 className="mb-4 text-xs font-semibold tracking-[0.2em] text-gold">HELP &amp; SUPPORT</h4>
            <ul className="space-y-3 text-sm text-white/60">
              <li>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start gap-2 transition-colors hover:text-white"
                >
                  <FaWhatsapp className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                  <span>
                    <span className="block font-medium text-white/80">WhatsApp Support</span>
                    <span className="mt-0.5 block group-hover:text-gold">+91 9490458789</span>
                  </span>
                </a>
              </li>
              <li className="text-xs leading-relaxed text-white/50">
                Need help? Chat with us on WhatsApp.
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 shrink-0 text-gold" />
                {email}
              </li>
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                <span>{STORE_CONTACT.hours}</span>
              </li>
            </ul>
          </div>

          {/* Payment */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-1">
            <h4 className="mb-4 text-xs font-semibold tracking-[0.2em] text-gold">WE ACCEPT</h4>
            <div className="flex flex-wrap gap-2">
              {['Visa', 'Mastercard', 'UPI', 'Paytm'].map((method) => (
                <span
                  key={method}
                  className="rounded border border-white/15 bg-white/5 px-3 py-1.5 text-[0.65rem] font-medium tracking-wide text-white/70"
                >
                  {method}
                </span>
              ))}
            </div>
            <div className="mt-6">
              <Link
                href="/my-orders"
                className="text-sm text-gold transition-colors hover:text-gold-light"
              >
                My Orders →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/40 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Singari Sarees. All rights reserved.</p>
          <div className="inline-flex items-center gap-1.5 text-white/50">
            <span>Developed by</span>
            <a
              href="https://www.awaylabs.in"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-gold transition-colors hover:text-gold-light"
            >
              Awaylabs
              <span className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white">
                <Image
                  src="/awaylabs-logo.png"
                  alt=""
                  width={19}
                  height={19}
                  className="h-[1.05rem] w-[1.05rem] object-contain"
                  aria-hidden
                />
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
