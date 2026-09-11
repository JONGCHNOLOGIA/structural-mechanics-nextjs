import CalculatorShell from '@/components/calculators/CalculatorShell';
import SphericalVessel from '@/components/calculators/SphericalVessel';
import { chapters } from '@/lib/chapters';

export default function SphericalVesselPage() {
  return (
    <CalculatorShell chapter={chapters[2]} activeSlug="spherical-pressure-vessels">
      <SphericalVessel />
    </CalculatorShell>
  );
}
