import CalculatorShell from '@/components/calculators/CalculatorShell';
import CompositeBeams from '@/components/calculators/CompositeBeams';
import { chapters } from '@/lib/chapters';

export default function CompositeBeamsPage() {
  return (
    <CalculatorShell chapter={chapters[0]} activeSlug="composite-beams">
      <CompositeBeams />
    </CalculatorShell>
  );
}
