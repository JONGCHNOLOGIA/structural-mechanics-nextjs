import CalculatorShell from '@/components/calculators/CalculatorShell';
import UDLSFDBMD from '@/components/calculators/UDLSFDBMD';
import { chapters1 } from '@/lib/chapters1';

export default function UDLSFDBMDPage() {
  return (
    <CalculatorShell chapter={chapters1[3]} activeSlug="sfd-bmd-udl" subject="sm1">
      <UDLSFDBMD />
    </CalculatorShell>
  );
}
