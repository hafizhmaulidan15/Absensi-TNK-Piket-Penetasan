import { AbsensiWorkspace } from '@/components/AbsensiWorkspace';
import { GuideSection } from '@/components/GuideSection';
import { HeroSection } from '@/components/HeroSection';
import { SiteFooter } from '@/components/SiteFooter';
import { SiteHeader } from '@/components/SiteHeader';

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">
        <HeroSection />
        <AbsensiWorkspace />
        <GuideSection />
      </main>
      <SiteFooter />
    </div>
  );
}
