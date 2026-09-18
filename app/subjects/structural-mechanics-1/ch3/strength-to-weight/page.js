import CalculatorShell from '@/components/calculators/CalculatorShell';
import StrengthToWeight from '@/components/calculators/StrengthToWeight';
import { chapters1 } from '@/lib/chapters1';

export default function StrengthToWeightPage() {
  return (
    <CalculatorShell chapter={chapters1[2]} activeSlug="strength-to-weight" subject="sm1">
      <StrengthToWeight />
    </CalculatorShell>
  );
}
