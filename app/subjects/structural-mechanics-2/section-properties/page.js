import SectionProperties from '@/components/calculators/SectionProperties';
import SectionPropertiesHeader from './SectionPropertiesHeader';
import FloatingActions from '@/components/FloatingActions';

export default function SectionPropertiesPage() {
  return (
    // body 기본 배경이 흰색으로 바뀌었어도 이 페이지는 원래대로 크림 배경을 쓴다.
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <SectionPropertiesHeader />
      <div className="panels">
        <SectionProperties />
      </div>
      <FloatingActions showAi={false} />
    </div>
  );
}
