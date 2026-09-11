import CalculatorShell from '@/components/calculators/CalculatorShell';
import FGM from '@/components/calculators/FGM';
import { chapters } from '@/lib/chapters';

export default function FGMPage() {
  return (
    <CalculatorShell chapter={chapters[0]} activeSlug="fgm">
      <FGM />
    </CalculatorShell>
  );
}
