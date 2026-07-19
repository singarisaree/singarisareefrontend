'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShippingCountry } from '@/lib/countries';

interface CountrySelectProps {
  id?: string;
  countries: ShippingCountry[];
  valueIso: string;
  onChange: (country: ShippingCountry) => void;
  disabled?: boolean;
  className?: string;
}

export function CountrySelect({
  id = 'country',
  countries,
  valueIso,
  onChange,
  disabled,
  className,
}: CountrySelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => countries.find((c) => c.isoCode === valueIso) ?? countries[0],
    [countries, valueIso],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.isoCode.toLowerCase().includes(q) ||
        c.dialCode.includes(q),
    );
  }, [countries, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="truncate text-left">
          {selected ? `${selected.name} (${selected.isoCode})` : 'Select country'}
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" aria-hidden />
      </button>

      {open ? (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-gold/30 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-gold/15 px-3 py-2">
            <Search className="h-4 w-4 text-brown-light" aria-hidden />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-brown-light/70"
              aria-label="Search country"
            />
          </div>
          <ul role="listbox" className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-brown-light">No countries found</li>
            ) : (
              filtered.map((country) => {
                const active = country.isoCode === selected?.isoCode;
                return (
                  <li key={country.isoCode}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      className={cn(
                        'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-beige/60',
                        active && 'bg-beige/40',
                      )}
                      onClick={() => {
                        onChange(country);
                        setOpen(false);
                        setQuery('');
                      }}
                    >
                      <span>
                        {country.name}{' '}
                        <span className="text-brown-light">({country.isoCode})</span>
                      </span>
                      {active ? <Check className="h-4 w-4 text-gold" aria-hidden /> : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
