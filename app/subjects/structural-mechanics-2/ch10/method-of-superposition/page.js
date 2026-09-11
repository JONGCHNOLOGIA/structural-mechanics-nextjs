import CalculatorShell from '@/components/calculators/CalculatorShell';
import IndeterminateSuperposition from '@/components/calculators/IndeterminateSuperposition';
import { chapters } from '@/lib/chapters';

export default function IndeterminateSuperpositionPage() {
  return (
    <CalculatorShell chapter={chapters[4]} activeSlug="method-of-superposition">
      <IndeterminateSuperposition />
    </CalculatorShell>
  );
}
