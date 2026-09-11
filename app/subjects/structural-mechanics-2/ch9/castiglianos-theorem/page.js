import CalculatorShell from '@/components/calculators/CalculatorShell';
import CastiglianosTheorem from '@/components/calculators/CastiglianosTheorem';
import { chapters } from '@/lib/chapters';

export default function CastiglianosTheoremPage() {
  return (
    <CalculatorShell chapter={chapters[3]} activeSlug="castiglianos-theorem">
      <CastiglianosTheorem />
    </CalculatorShell>
  );
}
