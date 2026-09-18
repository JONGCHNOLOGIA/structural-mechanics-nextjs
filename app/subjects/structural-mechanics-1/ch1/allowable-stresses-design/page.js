import CalculatorShell from '@/components/calculators/CalculatorShell';
import AllowableDesign from '@/components/calculators/AllowableDesign';
import { chapters1 } from '@/lib/chapters1';

export default function AllowableDesignPage() {
  return (
    <CalculatorShell
      chapter={chapters1[0]}
      activeSlug="allowable-stresses-design"
      subject="sm1"
    >
      <AllowableDesign />
    </CalculatorShell>
  );
}
