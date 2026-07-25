export default function RootLoading() {
  // Keep cream background only — avoid replacing the whole page with a skeleton
  // on soft refresh / router.refresh (looks like a blank blink).
  return (
    <div className="min-h-[50vh] bg-cream" aria-hidden>
      <span className="sr-only">Loading</span>
    </div>
  );
}
