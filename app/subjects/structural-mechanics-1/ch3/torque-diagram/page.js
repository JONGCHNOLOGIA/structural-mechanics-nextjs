import CalculatorShell from '@/components/calculators/CalculatorShell';
import TorqueDiagram from '@/components/calculators/TorqueDiagram';
import { chapters1 } from '@/lib/chapters1';

export default function TorqueDiagramPage() {
  return (
    <CalculatorShell chapter={chapters1[2]} activeSlug="torque-diagram" subject="sm1">
      <TorqueDiagram />
    </CalculatorShell>
  );
}
