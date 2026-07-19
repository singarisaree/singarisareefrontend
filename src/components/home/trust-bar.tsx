import { Globe, ShieldCheck, Zap, Headphones, type LucideIcon } from 'lucide-react';

type TrustFeature = {
  icon: LucideIcon;
  title: string;
  desc: string;
};

const features: TrustFeature[] = [
  {
    icon: Globe,
    title: 'Worldwide Delivery',
    desc: 'India & international shipping',
  },
  {
    icon: ShieldCheck,
    title: '100% Quality Assured',
    desc: 'Premium fabrics & finishes',
  },
  {
    icon: Zap,
    title: 'Quick Delivery',
    desc: 'Within Hyderabad',
  },
  {
    icon: Headphones,
    title: 'Customer Support',
    desc: 'We are here to help',
  },
];

export function TrustBar() {
  return (
    <section className="relative z-10 -mt-8 mx-4 sm:mx-6 lg:mx-auto lg:max-w-[85rem]" aria-label="Store benefits">
      <div className="grid grid-cols-2 gap-3 rounded-sm bg-white px-4 py-4 shadow-[0_0.25rem_1.5rem_rgba(0,0,0,0.06)] sm:grid-cols-4 sm:gap-0 sm:divide-x sm:divide-maroon/10 sm:px-8 sm:py-7">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="flex items-center gap-2 sm:justify-center sm:gap-3 sm:px-4">
              <div className="flex h-[1.875rem] w-[1.875rem] shrink-0 items-center justify-center rounded-full border border-maroon/15 text-maroon sm:h-10 sm:w-10">
                <Icon className="h-3 w-3 sm:h-4 sm:w-4" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-[0.5625rem] font-semibold uppercase tracking-wide text-charcoal sm:text-sm">
                  {f.title}
                </p>
                <p className="text-[0.4875rem] leading-tight text-muted sm:text-xs">{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
