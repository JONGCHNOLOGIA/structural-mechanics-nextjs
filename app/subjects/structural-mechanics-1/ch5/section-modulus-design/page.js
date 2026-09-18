import CalculatorShell from '@/components/calculators/CalculatorShell';
import SectionModulusDesign from '@/components/calculators/SectionModulusDesign';
import { chapters1 } from '@/lib/chapters1';

export default function SectionModulusDesignPage() {
  return (
    <CalculatorShell chapter={chapters1[4]} activeSlug="section-modulus-design" subject="sm1">
      <SectionModulusDesign />
    </CalculatorShell>
  );
}
