import CalculatorShell from '@/components/calculators/CalculatorShell';
import ElastoplasticBending from '@/components/calculators/ElastoplasticBending';
import { chapters } from '@/lib/chapters';

export default function ElastoplasticBendingPage() {
  return (
    <CalculatorShell chapter={chapters[0]} activeSlug="elastoplastic-bending">
      <ElastoplasticBending />
    </CalculatorShell>
  );
}
