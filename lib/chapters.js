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
  {
    num: 'CH.9',
    title: 'Deflection of beams',
    desc: '보의 처짐을 계산하고 시각화하는 챕터',
    ready: true,
    base: '/subjects/structural-mechanics-2/ch9',
    subtopics: [
      { slug: 'bending-moment-equation', name: 'Bending-Moment Equation', desc: '굽힘모멘트식을 적분하는 방법과 4차 미분방정식을 직접 푸는 방법, 두 가지로 처짐곡선을 구합니다.' },
      { slug: 'shear-force-equation', name: 'Shear-Force Equation', desc: 'Macaulay 괄호(단위함수)를 이용해 집중하중이 있는 보의 처짐을 전단력식 적분으로 구합니다.' },
      { slug: 'method-of-superposition', name: 'Method of Superposition', desc: '표준 하중 케이스들을 중첩해서 복합 하중을 받는 보의 처짐을 구합니다.' },
      { slug: 'moment-area-method', name: 'Moment-Area Method', desc: 'M/EI 다이어그램의 면적과 1차모멘트로 처짐각과 처짐을 구하는 1·2 모멘트-면적 정리를 다룹니다.' },
      { slug: 'nonprismatic-beams', name: 'Nonprismatic Beams', desc: '단면(I)이 구간마다 달라지는 보의 처짐을 구간별로 나누어 계산합니다.' },
      { slug: 'strain-energy-of-bending', name: 'Strain Energy of Bending', desc: '굽힘모멘트가 저장하는 변형에너지 U = ∫M²/2EI dx를 계산합니다.' },
      { slug: 'castiglianos-theorem', name: "Castigliano's Theorem", desc: '변형에너지의 편미분(카스틸리아노 정리)과 단위하중법으로 처짐·처짐각을 구합니다.' },
    ],
  },
  {
    num: 'CH.10',
    title: 'Statically indeterminate beams',
    desc: '반력이 평형방정식보다 많은 부정정보를 푸는 챕터',
    ready: true,
    base: '/subjects/structural-mechanics-2/ch10',
    subtopics: [
      { slug: 'differential-equation-method', name: 'Differential Equation Method', desc: '반력 하나를 여분력으로 남기고 EIv"=M(x)를 적분해서, 남는 경계조건으로 여분력을 구합니다.' },
      { slug: 'method-of-superposition', name: 'Method of Superposition', desc: '여분력을 제거한 released structure에 단위하중을 줘서, 적합조건(실제 변위=0)으로 여분력을 구합니다.' },
    ],
  },
];

// (chapterNum, slug) 문자열 쌍으로 챕터/소주제 메타데이터와 실제 라우트를 한 번에 찾는 헬퍼.
// 홈 화면 진도 카드("이어서 학습하기", "최근 틀린 개념")에서 씀.
export function findTopic(chapterNum, slug) {
  const chapter = chapters.find((c) => c.num === chapterNum);
  const subtopic = chapter?.subtopics.find((s) => s.slug === slug);
  if (!chapter || !subtopic) return null;
  return { chapter, subtopic, href: `${chapter.base}/${subtopic.slug}` };
}
