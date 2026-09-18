import CalculatorShell from '@/components/calculators/CalculatorShell';
import ShearStress from '@/components/calculators/ShearStress';
import { chapters1 } from '@/lib/chapters1';

export default function ShearStressPage() {
  return (
    <CalculatorShell
      chapter={chapters1[0]}
      activeSlug="shear-stress-and-strain"
      subject="sm1"
    >
      <ShearStress />
    </CalculatorShell>
  );
}
