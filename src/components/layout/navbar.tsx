'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Menu,
  X,
  ChevronDown,
  ShoppingCart,
  UserRound,
  Package,
  Heart,
  LogOut,
  House,
  Layers3,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { useCartStore } from '@/stores/cart-store';
import { useCartHydrated } from '@/hooks/use-cart-hydrated';
import { useLikedStore } from '@/stores/liked-store';
import { useLikedHydrated } from '@/hooks/use-liked-hydrated';
import { useStoreSettings } from '@/components/store-settings-provider';
import { BrandLogo } from '@/components/layout/brand-logo';
import { NavbarSearch } from '@/components/layout/navbar-search';
import { useCustomerAuth } from '@/components/customer-auth-provider';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/', label: 'HOME' },
  { href: '/collections', label: 'COLLECTIONS', hasDropdown: true },
  { href: '/collections?sort=new', label: 'NEW ARRIVALS' },
  { href: '/about', label: 'ABOUT US' },
  { href: '/contact', label: 'CONTACT US' },
];

const mobileNavLinks = [
  { href: '/', label: 'HOME', icon: House },
  { href: '/collections', label: 'COLLECTIONS', icon: Layers3 },
  { href: '/collections?sort=new', label: 'NEW ARRIVALS', icon: Sparkles },
];

export function Navbar() {
  const pathname = usePathname();
  const itemCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const cartHydrated = useCartHydrated();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const { customer, isLoading: authLoading, logout } = useCustomerAuth();

  const closeMobileMenu = () => setMobileOpen(false);

  const askLogout = () => {
    closeMobileMenu();
    setProfileOpen(false);
    setLogoutOpen(true);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      setLogoutOpen(false);
      toast.success('You are logged out');
    } catch {
      toast.error('Could not log out');
    } finally {
      setLoggingOut(false);
    }
  };

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!profileOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setProfileOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [profileOpen]);

  const displayCount = cartHydrated ? itemCount : null;
  const likedHydrated = useLikedHydrated();
  const likedCount = useLikedStore((s) => s.items.length);
  const settings = useStoreSettings();
  const ordersHref = customer ? '/my-orders' : '/login?next=/my-orders';
  const maskedPhone = customer?.phone
    ? `+91 ${customer.phone.slice(0, 2)}******${customer.phone.slice(-2)}`
    : '';

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const showAnnouncement =
    settings?.announcement_bar_enabled === undefined ||
    settings?.announcement_bar_enabled === true ||
    String(settings?.announcement_bar_enabled) === 'true';
  const announcementMain =
    settings?.announcement_bar_text || 'FREE SHIPPING on Orders Above Rs. 1999';
  const announcementSecondary = settings?.announcement_bar_secondary_text || '';

  if (pathname.startsWith('/admin')) return null;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href.split('?')[0]) && href !== '/';
  };

  return (
    <header className="sticky top-0 z-50 w-full">
      {/* Announcement bar — single line; horizontally scrollable when text exceeds width */}
      {showAnnouncement && (
        <div className="announcement-scroll bg-charcoal-dark text-xs tracking-wide text-white sm:text-sm">
          <p className="mx-auto flex w-max min-w-full items-center justify-center gap-x-2 whitespace-nowrap px-3 py-2">
            <span>{announcementMain}</span>
            {announcementSecondary?.trim() ? (
              <>
                <span className="text-white/50" aria-hidden>
                  |
                </span>
                <span>{announcementSecondary}</span>
              </>
            ) : null}
          </p>
        </div>
      )}

      {/* Main nav */}
      <div className="border-b border-maroon/10 bg-cream/98 backdrop-blur-md">
        <nav
          className="mx-auto flex min-h-[4.5rem] max-w-[90rem] items-center justify-between px-4 py-2 sm:min-h-[5rem] sm:px-6 lg:px-10"
          aria-label="Main navigation"
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              className="shrink-0 text-charcoal lg:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <BrandLogo variant="navbar" priority onNavigate={closeMobileMenu} />
          </div>

          {/* Desktop nav — center */}
          <ul className="hidden items-center gap-6 lg:flex xl:gap-8">
            {navLinks.map((link) => (
              <li key={link.label} className="relative">
                <Link
                  href={link.href}
                  prefetch
                  className={cn(
                    'relative flex items-center gap-1 py-1 text-xs font-medium tracking-[0.15em] transition-colors hover:text-maroon',
                    isActive(link.href) ? 'text-maroon' : 'text-charcoal',
                  )}
                >
                  {link.label}
                  {link.hasDropdown && <ChevronDown className="h-3 w-3 opacity-60" />}
                </Link>
                {isActive(link.href) && (
                  <span className="absolute -bottom-1 left-0 h-0.5 w-full bg-maroon" />
                )}
              </li>
            ))}
          </ul>

          {/* Actions — right */}
          <div className="flex items-center gap-3 sm:gap-4">
            <NavbarSearch onNavigate={closeMobileMenu} />

            {/* Desktop profile (Flipkart-style) */}
            <div className="relative hidden sm:block" ref={profileRef}>
              {!authLoading && customer ? (
                <>
                  <button
                    type="button"
                    onClick={() => setProfileOpen((open) => !open)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-maroon/5 px-1.5 py-1 text-maroon transition-colors hover:text-maroon-dark"
                    aria-haspopup="menu"
                    aria-expanded={profileOpen}
                    aria-label="Account menu"
                  >
                    <UserRound className="h-7 w-7" strokeWidth={1.5} />
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 transition-transform',
                        profileOpen && 'rotate-180',
                      )}
                    />
                  </button>

                  {profileOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-beige bg-white shadow-lg"
                    >
                      <div className="border-b border-beige px-4 py-3">
                        <p className="text-sm font-medium text-charcoal">Hello</p>
                        <p className="mt-0.5 text-xs text-brown-light">{maskedPhone}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          href="/my-orders"
                          prefetch
                          role="menuitem"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-charcoal transition-colors hover:bg-beige/40"
                        >
                          <Package className="h-4 w-4 text-maroon" strokeWidth={1.75} />
                          My Orders
                        </Link>
                        <Link
                          href="/liked"
                          prefetch
                          role="menuitem"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm text-charcoal transition-colors hover:bg-beige/40"
                        >
                          <span className="inline-flex items-center gap-3">
                            <Heart className="h-4 w-4 text-maroon" strokeWidth={1.75} />
                            Liked Products
                          </span>
                          {likedHydrated && likedCount > 0 ? (
                            <span className="text-xs text-brown-light">{likedCount}</span>
                          ) : null}
                        </Link>
                        <button
                          type="button"
                          role="menuitem"
                          onClick={askLogout}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-charcoal transition-colors hover:bg-beige/40"
                        >
                          <LogOut className="h-4 w-4 text-maroon" strokeWidth={1.75} />
                          Logout
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : (
                <Link
                  href="/login"
                  prefetch
                  className="inline-flex items-center gap-1.5 rounded-md bg-maroon/5 px-1.5 py-1 text-maroon transition-colors hover:text-maroon-dark"
                  aria-label="Login"
                >
                  <UserRound className="h-7 w-7" strokeWidth={1.5} />
                  <span className="text-[0.72rem] font-semibold tracking-[0.1em]">LOGIN</span>
                </Link>
              )}
            </div>

            <Link
              href="/checkout"
              prefetch
              onClick={closeMobileMenu}
              className="group relative text-maroon transition-colors hover:text-maroon-dark"
              aria-label={
                displayCount != null && displayCount > 0
                  ? `Cart with ${displayCount} items`
                  : 'Cart'
              }
            >
              <ShoppingCart className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.5} aria-hidden />
              {displayCount != null && displayCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-maroon text-[0.6rem] font-semibold text-white ring-2 ring-cream">
                  {displayCount}
                </span>
              )}
            </Link>
          </div>
        </nav>
      </div>

      {/* Mobile sidebar */}
      {mobileOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            className="fixed inset-0 z-[60] bg-charcoal/40"
            aria-label="Close menu"
            onClick={closeMobileMenu}
          />
          <aside
            className="fixed inset-y-0 left-0 z-[70] flex w-[58.5%] max-w-[13.9rem] flex-col bg-cream shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
          >
            <div className="flex items-center justify-between border-b border-maroon/10 px-4 py-4">
              <BrandLogo variant="navbar" onNavigate={closeMobileMenu} />
              <button
                type="button"
                onClick={closeMobileMenu}
                className="rounded-md p-1.5 text-charcoal"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3">
              <ul className="space-y-0.5">
                {mobileNavLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        prefetch
                        onClick={closeMobileMenu}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium tracking-wider',
                          isActive(link.href) ? 'bg-maroon/5 text-maroon' : 'text-charcoal',
                        )}
                      >
                        <Icon className="h-[1.1rem] w-[1.1rem] shrink-0 text-maroon" strokeWidth={1.75} />
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link
                    href={ordersHref}
                    prefetch
                    onClick={closeMobileMenu}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium tracking-wider',
                      pathname === '/my-orders' ? 'bg-maroon/5 text-maroon' : 'text-charcoal',
                    )}
                  >
                    <Package className="h-[1.1rem] w-[1.1rem] shrink-0 text-maroon" strokeWidth={1.75} />
                    MY ORDERS
                  </Link>
                </li>
                <li>
                  <Link
                    href="/liked"
                    prefetch
                    onClick={closeMobileMenu}
                    className={cn(
                      'flex items-center justify-between rounded-md px-3 py-3 text-sm font-medium tracking-wider',
                      pathname === '/liked' ? 'bg-maroon/5 text-maroon' : 'text-charcoal',
                    )}
                  >
                    <span className="inline-flex items-center gap-3">
                      <Heart className="h-[1.1rem] w-[1.1rem] shrink-0 text-maroon" strokeWidth={1.75} />
                      LIKED PRODUCTS
                    </span>
                    {likedHydrated && likedCount > 0 ? (
                      <span className="text-xs font-semibold text-maroon">{likedCount}</span>
                    ) : null}
                  </Link>
                </li>
              </ul>
            </nav>

            <div className="border-t border-maroon/10 px-3 py-3">
              {!authLoading && customer ? (
                <button
                  type="button"
                  onClick={askLogout}
                  className="inline-flex w-full items-center gap-2 rounded-md px-3 py-3 text-left text-sm font-medium tracking-wider text-maroon"
                >
                  <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  LOGOUT
                </button>
              ) : (
                <Link
                  href="/login"
                  prefetch
                  onClick={closeMobileMenu}
                  className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium tracking-wider text-maroon"
                >
                  <UserRound className="h-[1.1rem] w-[1.1rem] shrink-0" strokeWidth={1.75} />
                  LOGIN
                </Link>
              )}
            </div>
          </aside>
        </div>
      ) : null}

      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent className="max-w-sm border-beige bg-cream p-6">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl text-charcoal">Logout?</DialogTitle>
            <DialogDescription className="text-sm text-brown-light">
              Do you want to leave this account?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 flex-row gap-3 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              disabled={loggingOut}
              onClick={() => setLogoutOpen(false)}
            >
              Stay
            </Button>
            <Button
              type="button"
              variant="gold"
              className="flex-1 sm:flex-none"
              disabled={loggingOut}
              onClick={() => void handleLogout()}
            >
              {loggingOut ? 'Please wait…' : 'Yes, logout'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
