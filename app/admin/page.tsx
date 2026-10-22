import { AdminDashboard } from '@/components/AdminDashboard';
import { AdminGate } from '@/components/AdminGate';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';

export const metadata = {
  title: 'Rekap Absensi | Panel Admin | TNK 62',
  description: 'Panel admin rekap absensi piket fasilitas penetasan.',
};

export default function AdminPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <AdminGate>
          <AdminDashboard />
        </AdminGate>
      </main>
      <SiteFooter />
    </div>
  );
}
