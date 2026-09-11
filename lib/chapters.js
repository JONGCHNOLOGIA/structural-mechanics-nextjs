// 프로토타입 HTML의 chapters/icons를 그대로 옮긴 것. 홈 화면 카드 + 각 계산기 페이지의 탭바에서 공용으로 씀.
export const CHAPTER_ICONS = {
  'CH.6': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="7" y="3" width="10" height="18" rx="1"/><path d="M7 8h10M7 16h10" stroke-dasharray="1 2.4"/></svg>',
  'CH.7': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8"/><path d="M4 12h16M12 4v16"/></svg>',
  'CH.8': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="5" y="9" width="10" height="10"/><rect x="9" y="5" width="10" height="10"/></svg>',
  'CH.9': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8h18M8 8q4 9 8 0" stroke-linecap="round"/></svg>',
  'CH.10': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 8h18" stroke-linecap="round"/><path d="M6 8l-2 4h4zM12 8l-2 4h4zM18 8l-2 4h4z"/></svg>',
};

export const chapters = [
  {
    num: 'CH.6',
    title: 'Stress in beams',
    desc: '굽힘응력과 전단응력의 분포에 대해서 배우는 챕터',
    ready: true,
    base: '/subjects/structural-mechanics-2/ch6',
    subtopics: [
      { slug: 'composite-beams', name: 'Composite Beams', desc: '서로 다른 두 재료로 이루어진 단면의 중립축과 응력 분포를 계산합니다.' },
      { slug: 'transformed-section', name: 'Transformed Section Method', desc: '복합단면을 하나의 재료로 환산해 동일한 문제를 더 간단히 풉니다.' },
      { slug: 'fgm', name: 'Functionally Graded Beams', desc: '단면 내에서 재료 조성이 연속적으로 변하는 보의 개념을 다룹니다.' },
      { slug: 'inclined-loads', name: 'Beams with Inclined Loads', desc: '경사하중을 두 축의 모멘트로 분해해 단면 각 지점의 응력 부호를 판정합니다.' },
      { slug: 'elastoplastic-bending', name: 'Elastoplastic Bending', desc: '하중이 커짐에 따라 탄성에서 완전소성으로 변하는 단면의 응력분포 변화를 봅니다.' },
    ],
  },
  {
    num: 'CH.7',
    title: 'Analysis of stress and strain',
    desc: '응력과 변형률의 변환, 모어의 원을 다루는 챕터',
    ready: true,
    base: '/subjects/structural-mechanics-2/ch7',
    subtopics: [
      { slug: 'plane-stress', name: 'Plane Stress', desc: '평면응력 변환식으로 임의 각도의 응력을 구하고, 주응력과 최대전단응력까지 함께 다룹니다.' },
      { slug: 'mohrs-circle', name: "Mohr's Circle", desc: '평면응력 변환을 원 하나로 그래픽하게 표현하는 방법입니다.' },
      { slug: 'hookes-law', name: "Hooke's Law for Plane Stress", desc: '평면응력 상태에서 응력과 변형률 사이의 관계(후크의 법칙)를 다룹니다.' },
    ],
  },
  {
    num: 'CH.8',
    title: 'Application of plane stress',
    desc: '평면응력 상태의 응용을 다루는 챕터',
    ready: true,
    base: '/subjects/structural-mechanics-2/ch8',
    subtopics: [
      { slug: 'spherical-pressure-vessels', name: 'Spherical Pressure Vessels', desc: '구형 압력용기 벽면의 응력, 최대전단응력, 변형률을 다룹니다.' },
      { slug: 'cylindrical-pressure-vessels', name: 'Cylindrical Pressure Vessels', desc: '원통형 압력용기의 원주응력·축방향응력과, 용접선 각도에 따른 응력 변환을 다룹니다.' },
      { slug: 'max-beam-stress', name: 'Maximum Stresses in Beams', desc: '보의 단면 내 위치(y)에 따라 굽힘응력과 전단응력이 어떻게 조합되는지 다룹니다.' },
      { slug: 'combined-loadings', name: 'Combined Loadings', desc: '여러 하중이 겹칠 때, 각 성분을 합쳐 평면응력 해석으로 마무리하는 방법을 다룹니다.' },
    ],
  },
  { num: 'CH.9', title: 'Deflection of beams', desc: '보의 처짐을 계산하고 시각화하는 챕터 (준비중)', ready: false, base: '', subtopics: [] },
  { num: 'CH.10', title: 'Statically indeterminate beams', desc: '부정정보의 해석을 다루는 챕터 (준비중)', ready: false, base: '', subtopics: [] },
];
