import CalculatorShell from '@/components/calculators/CalculatorShell';
import CantileverSFDBMD from '@/components/calculators/CantileverSFDBMD';
import { chapters1 } from '@/lib/chapters1';

export default function CantileverSFDBMDPage() {
  return (
    <CalculatorShell chapter={chapters1[3]} activeSlug="sfd-bmd-cantilever" subject="sm1">
      <CantileverSFDBMD />
    </CalculatorShell>
  );
}
