export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[3/4] rounded bg-beige" />
          <div className="mx-auto mt-3 h-4 w-3/4 rounded bg-beige sm:mx-0" />
          <div className="mx-auto mt-2 h-4 w-1/2 rounded bg-beige sm:mx-0" />
        </div>
      ))}
    </div>
  );
}

export function CollectionPageSkeleton() {
  return (
    <>
      <div className="animate-pulse bg-beige py-12">
        <div className="mx-auto max-w-[90rem] px-4 text-center sm:px-6 lg:px-10">
          <div className="mx-auto h-3 w-24 rounded bg-cream" />
          <div className="mx-auto mt-4 h-10 w-64 max-w-full rounded bg-cream" />
          <div className="mx-auto mt-3 h-4 w-80 max-w-full rounded bg-cream" />
        </div>
      </div>
      <div className="mx-auto max-w-[90rem] px-4 py-8 sm:px-6 lg:px-10">
        <div className="mb-8 flex flex-wrap gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-20 animate-pulse rounded border border-maroon/10 bg-beige" />
          ))}
        </div>
        <ProductGridSkeleton />
      </div>
    </>
  );
}


export function PageLoadingSkeleton() {
  return (
    <div className="mx-auto max-w-[90rem] animate-pulse px-4 py-12 sm:px-6 lg:px-10">
      <div className="mx-auto h-8 w-48 rounded bg-beige" />
      <div className="mx-auto mt-3 h-4 w-72 max-w-full rounded bg-beige" />
      <div className="mt-10">
        <ProductGridSkeleton count={6} />
      </div>
    </div>
  );
}

export function CheckoutSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-8 sm:px-6 lg:px-8">
      <div className="h-9 w-40 rounded bg-beige" />
      <div className="mt-2 h-4 w-56 rounded bg-beige" />
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="luxury-card h-48 p-6" />
          <div className="luxury-card h-64 p-6" />
        </div>
        <div className="luxury-card h-80 p-6" />
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl animate-pulse px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="mb-4 h-4 w-16 rounded bg-beige" />
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-3">
          <div className="aspect-[3/4] rounded-lg bg-beige lg:min-h-[28rem]" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 w-14 rounded border border-gold/10 bg-beige" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-3 w-20 rounded bg-beige" />
          <div className="h-10 w-4/5 rounded bg-beige" />
          <div className="h-8 w-32 rounded bg-beige" />
          <div className="h-4 w-full rounded bg-beige" />
          <div className="h-4 w-5/6 rounded bg-beige" />
          <div className="mt-4 flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 w-24 rounded-full bg-beige" />
            ))}
          </div>
          <div className="mt-6 h-12 w-40 rounded-md bg-beige" />
        </div>
      </div>
    </div>
  );
}
