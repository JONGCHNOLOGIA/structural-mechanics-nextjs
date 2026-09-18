import CalculatorShell from '@/components/calculators/CalculatorShell';
import FlexureFormula from '@/components/calculators/FlexureFormula';
import { chapters1 } from '@/lib/chapters1';

export default function FlexureFormulaPage() {
  return (
    <CalculatorShell chapter={chapters1[4]} activeSlug="flexure-formula" subject="sm1">
      <FlexureFormula />
    </CalculatorShell>
  );
}
