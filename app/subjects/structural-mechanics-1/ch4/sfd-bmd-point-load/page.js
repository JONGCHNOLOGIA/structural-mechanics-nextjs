import CalculatorShell from '@/components/calculators/CalculatorShell';
import PointLoadSFDBMD from '@/components/calculators/PointLoadSFDBMD';
import { chapters1 } from '@/lib/chapters1';

export default function PointLoadSFDBMDPage() {
  return (
    <CalculatorShell chapter={chapters1[3]} activeSlug="sfd-bmd-point-load" subject="sm1">
      <PointLoadSFDBMD />
    </CalculatorShell>
  );
}
