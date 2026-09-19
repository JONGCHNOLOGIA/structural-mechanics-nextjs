// 참고자료 mmch8.pdf의 Combined Loadings 예제 8-4 ~ 8-7을 그대로 옮긴 것.
//
// 값과 풀이 순서는 교재를 따랐고, 최종 답도 교재에 인쇄된 값을 함께 적어 두었다
// (textbookAnswer). 화면에 보여주는 숫자는 입력값으로 다시 계산한 것이라,
// 둘이 어긋나면 교재를 잘못 옮긴 것이므로 바로 눈에 띈다.
//
// 각 예제는 "여러 하중을 각각 응력으로 바꾼 뒤 한 점에서 σx·σy·τxy로 합친다"는
// 같은 흐름을 갖는다. steps가 그 흐름이고, 마지막에 주응력으로 정리한다.

export const COMBINED_EXAMPLES = [
  {
    id: '8-4',
    title: 'Example 8-4 — 유정 시추 케이싱',
    scene: 'casing',
    summary:
      '기름과 가스를 퍼올리는 시추관이다. 관 안쪽에는 압력이 걸리고, 관 자체 무게가 아래로 누르며, 회전시키느라 비틀림도 함께 받는다. 세 하중이 한 점에서 만난다.',
    given: [
      { sym: 'p', label: '내부 압력', value: 15, unit: 'MPa' },
      { sym: 'r', label: '평균 반지름', value: 100, unit: 'mm' },
      { sym: 't', label: '관 두께', value: 18, unit: 'mm' },
      { sym: 'P', label: '축방향 압축력 (자중)', value: 175, unit: 'kN' },
      { sym: 'T', label: '비틀림 토크', value: 14, unit: 'kN·m' },
      { sym: 'Ip', label: '극관성모멘트', value: 8.606e-5, unit: 'm⁴' },
    ],
    steps: [
      {
        title: 'Step 1. 내부 압력 → 둘레 방향 응력 σx',
        formula: 'σx = pr / t',
        detail: '15 MPa × 100 mm / 18 mm',
        result: 83.3,
        unit: 'MPa',
        note: '기름·가스가 안에서 밀어내는 힘이 관을 둘레 방향으로 잡아당긴다.',
      },
      {
        title: 'Step 2. 자중 → 길이 방향 응력 σy',
        formula: 'σy = −P / A,  A = π[r² − (r−t)²]',
        detail: '−175 kN / A',
        result: -17,
        unit: 'MPa',
        note: '관이 흐르는 중이라 길이 방향 압력 성분은 0으로 본다. 음수 = 눌린다.',
      },
      {
        title: 'Step 3. 토크 → 전단응력 τxy',
        formula: 'τxy = T·r / Ip',
        detail: '14 kN·m × 100 mm / 8.606×10⁻⁵ m⁴',
        result: 16.3,
        unit: 'MPa',
      },
    ],
    state: { sigmaX: 83.3, sigmaY: -17, tauXY: 16.3, unit: 'MPa' },
    textbookAnswer: { sigma1: 85.9, sigma2: -19.5, tauMax: 52.7, unit: 'MPa' },
  },

  {
    id: '8-5',
    title: 'Example 8-5 — 압력을 받으면서 휘는 원통 탱크',
    scene: 'tank',
    summary:
      '원통형 압력용기가 받침 위에 놓여 있고, 그 자체 하중으로 보처럼 휜다. 안쪽 압력이 만드는 두 방향 인장에, 보로서 받는 전단이 겹친다.',
    given: [
      { sym: 'p', label: '내부 압력', value: 105, unit: 'psi' },
      { sym: 'r', label: '안쪽 반지름', value: 48, unit: 'in' },
      { sym: 't', label: '벽 두께', value: 0.75, unit: 'in' },
      { sym: 'q', label: '등분포하중', value: 10500, unit: 'lb/ft' },
      { sym: 'L', label: '경간', value: 20, unit: 'ft' },
    ],
    steps: [
      {
        title: 'Step 1. 길이 방향 응력 σx',
        formula: 'σx = σL = pr / 2t',
        detail: '105 psi × 48 in / (2 × 0.75 in)',
        result: 3360,
        unit: 'psi',
      },
      {
        title: 'Step 2. 둘레 방향 응력 σy',
        formula: 'σy = σr = pr / t',
        detail: '105 psi × 48 in / 0.75 in',
        result: 6720,
        unit: 'psi',
        note: '둘레 방향이 길이 방향의 정확히 두 배다.',
      },
      {
        title: 'Step 3. 보로서 받는 전단 τxy',
        formula: 'τxy = −(4V/3A)·(r₁²+r₁r₂+r₂²)/(r₁²+r₂²),  V = 3qL/10',
        detail: 'V = 3(10,500 lb/ft)(20 ft)/10, r₁=48 in, r₂=48.75 in',
        result: -552.7,
        unit: 'psi',
        note: '음수 = 요소의 +x면에서 아래 방향. 굽힘모멘트에 의한 수직응력은 이 점이 중립면에 있어서 0이다.',
      },
    ],
    state: { sigmaX: 3360, sigmaY: 6720, tauXY: -552.7, unit: 'psi' },
    textbookAnswer: null,
  },

  {
    id: '8-6',
    title: 'Example 8-6 — 바람을 받는 간판 기둥',
    scene: 'sign',
    summary:
      '간판이 기둥 옆으로 튀어나와 달려 있다. 바람이 간판을 밀면 기둥은 휘기도 하고(굽힘), 간판이 옆에 붙어 있어서 비틀리기도 한다(비틀림). 기둥 밑동의 A점과 B점을 본다.',
    given: [
      { sym: 'W', label: '바람이 미는 힘 (W = pA)', value: 4.8, unit: 'kN' },
      { sym: 'b', label: '간판 중심까지의 거리', value: 1.5, unit: 'm' },
      { sym: 'h', label: '간판 중심 높이', value: 6.6, unit: 'm' },
      { sym: 'd₂', label: '기둥 바깥지름', value: 220, unit: 'mm' },
      { sym: 'd₁', label: '기둥 안지름', value: 180, unit: 'mm' },
    ],
    steps: [
      {
        title: 'Step 1. 비틀림 토크 T',
        formula: 'T = W · b',
        detail: '4.8 kN × 1.5 m',
        result: 7.2,
        unit: 'kN·m',
        note: '간판이 기둥에서 b만큼 옆으로 나와 있어서, 미는 힘이 기둥을 비튼다.',
      },
      {
        title: 'Step 2. 굽힘모멘트 M',
        formula: 'M = W · h',
        detail: '4.8 kN × 6.6 m',
        result: 31.68,
        unit: 'kN·m',
        note: '밑동에서 가장 크다 — 그래서 A·B점을 밑동에서 잡는다.',
      },
      {
        title: 'Step 3. 전단력 V',
        formula: 'V = W',
        detail: '바람이 미는 힘이 그대로 기둥을 가로지른다',
        result: 4.8,
        unit: 'kN',
      },
    ],
    state: null, // A점·B점을 따로 봐야 해서 하나의 상태로 묶지 않는다
    textbookAnswer: null,
  },

  {
    id: '8-7',
    title: 'Example 8-7 — 기둥에 매달린 받침대',
    scene: 'bracket',
    summary:
      '속이 빈 네모 기둥 위에 받침대가 튀어나와 있다. 위에서 누르는 힘 P₁은 기둥 중심에서 d만큼 벗어나 있어 굽힘까지 만들고, 옆에서 미는 힘 P₂는 전단과 또 다른 굽힘을 만든다.',
    given: [
      { sym: 'P₁', label: '축방향 압축력', value: 3240, unit: 'lb' },
      { sym: 'd', label: 'P₁의 편심 거리', value: 9, unit: 'in' },
      { sym: 'P₂', label: '가로 방향 힘', value: 800, unit: 'lb' },
      { sym: 'h', label: '기둥 높이', value: 52, unit: 'in' },
      { sym: 'b', label: '네모 단면 한 변', value: 6, unit: 'in' },
      { sym: 't', label: '벽 두께', value: 0.5, unit: 'in' },
    ],
    steps: [
      {
        title: 'Step 1. P₁이 만드는 굽힘모멘트 M₁',
        formula: 'M₁ = P₁ · d',
        detail: '3,240 lb × 9 in',
        result: 29160,
        unit: 'lb·in',
        note: '힘이 기둥 중심을 벗어나 있으면, 누르기만 하는 게 아니라 휘게도 한다.',
      },
      {
        title: 'Step 2. P₂가 만드는 굽힘모멘트 M₂',
        formula: 'M₂ = P₂ · h',
        detail: '800 lb × 52 in',
        result: 41600,
        unit: 'lb·in',
      },
      {
        title: 'Step 3. 합쳐야 할 하중 정리',
        formula: '축력 P₁, 전단력 P₂, 굽힘 M₁ + M₂',
        detail: '네 가지가 같은 단면에서 만난다',
        result: null,
        note: 'A점과 B점에서 각각 σ와 τ를 구한 뒤 주응력으로 정리한다.',
      },
    ],
    state: null,
    textbookAnswer: null,
  },
];
