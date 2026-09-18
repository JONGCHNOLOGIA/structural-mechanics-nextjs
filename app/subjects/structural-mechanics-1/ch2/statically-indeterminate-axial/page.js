import CalculatorShell from '@/components/calculators/CalculatorShell';
import IndeterminateAxial from '@/components/calculators/IndeterminateAxial';
import { chapters1 } from '@/lib/chapters1';

export default function IndeterminateAxialPage() {
  return (
    <CalculatorShell chapter={chapters1[1]} activeSlug="statically-indeterminate-axial" subject="sm1">
      <IndeterminateAxial />
    </CalculatorShell>
  );
}
