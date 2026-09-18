import CalculatorShell from '@/components/calculators/CalculatorShell';
import TorsionFormula from '@/components/calculators/TorsionFormula';
import { chapters1 } from '@/lib/chapters1';

export default function TorsionFormulaPage() {
  return (
    <CalculatorShell chapter={chapters1[2]} activeSlug="torsion-formula" subject="sm1">
      <TorsionFormula />
    </CalculatorShell>
  );
}
