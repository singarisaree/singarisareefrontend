interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: 'center' | 'left';
}

export function SectionHeading({ title, subtitle, align = 'center' }: SectionHeadingProps) {
  return (
    <div className={align === 'center' ? 'text-center' : 'text-left'}>
      <div className={`section-divider ${align === 'center' ? 'mx-auto max-w-md' : 'max-w-xs'}`}>
        <h2 className="shrink-0 font-serif text-xl tracking-[0.2em] text-charcoal sm:text-2xl">
          {title}
        </h2>
      </div>
      {subtitle && (
        <p className="mt-3 text-sm text-muted">{subtitle}</p>
      )}
    </div>
  );
}
