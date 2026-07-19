import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { AdminShell } from '@/components/admin/admin-shell';
import './admin.css';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <div className="admin-root">
        <AdminShell>{children}</AdminShell>
      </div>
    </NuqsAdapter>
  );
}
