import CalculatorShell from '@/components/calculators/CalculatorShell';
import BendingMomentEquation from '@/components/calculators/BendingMomentEquation';
import { chapters } from '@/lib/chapters';

export default function BendingMomentEquationPage() {
  return (
    <CalculatorShell chapter={chapters[3]} activeSlug="bending-moment-equation">
      <BendingMomentEquation />
    </CalculatorShell>
  );
}
