import RacketFinderClient from '@/app/rackets/finder/_components/RacketFinderClient';
import SiteContainer from '@/components/layout/SiteContainer';

export const dynamic = 'force-dynamic';

export default function RacketFinderPage() {
  return (
    <SiteContainer variant="wide" className="py-6">
      <RacketFinderClient />
    </SiteContainer>
  );
}
