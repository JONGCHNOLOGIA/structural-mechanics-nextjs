// 참고자료 mmch10.pdf의 예제/문제를 보 빌더가 바로 불러올 수 있는 형태로 옮긴 것.
// CH.10의 두 소분류(미분방정식법·중첩법)가 같은 목록을 쓴다 — 같은 보를 두 방법으로
// 풀어보라는 게 이 챕터의 요지라서, 예제가 양쪽에 똑같이 있어야 한다.
//
// answer는 교재/표준 해의 닫힌 식이다. 화면 값은 입력에서 다시 계산한 것이라,
// 둘이 어긋나면 옮겨 적기를 잘못한 것이므로 바로 눈에 띈다.

export const CH10_EXAMPLES = [
  {
    id: '10-1',
    label: 'Example 10-1',
    hint: '돌출 캔틸레버 + 등분포하중 — RB 또는 MA를 여분력으로',
    L: 4,
    q: 10 * 1000,
    supports: [['fixed', 0], ['roller', 4]],
    loads: [['udl', 0, 4, 10 * 1000]],
    answer: ({ q, L }) => [
      { sym: 'RB', text: '3qL/8', value: (3 * q * L) / 8, unitType: 'force' },
      { sym: 'RA', text: '5qL/8', value: (5 * q * L) / 8, unitType: 'force' },
      { sym: '|MA|', text: 'qL²/8', value: (q * L * L) / 8, unitType: 'moment' },
    ],
  },
  {
    id: '10-2',
    label: 'Example 10-2',
    hint: '양단고정 + 중앙 집중하중 — 대칭을 써서 절반만 풀기',
    L: 4,
    P: 20 * 1000,
    supports: [['fixed', 0], ['fixed', 4]],
    loads: [['point', 2, 20 * 1000]],
    answer: ({ P, L }) => [
      { sym: '|MA| = |MB|', text: 'PL/8', value: (P * L) / 8, unitType: 'moment' },
      { sym: 'RA = RB', text: 'P/2', value: P / 2, unitType: 'force' },
      { sym: 'δ중앙', text: 'PL³/192EI', value: null, unitType: null },
    ],
  },
  {
    id: '10-3',
    label: 'Example 10-3',
    hint: '돌출 캔틸레버 + 중앙 집중하중 — RB를 여분력으로',
    L: 4,
    P: 20 * 1000,
    supports: [['fixed', 0], ['roller', 4]],
    loads: [['point', 2, 20 * 1000]],
    answer: ({ P, L }) => [
      { sym: 'RB', text: '5P/16', value: (5 * P) / 16, unitType: 'force' },
      { sym: 'RA', text: '11P/16', value: (11 * P) / 16, unitType: 'force' },
      { sym: '|MA|', text: '3PL/16', value: (3 * P * L) / 16, unitType: 'moment' },
    ],
  },
  {
    id: '10-4',
    label: 'Example 10-4',
    hint: '양단고정 + 등분포하중 — MA와 MB 두 개를 여분력으로 (2차 부정정)',
    L: 4,
    q: 10 * 1000,
    supports: [['fixed', 0], ['fixed', 4]],
    loads: [['udl', 0, 4, 10 * 1000]],
    answer: ({ q, L }) => [
      { sym: '|MA| = |MB|', text: 'qL²/12', value: (q * L * L) / 12, unitType: 'moment' },
      { sym: 'RA = RB', text: 'qL/2', value: (q * L) / 2, unitType: 'force' },
      { sym: 'M중앙', text: 'qL²/24', value: (q * L * L) / 24, unitType: 'moment' },
    ],
  },
  {
    id: '10-3-3',
    label: 'Problem 10-3-3',
    hint: '돌출 캔틸레버 + 자유단 모멘트 M₀',
    L: 4,
    M0: 15 * 1000,
    supports: [['fixed', 0], ['roller', 4]],
    loads: [['moment', 4, 15 * 1000]],
    answer: ({ M0, L }) => [
      { sym: 'RB', text: '−3M₀/2L', value: (-3 * M0) / (2 * L), unitType: 'force' },
      { sym: 'RA', text: '3M₀/2L', value: (3 * M0) / (2 * L), unitType: 'force' },
      { sym: '|MA|', text: 'M₀/2', value: M0 / 2, unitType: 'moment' },
    ],
  },
];

// 예제를 보 빌더가 쓰는 형태로 펴준다. id를 붙이는 함수는 부르는 쪽(BeamWorkbench)에서 받는다.
export function buildExample(ex, { sup, pointLoad, udl, momentLoad }) {
  return {
    L: ex.L,
    supports: ex.supports.map(([type, x]) => sup(type, x)),
    loads: ex.loads.map((l) =>
      l[0] === 'point' ? pointLoad(l[1], l[2])
      : l[0] === 'moment' ? momentLoad(l[1], l[2])
      : udl(l[1], l[2], l[3])
    ),
  };
}
