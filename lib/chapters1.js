// 구조역학 1(CH.1~CH.5) 챕터/소주제 메타데이터 — lib/chapters.js(구조역학 2, CH.6~CH.10)와 같은 구조.
// 원본 프로토타입("구조역학1 (13).html")에는 소주제 slug가 없어서(이름으로만 렌더링했음)
// 라우트용 영문 kebab-case slug를 여기서 새로 붙였다.
export const CHAPTER_ICONS_1 = {
  'CH.1': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 3v7M12 14v7M9 6l3-3 3 3M9 18l3 3 3-3"/></svg>',
  'CH.2': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 19c4-1 6-9 9-9s5 8 9 9"/></svg>',
  'CH.3': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="9" y="3" width="6" height="18" rx="2"/><path d="M6 8h1M6 12h1M6 16h1M17 8h1M17 12h1M17 16h1"/></svg>',
  'CH.4': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="10" width="16" height="4"/><path d="M4 10l3-3M20 14l-3 3"/></svg>',
  'CH.5': '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="4" y="9" width="16" height="6"/><path d="M4 9l8-5 8 5"/></svg>',
};

export const chapters1 = [
  {
    num: 'CH.1',
    title: 'Tension, Compression, and Shear',
    desc: '인장/압축/전단의 기본 개념과 허용응력 설계를 다루는 챕터',
    ready: true,
    base: '/subjects/structural-mechanics-1/ch1',
    subtopics: [
      { slug: 'normal-stress-and-strain', name: 'Normal Stress and Strain', desc: '축하중을 받는 부재의 수직응력과 수직변형률을 계산하고 시각화합니다.' },
      { slug: 'mechanical-properties', name: 'Mechanical Properties of Materials', desc: '응력-변형률 선도를 슬라이더로 탐색하며 연성/취성 재료의 거동을 학습합니다.' },
      { slug: 'hookes-law-poisson', name: "Hooke's Law and Poisson's Ratio", desc: '선형탄성 구간의 응력-변형률 관계와 횡방향 변형(Poisson 효과)을 다룹니다.' },
      { slug: 'shear-stress-and-strain', name: 'Shear Stress and Strain', desc: '단일/이중 전단, bearing stress, 전단변형률을 비교하는 도구입니다.' },
      { slug: 'allowable-stresses-design', name: 'Allowable Stresses and Design', desc: '안전율, 허용응력을 이용한 안전성 판정 및 부재 설계를 다룹니다.' },
    ],
  },
  {
    num: 'CH.2',
    title: 'Axially Loaded Members',
    desc: '축하중을 받는 부재의 변형, 비균일/부정정 구조, 열응력, 응력집중을 다루는 챕터',
    ready: true,
    base: '/subjects/structural-mechanics-1/ch2',
    subtopics: [
      { slug: 'spring-constant', name: 'Spring Constant and Flexibility', desc: '축방향 부재를 스프링으로 보고 강성(k)과 유연도(f) 개념을 학습합니다.' },
      { slug: 'nonuniform-bar', name: 'Nonuniform Bar (Multi-Segment)', desc: '구간마다 내력·단면·재질이 다른 비균일 부재의 전체 변위를 계산합니다.' },
      { slug: 'statically-indeterminate-axial', name: 'Statically Indeterminate Axial Members', desc: '양단 고정된 부재에 중간하중이 작용하는 부정정 구조의 반력을 구합니다.' },
      { slug: 'thermal-effects', name: 'Thermal Effects and Prestrain', desc: '자유 열팽창과 구속된 부재의 열응력을 비교합니다.' },
      { slug: 'stress-concentration', name: 'Stress Concentration', desc: '구멍이 있는 평판의 공칭응력과 최대응력을 계산합니다.' },
    ],
  },
  {
    num: 'CH.3',
    title: 'Torsion',
    desc: '원형축의 비틀림 변형, 전단응력, 설계, 다구간 축, 강도/무게비를 다루는 챕터',
    ready: true,
    base: '/subjects/structural-mechanics-1/ch3',
    subtopics: [
      { slug: 'torsional-deformation', name: 'Torsional Deformation and Angle of Twist', desc: '비틀림각 φ와 전단변형률 γ의 분포를 계산하고 시각화합니다.' },
      { slug: 'torsion-formula', name: 'Torsion Formula (Shear Stress Distribution)', desc: '토크로부터 단면 내 전단응력 분포와 최대응력을 계산합니다.' },
      { slug: 'allowable-torque-diameter', name: 'Allowable Torque and Required Diameter', desc: '응력·비틀림각 두 조건 중 지배조건을 판정하여 설계값을 구합니다.' },
      { slug: 'torque-diagram', name: 'Torque Diagram (Multi-Segment Shaft)', desc: '여러 구간에 다른 토크·재질이 걸린 축의 T(x)와 전체 비틀림각을 계산합니다.' },
      { slug: 'strength-to-weight', name: 'Strength-to-Weight Ratio (Hollow vs Solid)', desc: '동일 외경의 중공축과 중실축의 응력·무게·효율을 비교합니다.' },
    ],
  },
  {
    num: 'CH.4',
    title: 'Shear Force and Bending Moment',
    desc: '보의 반력, 전단력도(SFD)·굽힘모멘트도(BMD)를 다루는 챕터',
    ready: true,
    base: '/subjects/structural-mechanics-1/ch4',
    subtopics: [
      { slug: 'beam-reactions', name: 'Beam Reactions (Equilibrium)', desc: '점하중·분포하중·모멘트가 섞인 단순보의 반력을 평형방정식으로 구합니다.' },
      { slug: 'sfd-bmd-point-load', name: 'SFD and BMD — Point Load', desc: '집중하중을 받는 단순보의 전단력도·굽힘모멘트도를 그립니다.' },
      { slug: 'sfd-bmd-udl', name: 'SFD and BMD — Uniform Distributed Load', desc: '등분포하중을 받는 단순보의 SFD(직선)·BMD(포물선)를 계산합니다.' },
      { slug: 'sfd-bmd-cantilever', name: 'SFD and BMD — Cantilever Beam', desc: '캔틸레버보의 고정단 반력·모멘트와 SFD/BMD를 계산합니다.' },
      { slug: 'sfd-bmd-overhang', name: 'SFD and BMD — Overhanging Beam', desc: '돌출보의 반력(음수 가능)과 구간별 부호가 바뀌는 BMD를 다룹니다.' },
      { slug: 'sfd-bmd-triangular-load', name: 'SFD and BMD — Linearly Varying Load', desc: '삼각형(선형변화) 분포하중을 캔틸레버/단순보/롤러+슬라이딩 지지에서 다룹니다.' },
    ],
  },
  {
    num: 'CH.5',
    title: 'Stresses in Beams',
    desc: '보의 휨응력, 단면설계, 전단응력, 조합하중을 다루는 챕터',
    ready: true,
    base: '/subjects/structural-mechanics-1/ch5',
    subtopics: [
      { slug: 'flexure-formula', name: 'Flexure Formula (Normal Stress in Beams)', desc: '굽힘공식 σ=Mc/I와 곡률-모멘트 관계를 계산하고 응력분포를 시각화합니다.' },
      { slug: 'section-modulus-design', name: 'Section Modulus and Beam Design', desc: '허용응력 기준으로 필요한 단면계수와 치수를 역산합니다.' },
      { slug: 'shear-stress-rectangular', name: 'Shear Stress in Beams (Rectangular)', desc: '직사각형 단면의 전단응력 분포와 중립축 최대값을 계산합니다.' },
      { slug: 'shear-stress-circular-flow', name: 'Shear Stress (Circular) and Shear Flow', desc: '원형 단면 전단응력과 조립보의 전단흐름·체결재 간격을 계산합니다.' },
      { slug: 'combined-loading', name: 'Combined Loading (Axial + Bending)', desc: '축력과 굽힘모멘트, 또는 편심하중에 의한 조합응력을 중첩원리로 계산합니다.' },
    ],
  },
];

export function findTopic1(chapterNum, slug) {
  const chapter = chapters1.find((c) => c.num === chapterNum);
  const subtopic = chapter?.subtopics.find((s) => s.slug === slug);
  if (!chapter || !subtopic) return null;
  return { chapter, subtopic, href: `${chapter.base}/${subtopic.slug}` };
}
