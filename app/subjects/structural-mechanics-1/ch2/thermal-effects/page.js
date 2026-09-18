import CalculatorShell from '@/components/calculators/CalculatorShell';
import ThermalEffects from '@/components/calculators/ThermalEffects';
import { chapters1 } from '@/lib/chapters1';

export default function ThermalEffectsPage() {
  return (
    <CalculatorShell chapter={chapters1[1]} activeSlug="thermal-effects" subject="sm1">
      <ThermalEffects />
    </CalculatorShell>
  );
}
