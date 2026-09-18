import CalculatorShell from '@/components/calculators/CalculatorShell';
import TorsionalDeformation from '@/components/calculators/TorsionalDeformation';
import { chapters1 } from '@/lib/chapters1';

export default function TorsionalDeformationPage() {
  return (
    <CalculatorShell chapter={chapters1[2]} activeSlug="torsional-deformation" subject="sm1">
      <TorsionalDeformation />
    </CalculatorShell>
  );
}
