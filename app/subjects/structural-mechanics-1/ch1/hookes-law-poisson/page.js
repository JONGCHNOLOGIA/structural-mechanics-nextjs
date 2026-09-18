import CalculatorShell from '@/components/calculators/CalculatorShell';
import HookePoisson from '@/components/calculators/HookePoisson';
import { chapters1 } from '@/lib/chapters1';

export default function HookesLawPoissonPage() {
  return (
    <CalculatorShell
      chapter={chapters1[0]}
      activeSlug="hookes-law-poisson"
      subject="sm1"
    >
      <HookePoisson />
    </CalculatorShell>
  );
}
