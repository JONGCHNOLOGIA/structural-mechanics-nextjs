import CalculatorShell from '@/components/calculators/CalculatorShell';
import NonprismaticBeams from '@/components/calculators/NonprismaticBeams';
import { chapters } from '@/lib/chapters';

export default function NonprismaticBeamsPage() {
  return (
    <CalculatorShell chapter={chapters[3]} activeSlug="nonprismatic-beams">
      <NonprismaticBeams />
    </CalculatorShell>
  );
}
