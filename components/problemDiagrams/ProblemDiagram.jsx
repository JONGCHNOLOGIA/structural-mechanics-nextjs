'use client';

import BeamDiagram from './BeamDiagram';
import CrossSectionDiagram from './CrossSectionDiagram';
import StressElementDiagram from './StressElementDiagram';
import VesselDiagram from './VesselDiagram';
import ShaftDiagram from './ShaftDiagram';
import MaxStressPointDiagram from './MaxStressPointDiagram';

// 문제 생성기가 만든 diagram 설명(type + params)을 실제 SVG 컴포넌트로 렌더링하는 디스패처.
export default function ProblemDiagram({ diagram }) {
  if (!diagram) return null;
  switch (diagram.type) {
    case 'beam':
      return <BeamDiagram {...diagram.props} />;
    case 'crossSection':
      return <CrossSectionDiagram {...diagram.props} />;
    case 'stressElement':
      return <StressElementDiagram {...diagram.props} />;
    case 'vessel':
      return <VesselDiagram {...diagram.props} />;
    case 'shaft':
      return <ShaftDiagram {...diagram.props} />;
    case 'maxStressPoint':
      return <MaxStressPointDiagram {...diagram.props} />;
    case 'beamAndCrossSection':
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 220px', maxWidth: 300 }}>
            <BeamDiagram {...diagram.beamProps} />
          </div>
          <div style={{ flex: '1 1 160px', maxWidth: 220 }}>
            <CrossSectionDiagram {...diagram.crossSectionProps} />
          </div>
        </div>
      );
    default:
      return null;
  }
}
