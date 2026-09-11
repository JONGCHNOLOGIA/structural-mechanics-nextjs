import CalculatorShell from '@/components/calculators/CalculatorShell';
import DifferentialEquationMethod from '@/components/calculators/DifferentialEquationMethod';
import { chapters } from '@/lib/chapters';

export default function DifferentialEquationMethodPage() {
  return (
    <CalculatorShell chapter={chapters[4]} activeSlug="differential-equation-method">
      <DifferentialEquationMethod />
    </CalculatorShell>
  );
}
