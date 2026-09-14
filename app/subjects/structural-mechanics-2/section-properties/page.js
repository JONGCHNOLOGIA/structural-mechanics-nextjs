import SectionProperties from '@/components/calculators/SectionProperties';
import SectionPropertiesHeader from './SectionPropertiesHeader';

export default function SectionPropertiesPage() {
  return (
    <div>
      <SectionPropertiesHeader />
      <div className="panels">
        <SectionProperties />
      </div>
    </div>
  );
}
