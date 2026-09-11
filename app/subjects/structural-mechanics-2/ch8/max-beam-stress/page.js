import CalculatorShell from '@/components/calculators/CalculatorShell';
import MaxBeamStress from '@/components/calculators/MaxBeamStress';
import { chapters } from '@/lib/chapters';

export default function MaxBeamStressPage() {
  return (
    <CalculatorShell chapter={chapters[2]} activeSlug="max-beam-stress">
      <MaxBeamStress />
    </CalculatorShell>
  );
}
