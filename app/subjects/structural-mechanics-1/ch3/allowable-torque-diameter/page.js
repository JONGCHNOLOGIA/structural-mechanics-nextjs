import CalculatorShell from '@/components/calculators/CalculatorShell';
import TorsionDesign from '@/components/calculators/TorsionDesign';
import { chapters1 } from '@/lib/chapters1';

export default function TorsionDesignPage() {
  return (
    <CalculatorShell chapter={chapters1[2]} activeSlug="allowable-torque-diameter" subject="sm1">
      <TorsionDesign />
    </CalculatorShell>
  );
}
