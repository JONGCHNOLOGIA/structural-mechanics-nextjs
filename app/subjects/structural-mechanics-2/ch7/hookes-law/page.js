import CalculatorShell from '@/components/calculators/CalculatorShell';
import HookesLaw from '@/components/calculators/HookesLaw';
import { chapters } from '@/lib/chapters';

export default function HookesLawPage() {
  return (
    <CalculatorShell chapter={chapters[1]} activeSlug="hookes-law">
      <HookesLaw />
    </CalculatorShell>
  );
}
