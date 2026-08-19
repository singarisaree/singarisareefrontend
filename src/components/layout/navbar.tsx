'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
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
  { href: '/#new-arrivals', label: 'NEW ARRIVALS' },
  { href: '/about', label: 'ABOUT US' },
  { href: '/contact', label: 'CONTACT US' },
];

const mobileNavLinks = [
  { href: '/', label: 'HOME', icon: House },
  { href: '/collections', label: 'COLLECTIONS', icon: Layers3 },
  { href: '/#new-arrivals', label: 'NEW ARRIVALS', icon: Sparkles },
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
  const { customer, isLoading: authLoading, logout, openLogin } = useCustomerAuth();

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

    const onPointerDown = (event: globalThis.MouseEvent) => {
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
  const ordersHref = customer ? '/my-orders' : null;
  const displayPhone = customer?.phone
    ? `+91 ${customer.phone.replace(/\D/g, '').slice(-10)}`
    : '';

  useEffect(() => {
    if (!mobileOpen) return;

    const scrollY = window.scrollY;
    const body = document.body;
    const html = document.documentElement;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlOverflow: html.style.overflow,
    };

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overscrollBehavior = 'none';
    html.style.overflow = 'hidden';

    const preventTouchScroll = (event: TouchEvent) => {
      // Allow touches inside the sidebar; block background page scroll.
      const sidebar = document.querySelector('[data-mobile-sidebar]');
      if (sidebar && event.target instanceof Node && sidebar.contains(event.target)) {
        return;
      }
      event.preventDefault();
    };
    document.addEventListener('touchmove', preventTouchScroll, { passive: false });

    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      body.style.overscrollBehavior = previous.bodyOverscroll;
      html.style.overflow = previous.htmlOverflow;
      document.removeEventListener('touchmove', preventTouchScroll);
      window.scrollTo(0, scrollY);
    };
  }, [mobileOpen]);

  const showAnnouncement =
    pathname === '/' &&
    (settings?.announcement_bar_enabled === undefined ||
      settings?.announcement_bar_enabled === true ||
      String(settings?.announcement_bar_enabled) === 'true');
  const announcementMain =
    settings?.announcement_bar_text || 'FREE SHIPPING on Orders Above Rs. 1999';
  const announcementSecondary = settings?.announcement_bar_secondary_text || '';

  if (pathname.startsWith('/admin')) return null;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    if (href.startsWith('/#')) return false;
    const path = href.split('?')[0];
    return pathname.startsWith(path) && path !== '/';
  };

  const handleNavClick = (event: ReactMouseEvent<HTMLAnchorElement>, href: string) => {
    if (href !== '/#new-arrivals') return;
    if (pathname !== '/') return;
    event.preventDefault();
    closeMobileMenu();
    window.requestAnimationFrame(() => {
      document.getElementById('new-arrivals')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  };

  return (
    <header className="sticky top-0 z-50 w-full max-w-full">
      {/* Announcement bar — single line; horizontally scrollable when text exceeds width */}
      {showAnnouncement && (
        <div
          className="announcement-scroll max-w-full bg-charcoal-dark text-xs tracking-wide text-white sm:text-sm"
          style={settings?.announcement_bar_bg_color ? { backgroundColor: settings.announcement_bar_bg_color } : undefined}
        >
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
      <div className="relative z-50 border-b border-maroon/10 bg-cream/98 backdrop-blur-md">
        <nav
          className="mx-auto grid min-h-[4.5rem] max-w-[90rem] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 sm:min-h-[5rem] sm:gap-4 sm:px-6 lg:px-8 xl:gap-6 xl:px-10"
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

          {/* Desktop nav — center (can shrink; secondary links from xl) */}
          <ul className="hidden min-w-0 items-center justify-center gap-4 lg:flex xl:gap-6">
            {navLinks.map((link) => (
              <li
                key={link.label}
                className={cn(
                  'relative shrink-0',
                  (link.label === 'ABOUT US' || link.label === 'CONTACT US') && 'hidden xl:block',
                )}
              >
                <Link
                  href={link.href}
                  prefetch
                  onClick={(event) => handleNavClick(event, link.href)}
                  className={cn(
                    'relative flex items-center gap-1 py-1 text-[0.7rem] font-medium tracking-[0.12em] transition-colors hover:text-maroon xl:text-xs xl:tracking-[0.15em]',
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
          <div className="flex min-w-0 items-center justify-end gap-8.5 sm:gap-3">
            <NavbarSearch onNavigate={closeMobileMenu} />

            {/* Desktop profile (Flipkart-style) */}
            <div className="relative z-[60] hidden sm:block" ref={profileRef}>
              {authLoading && !customer ? (
                <span
                  className="inline-flex items-center gap-1.5 rounded-md bg-maroon/5 px-1.5 py-1 text-maroon/50"
                  aria-hidden
                >
                  <UserRound className="h-7 w-7" strokeWidth={1.5} />
                </span>
              ) : customer ? (
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
                      className="absolute right-0 top-full z-[70] mt-2 w-56 rounded-lg border border-beige bg-white shadow-lg"
                    >
                      <div className="border-b border-beige px-4 py-3">
                        <p className="text-sm font-medium text-charcoal">Hello</p>
                        <p className="mt-0.5 text-xs text-brown-light">{displayPhone}</p>
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
                <button
                  type="button"
                  onClick={() => openLogin()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-maroon/5 px-1.5 py-1 text-maroon transition-colors hover:text-maroon-dark"
                  aria-label="Login"
                >
                  <UserRound className="h-7 w-7" strokeWidth={1.5} />
                  <span className="text-[0.72rem] font-semibold tracking-[0.1em]">LOGIN</span>
                </button>
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
            className="fixed inset-0 z-[60] touch-none bg-charcoal/40 overscroll-none"
            aria-label="Close menu"
            onClick={closeMobileMenu}
          />
          <aside
            data-mobile-sidebar
            className="fixed inset-y-0 left-0 z-[70] flex w-[49.7%] max-w-[11.8rem] flex-col overflow-hidden overscroll-none bg-cream shadow-2xl"
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

            <nav className="flex-1 overflow-hidden px-3 py-3">
              <ul className="space-y-0.5">
                {mobileNavLinks.map((link) => {
                  const Icon = link.icon;
                  return (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        prefetch
                        onClick={(event) => {
                          handleNavClick(event, link.href);
                          if (link.href !== '/#new-arrivals' || pathname !== '/') {
                            closeMobileMenu();
                          }
                        }}
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
                  {ordersHref ? (
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
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        closeMobileMenu();
                        openLogin({ next: '/my-orders' });
                      }}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left text-sm font-medium tracking-wider text-charcoal"
                    >
                      <Package className="h-[1.1rem] w-[1.1rem] shrink-0 text-maroon" strokeWidth={1.75} />
                      MY ORDERS
                    </button>
                  )}
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

            <div className="px-3 pb-3 pt-1">
              {authLoading && !customer ? (
                <span className="flex items-center justify-center gap-2 rounded-md bg-maroon/40 px-3 py-3 text-sm font-medium tracking-wider text-white/80">
                  <UserRound className="h-[1.1rem] w-[1.1rem] shrink-0" strokeWidth={1.75} />
                  …
                </span>
              ) : customer ? (
                <button
                  type="button"
                  onClick={askLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-maroon px-3 py-3 text-sm font-medium tracking-wider text-white transition-colors hover:bg-maroon-dark"
                >
                  <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  LOGOUT
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    closeMobileMenu();
                    openLogin();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-maroon px-3 py-3 text-sm font-medium tracking-wider text-white transition-colors hover:bg-maroon-dark"
                >
                  <UserRound className="h-[1.1rem] w-[1.1rem] shrink-0" strokeWidth={1.75} />
                  LOGIN
                </button>
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
