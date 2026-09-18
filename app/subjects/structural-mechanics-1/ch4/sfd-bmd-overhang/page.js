import CalculatorShell from '@/components/calculators/CalculatorShell';
import OverhangSFDBMD from '@/components/calculators/OverhangSFDBMD';
import { chapters1 } from '@/lib/chapters1';

export default function OverhangSFDBMDPage() {
  return (
    <CalculatorShell chapter={chapters1[3]} activeSlug="sfd-bmd-overhang" subject="sm1">
      <OverhangSFDBMD />
    </CalculatorShell>
  );
}
