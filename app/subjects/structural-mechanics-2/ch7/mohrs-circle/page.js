import CalculatorShell from '@/components/calculators/CalculatorShell';
import MohrsCircle from '@/components/calculators/MohrsCircle';
import { chapters } from '@/lib/chapters';

export default function MohrsCirclePage() {
  return (
    <CalculatorShell chapter={chapters[1]} activeSlug="mohrs-circle">
      <MohrsCircle />
    </CalculatorShell>
  );
}
