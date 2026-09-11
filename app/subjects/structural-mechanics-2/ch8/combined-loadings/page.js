import CalculatorShell from '@/components/calculators/CalculatorShell';
import CombinedLoadings from '@/components/calculators/CombinedLoadings';
import { chapters } from '@/lib/chapters';

export default function CombinedLoadingsPage() {
  return (
    <CalculatorShell chapter={chapters[2]} activeSlug="combined-loadings">
      <CombinedLoadings />
    </CalculatorShell>
  );
}
