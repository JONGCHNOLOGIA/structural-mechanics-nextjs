// CH.1-2 Mechanical Properties of Materials — 원본 프로토타입의 곡선 데이터와
// calculateMaterialProperties()를 그대로 옮긴 것.
// 주의: 이 곡선은 실제 재료의 물성치가 아니라 강의자료의 "정성적 거동"을 나타내는 개념 곡선이라
// 응력/변형률 모두 정규화(normalized)된 값이다.

export const DUCTILE_CURVE = [
  { x: 0, y: 0 },
  { x: 0.02, y: 0.7 },
  { x: 0.03, y: 0.72 },
  { x: 0.15, y: 0.72 },
  { x: 0.55, y: 1.0 },
  { x: 0.75, y: 0.78 },
];
export const DUCTILE_SEGMENTS = [
  { from: 0, to: 0.02, label: "Linear elastic region (Hooke's law)" },
  { from: 0.02, to: 0.03, label: 'Yield transition' },
  { from: 0.03, to: 0.15, label: 'Perfectly plastic (yielding plateau)' },
  { from: 0.15, to: 0.55, label: 'Strain hardening' },
  { from: 0.55, to: 0.75, label: 'Necking' },
];
export const DUCTILE_MARKERS = [
  { x: 0.02, y: 0.7, tag: 'P', name: 'Proportional limit' },
  { x: 0.03, y: 0.72, tag: 'Y', name: 'Yield stress' },
  { x: 0.55, y: 1.0, tag: 'U', name: 'Ultimate stress' },
  { x: 0.75, y: 0.78, tag: 'F', name: 'Fracture' },
];

export const BRITTLE_CURVE = [
  { x: 0, y: 0 },
  { x: 0.01, y: 0.55 },
  { x: 0.03, y: 1.0 },
];
export const BRITTLE_SEGMENTS = [
  { from: 0, to: 0.01, label: 'Linear elastic region' },
  { from: 0.01, to: 0.03, label: 'Approaching fracture (slightly nonlinear, no yielding)' },
];
export const BRITTLE_MARKERS = [
  { x: 0.01, y: 0.55, tag: 'P', name: 'Proportional limit' },
  { x: 0.03, y: 1.0, tag: 'F', name: 'Fracture' },
];

export const PROP_LIMIT_STRAIN = { ductile: 0.02, brittle: 0.01 };

export function curveFor(material) {
  return material === 'ductile' ? DUCTILE_CURVE : BRITTLE_CURVE;
}
export function markersFor(material) {
  return material === 'ductile' ? DUCTILE_MARKERS : BRITTLE_MARKERS;
}

// 꺾은선 위에서 x에 해당하는 y를 선형보간으로 찾고, 어느 구간(a→b)에 있었는지도 같이 돌려준다.
function interpCurve(points, x) {
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = b.x - a.x === 0 ? 0 : (x - a.x) / (b.x - a.x);
      return { y: a.y + t * (b.y - a.y), a, b, t };
    }
  }
  const last = points[points.length - 1];
  return { y: last.y, a: points[points.length - 2], b: last, t: 1 };
}

function segmentLabel(segments, x) {
  for (const seg of segments) {
    if (x >= seg.from && x <= seg.to) return seg.label;
  }
  return segments[segments.length - 1].label;
}

export function computeMaterialProperties(state) {
  const points = curveFor(state.material);
  const segments = state.material === 'ductile' ? DUCTILE_SEGMENTS : BRITTLE_SEGMENTS;
  const maxStrain = points[points.length - 1].x;
  const x = Math.min(Math.max(state.strain, 0), maxStrain);
  const interp = interpCurve(points, x);
  const label = segmentLabel(segments, x);
  const elastic = x <= PROP_LIMIT_STRAIN[state.material];
  return { valid: true, strain: x, stress: interp.y, label, state: elastic ? 'Elastic' : 'Plastic', maxStrain, seg: interp };
}
