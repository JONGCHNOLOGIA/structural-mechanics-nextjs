import CalculatorShell from '@/components/calculators/CalculatorShell';
import MultiSegmentBar from '@/components/calculators/MultiSegmentBar';
import { chapters1 } from '@/lib/chapters1';

export default function NonuniformBarPage() {
  return (
    <CalculatorShell chapter={chapters1[1]} activeSlug="nonuniform-bar" subject="sm1">
      <MultiSegmentBar />
    </CalculatorShell>
  );
}
