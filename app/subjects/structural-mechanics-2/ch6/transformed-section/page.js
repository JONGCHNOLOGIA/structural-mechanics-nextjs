import CalculatorShell from '@/components/calculators/CalculatorShell';
import TransformedSection from '@/components/calculators/TransformedSection';
import { chapters } from '@/lib/chapters';

export default function TransformedSectionPage() {
  return (
    <CalculatorShell chapter={chapters[0]} activeSlug="transformed-section">
      <TransformedSection />
    </CalculatorShell>
  );
}
