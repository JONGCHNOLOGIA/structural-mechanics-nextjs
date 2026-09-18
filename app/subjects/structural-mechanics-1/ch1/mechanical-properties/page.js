import CalculatorShell from '@/components/calculators/CalculatorShell';
import MaterialProperties from '@/components/calculators/MaterialProperties';
import { chapters1 } from '@/lib/chapters1';

export default function MechanicalPropertiesPage() {
  return (
    <CalculatorShell
      chapter={chapters1[0]}
      activeSlug="mechanical-properties"
      subject="sm1"
      homeHref="/subjects/structural-mechanics-1"
    >
      <MaterialProperties />
    </CalculatorShell>
  );
}
