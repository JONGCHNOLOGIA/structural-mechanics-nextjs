import CalculatorShell from '@/components/calculators/CalculatorShell';
import MethodOfSuperposition from '@/components/calculators/MethodOfSuperposition';
import { chapters } from '@/lib/chapters';

export default function MethodOfSuperpositionPage() {
  return (
    <CalculatorShell chapter={chapters[3]} activeSlug="method-of-superposition">
      <MethodOfSuperposition />
    </CalculatorShell>
  );
}
