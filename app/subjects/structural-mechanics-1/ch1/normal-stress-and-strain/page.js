import CalculatorShell from '@/components/calculators/CalculatorShell';
import NormalStress from '@/components/calculators/NormalStress';
import { chapters1 } from '@/lib/chapters1';

export default function NormalStressPage() {
  return (
    <CalculatorShell
      chapter={chapters1[0]}
      activeSlug="normal-stress-and-strain"
      subject="sm1"
      homeHref="/subjects/structural-mechanics-1"
    >
      <NormalStress />
    </CalculatorShell>
  );
}
