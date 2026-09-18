import CalculatorShell from '@/components/calculators/CalculatorShell';
import ShearFlowCircular from '@/components/calculators/ShearFlowCircular';
import { chapters1 } from '@/lib/chapters1';

export default function ShearFlowCircularPage() {
  return (
    <CalculatorShell chapter={chapters1[4]} activeSlug="shear-stress-circular-flow" subject="sm1">
      <ShearFlowCircular />
    </CalculatorShell>
  );
}
