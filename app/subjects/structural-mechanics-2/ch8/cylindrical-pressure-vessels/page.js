import CalculatorShell from '@/components/calculators/CalculatorShell';
import CylindricalVessel from '@/components/calculators/CylindricalVessel';
import { chapters } from '@/lib/chapters';

export default function CylindricalVesselPage() {
  return (
    <CalculatorShell chapter={chapters[2]} activeSlug="cylindrical-pressure-vessels">
      <CylindricalVessel />
    </CalculatorShell>
  );
}
