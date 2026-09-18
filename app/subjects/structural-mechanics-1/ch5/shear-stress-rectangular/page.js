import CalculatorShell from '@/components/calculators/CalculatorShell';
import ShearStressRect from '@/components/calculators/ShearStressRect';
import { chapters1 } from '@/lib/chapters1';

export default function ShearStressRectPage() {
  return (
    <CalculatorShell chapter={chapters1[4]} activeSlug="shear-stress-rectangular" subject="sm1">
      <ShearStressRect />
    </CalculatorShell>
  );
}
