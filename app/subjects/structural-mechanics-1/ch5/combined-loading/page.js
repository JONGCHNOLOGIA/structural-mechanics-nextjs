import CalculatorShell from '@/components/calculators/CalculatorShell';
import CombinedLoading from '@/components/calculators/CombinedLoading';
import { chapters1 } from '@/lib/chapters1';

export default function CombinedLoadingPage() {
  return (
    <CalculatorShell chapter={chapters1[4]} activeSlug="combined-loading" subject="sm1">
      <CombinedLoading />
    </CalculatorShell>
  );
}
