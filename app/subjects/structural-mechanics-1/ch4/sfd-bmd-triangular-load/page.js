import CalculatorShell from '@/components/calculators/CalculatorShell';
import TriangularLoadSFDBMD from '@/components/calculators/TriangularLoadSFDBMD';
import { chapters1 } from '@/lib/chapters1';

export default function TriangularLoadSFDBMDPage() {
  return (
    <CalculatorShell chapter={chapters1[3]} activeSlug="sfd-bmd-triangular-load" subject="sm1">
      <TriangularLoadSFDBMD />
    </CalculatorShell>
  );
}
