import CalculatorShell from '@/components/calculators/CalculatorShell';
import StrainEnergyOfBending from '@/components/calculators/StrainEnergyOfBending';
import { chapters } from '@/lib/chapters';

export default function StrainEnergyOfBendingPage() {
  return (
    <CalculatorShell chapter={chapters[3]} activeSlug="strain-energy-of-bending">
      <StrainEnergyOfBending />
    </CalculatorShell>
  );
}
