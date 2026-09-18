import CalculatorShell from '@/components/calculators/CalculatorShell';
import StressConcentration from '@/components/calculators/StressConcentration';
import { chapters1 } from '@/lib/chapters1';

export default function StressConcentrationPage() {
  return (
    <CalculatorShell chapter={chapters1[1]} activeSlug="stress-concentration" subject="sm1">
      <StressConcentration />
    </CalculatorShell>
  );
}
