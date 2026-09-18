import CalculatorShell from '@/components/calculators/CalculatorShell';
import BeamReactions from '@/components/calculators/BeamReactions';
import { chapters1 } from '@/lib/chapters1';

export default function BeamReactionsPage() {
  return (
    <CalculatorShell chapter={chapters1[3]} activeSlug="beam-reactions" subject="sm1">
      <BeamReactions />
    </CalculatorShell>
  );
}
