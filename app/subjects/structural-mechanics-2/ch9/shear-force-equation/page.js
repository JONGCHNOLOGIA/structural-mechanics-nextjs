import CalculatorShell from '@/components/calculators/CalculatorShell';
import ShearForceEquation from '@/components/calculators/ShearForceEquation';
import { chapters } from '@/lib/chapters';

export default function ShearForceEquationPage() {
  return (
    <CalculatorShell chapter={chapters[3]} activeSlug="shear-force-equation">
      <ShearForceEquation />
    </CalculatorShell>
  );
}
