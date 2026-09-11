import CalculatorShell from '@/components/calculators/CalculatorShell';
import InclinedLoads from '@/components/calculators/InclinedLoads';
import { chapters } from '@/lib/chapters';

export default function InclinedLoadsPage() {
  return (
    <CalculatorShell chapter={chapters[0]} activeSlug="inclined-loads">
      <InclinedLoads />
    </CalculatorShell>
  );
}
