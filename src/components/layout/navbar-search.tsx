'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useId, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { productService } from '@/services/store.service';
import { formatAmount, cn } from '@/lib/utils';
import type { Product } from '@/types';

const MIN_QUERY = 2;
const DEBOUNCE_MS = 280;

interface NavbarSearchProps {
  onNavigate?: () => void;
  className?: string;
}

export function NavbarSearch({ onNavigate, className }: NavbarSearchProps) {
  const router = useRouter();
  const inputId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [panelOpen, setPanelOpen] = useState(false);

  const trimmed = query.trim();
  const showPanel = panelOpen && trimmed.length >= MIN_QUERY;

  useEffect(() => {
    if (!mobileOpen) return;
    const t = window.setTimeout(() => mobileInputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (rootRef.current && !rootRef.current.contains(target)) {
        setPanelOpen(false);
        setActiveIndex(-1);
        // Keep mobile sheet open unless backdrop/close is used
        if (!mobileOpen) {
          setMobileOpen(false);
        }
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPanelOpen(false);
        setActiveIndex(-1);
        setMobileOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (trimmed.length < MIN_QUERY) {
      setResults([]);
      setLoading(false);
      setActiveIndex(-1);
      return;
    }

    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const products = await productService.getAll({
          search: trimmed,
          limit: '6',
          isActive: 'true',
        });
        if (!cancelled) {
          setResults(products);
          setActiveIndex(products.length > 0 ? 0 : -1);
        }
      } catch {
        if (!cancelled) {
          setResults([]);
          setActiveIndex(-1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [trimmed]);

  const closeAll = () => {
    setPanelOpen(false);
    setMobileOpen(false);
    setActiveIndex(-1);
  };

  const goToSearchPage = (value: string) => {
    const q = value.trim();
    if (q.length < MIN_QUERY) return;
    closeAll();
    onNavigate?.();
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  const goToProduct = (slug: string) => {
    setQuery('');
    setResults([]);
    closeAll();
    onNavigate?.();
    router.push(`/product/${slug}`);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (activeIndex >= 0 && results[activeIndex]) {
      goToProduct(results[activeIndex].slug);
      return;
    }
    goToSearchPage(query);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel || results.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    }
  };

  const renderSuggestionList = () => {
    if (!showPanel) return null;

    return (
      <div role="listbox" aria-label="Search suggestions">
        {loading && results.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-brown-light">Searching…</p>
        ) : results.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <p className="text-sm text-charcoal">No products found</p>
            <p className="mt-1 text-xs text-brown-light">Try another name or SKU</p>
          </div>
        ) : (
          <ul className="max-h-[min(60vh,22rem)] overflow-y-auto py-1">
            {results.map((product, index) => {
              const active = index === activeIndex;
              return (
                <li key={product.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
                      active ? 'bg-maroon/8' : 'hover:bg-maroon/5',
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => goToProduct(product.slug)}
                  >
                    <span className="relative h-12 w-10 shrink-0 overflow-hidden rounded bg-beige">
                      {product.defaultImage ? (
                        <Image
                          src={product.defaultImage}
                          alt=""
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-charcoal">
                        {product.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.7rem] tracking-wide text-brown-light">
                        SKU {product.sku}
                        <span className="mx-1.5 text-maroon/30">·</span>
                        Rs. {formatAmount(product.effectivePrice)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <Link
          href={`/search?q=${encodeURIComponent(trimmed)}`}
          onClick={() => {
            closeAll();
            onNavigate?.();
          }}
          className="block border-t border-maroon/10 px-4 py-2.5 text-center text-xs font-semibold tracking-wider text-maroon hover:bg-maroon/5"
        >
          View all results
        </Link>
      </div>
    );
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {/* Desktop search */}
      <form onSubmit={handleSubmit} className="relative hidden lg:block" role="search">
        <label htmlFor={inputId} className="sr-only">
          Search by product name or SKU
        </label>
        <div className="flex w-56 items-center gap-2 rounded-full border border-maroon/20 bg-cream/90 px-3 py-1.5 transition-colors focus-within:border-maroon/45 focus-within:ring-2 focus-within:ring-maroon/10 xl:w-64">
          <Search className="h-4 w-4 shrink-0 text-maroon/70" strokeWidth={1.75} aria-hidden />
          <input
            ref={desktopInputRef}
            id={inputId}
            type="text"
            inputMode="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setPanelOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search name or SKU"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="min-w-0 flex-1 bg-transparent text-sm text-charcoal outline-none placeholder:text-brown-light"
          />
          {loading && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-maroon/60" />}
          {query ? (
            <button
              type="button"
              className="shrink-0 text-brown-light hover:text-charcoal"
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                setResults([]);
                setActiveIndex(-1);
                desktopInputRef.current?.focus();
              }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        {showPanel && !mobileOpen ? (
          <div className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-[min(92vw,22rem)] overflow-hidden rounded-xl border border-maroon/15 bg-cream shadow-lg sm:w-80">
            {renderSuggestionList()}
          </div>
        ) : null}
      </form>

      {/* Mobile search trigger */}
      <button
        type="button"
        className="inline-flex text-charcoal transition-colors hover:text-maroon lg:hidden"
        aria-label="Search products"
        aria-expanded={mobileOpen}
        onClick={() => {
          setMobileOpen(true);
          setPanelOpen(true);
        }}
      >
        <Search className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.5} />
      </button>

      {/* Mobile search sheet — same dropdown style as desktop */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-charcoal/40"
            aria-label="Close search"
            onClick={closeAll}
          />
          <div className="absolute inset-x-0 top-0 border-b border-maroon/10 bg-cream shadow-lg">
            <form onSubmit={handleSubmit} className="px-4 py-3" role="search">
              <div className="flex items-center gap-2 rounded-full border border-maroon/20 bg-cream px-3 py-2 focus-within:border-maroon/45 focus-within:ring-2 focus-within:ring-maroon/10">
                <Search className="h-4 w-4 shrink-0 text-maroon/70" strokeWidth={1.75} aria-hidden />
                <input
                  ref={mobileInputRef}
                  type="text"
                  inputMode="search"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPanelOpen(true);
                  }}
                  onFocus={() => setPanelOpen(true)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search name or SKU"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="search"
                  className="min-w-0 flex-1 bg-transparent text-sm text-charcoal outline-none placeholder:text-brown-light"
                />
                {loading && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-maroon/60" />}
                <button
                  type="button"
                  className="shrink-0 text-brown-light hover:text-charcoal"
                  aria-label={query ? 'Clear search' : 'Close search'}
                  onClick={() => {
                    if (query) {
                      setQuery('');
                      setResults([]);
                      setActiveIndex(-1);
                      mobileInputRef.current?.focus();
                      return;
                    }
                    closeAll();
                  }}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </form>

            {showPanel ? (
              <div className="border-t border-maroon/10 bg-cream">{renderSuggestionList()}</div>
            ) : (
              <p className="border-t border-maroon/10 px-4 py-4 text-center text-xs text-brown-light">
                Type a product name or SKU to search
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
