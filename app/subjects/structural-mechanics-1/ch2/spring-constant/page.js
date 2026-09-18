import CalculatorShell from '@/components/calculators/CalculatorShell';
import SpringConstant from '@/components/calculators/SpringConstant';
import { chapters1 } from '@/lib/chapters1';

export default function SpringConstantPage() {
  return (
    <CalculatorShell chapter={chapters1[1]} activeSlug="spring-constant" subject="sm1">
      <SpringConstant />
    </CalculatorShell>
  );
}
