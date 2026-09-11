import CalculatorShell from '@/components/calculators/CalculatorShell';
import MomentAreaMethod from '@/components/calculators/MomentAreaMethod';
import { chapters } from '@/lib/chapters';

export default function MomentAreaMethodPage() {
  return (
    <CalculatorShell chapter={chapters[3]} activeSlug="moment-area-method">
      <MomentAreaMethod />
    </CalculatorShell>
  );
}
