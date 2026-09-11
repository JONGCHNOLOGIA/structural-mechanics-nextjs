import CalculatorShell from '@/components/calculators/CalculatorShell';
import PlaneStress from '@/components/calculators/PlaneStress';
import { chapters } from '@/lib/chapters';

export default function PlaneStressPage() {
  return (
    <CalculatorShell chapter={chapters[1]} activeSlug="plane-stress">
      <PlaneStress />
    </CalculatorShell>
  );
}
