import SectionProperties from '@/components/calculators/SectionProperties';
import SectionPropertiesHeader from './SectionPropertiesHeader';
import FloatingActions from '@/components/FloatingActions';

export default function SectionPropertiesPage() {
  return (
    <div>
      <SectionPropertiesHeader />
      <div className="panels">
        <SectionProperties />
      </div>
      <FloatingActions showAi={false} />
    </div>
  );
}
