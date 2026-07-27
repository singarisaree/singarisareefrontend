import { SingariShowcaseSettings } from '@/components/admin/singari-showcase-settings';

export default function AdminShowcasePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-[#0f172a]">Singari Showcase</h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Up to 6 product videos on the homepage. Choose category, product, color, then upload a video.
        </p>
      </div>
      <SingariShowcaseSettings />
    </div>
  );
}
