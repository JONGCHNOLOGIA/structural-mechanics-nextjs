'use client';

/*
  참고자료 mmch9.pdf p.24 "Area and centroid" 표를 그대로 옮긴 것.

  모멘트-면적법은 M/EI 다이어그램의 "넓이"와 "도심까지의 거리"만 있으면 손으로 풀린다.
  실제 다이어그램은 대개 이 세 조각으로 잘라 쓸 수 있어서 교재도 이 표부터 외우게 한다.
  화면에서 수치적분으로 구한 값과 견줘볼 수 있도록 설정 메뉴 아래에 접어두었다.

  교재 그림과 같은 배치로 그린다: 세 조각 모두 **왼쪽이 높이 a이고 오른쪽으로 갈수록 얇아지며**,
  x̄는 **오른쪽 끝에서 잰 거리**다 (교재의 치수 화살표가 오른쪽 끝에 붙어 있다).
  — 직사각형 x̄ = l/2, 삼각형 2l/3, 포물선 3l/4. 전부 왼쪽(두꺼운 쪽)에 도심이 쏠려 있다는 뜻이다.
*/

const BLUE = '#4A7BB7';
const GRAY = '#51626F';

const ROWS = [
  {
    name: '직사각형',
    area: 'a·l',
    xbar: 'l / 2',
    xbarFrac: 1 / 2, // 오른쪽 끝에서 잰 비율
    f: () => 1,
    note: 'M/EI가 구간 내내 일정할 때 (예: 끝 모멘트만 받는 보)',
  },
  {
    name: '삼각형',
    area: 'a·l / 2',
    xbar: '2l / 3',
    xbarFrac: 2 / 3,
    f: (t) => 1 - t,
    note: 'M/EI가 직선으로 줄 때 (예: 자유단에 집중하중을 받는 캔틸레버)',
  },
  {
    name: '포물선 (2차)',
    area: 'a·l / 3',
    xbar: '3l / 4',
    xbarFrac: 3 / 4,
    f: (t) => (1 - t) * (1 - t),
    note: 'M/EI가 2차식으로 줄 때 (예: 등분포하중을 받는 캔틸레버)',
  },
];

function shapePath(f, w, h) {
  const back = [];
  for (let i = 20; i >= 0; i--) {
    const t = i / 20;
    back.push(`L ${(t * w).toFixed(2)} ${(h * f(t)).toFixed(2)}`);
  }
  return `M 0 0 L ${w} 0 ${back.join(' ')} Z`;
}

function ShapeSVG({ row }) {
  const w = 110, h = 42, padTop = 20, padBottom = 8, padL = 16, padR = 8;
  const W = padL + w + padR, H = padTop + h + padBottom;
  const xb = w * (1 - row.xbarFrac); // x̄ 화살표의 왼쪽 끝 (= 도심 위치)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ flexShrink: 0 }}>
      <g transform={`translate(${padL}, ${padTop})`}>
        <path d={shapePath(row.f, w, h)} fill={BLUE} fillOpacity="0.8" stroke={GRAY} strokeWidth="1" />
        {/* 높이 a */}
        <text x="-12" y={h / 2 + 4} fontSize="10" fill={GRAY} fontStyle="italic">a</text>
        {/* x̄ — 오른쪽 끝에서 도심까지 */}
        <line x1={xb} y1="-11" x2={w} y2="-11" stroke={GRAY} strokeWidth="1" />
        <polygon points={`${xb},-11 ${xb + 5},-13.5 ${xb + 5},-8.5`} fill={GRAY} />
        <polygon points={`${w},-11 ${w - 5},-13.5 ${w - 5},-8.5`} fill={GRAY} />
        <line x1={xb} y1="-14" x2={xb} y2={h * row.f(1 - row.xbarFrac)} stroke={GRAY} strokeWidth="0.9" strokeDasharray="3 2" />
      </g>
    </svg>
  );
}

export default function AreaCentroidTable() {
  return (
    <div>
      <div style={{ fontSize: 11.5, color: 'var(--gray-soft)', lineHeight: 1.7, marginBottom: 10 }}>
        M/EI 다이어그램을 이 세 조각으로 잘라 쓰면 넓이와 도심을 외운 값으로 바로 읽을 수 있어요.
        <br />
        a = 조각의 높이, l = 조각의 길이이고, <b>x̄는 오른쪽 끝에서 잰 거리</b>예요.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* 모양(134px)+넓이(76px)+x̄(56px)+설명 4칸을 고정폭으로 한 줄에 늘어놓던 걸, 좁은 화면(폰)
            에서 칸이 넘치지 않도록 flexWrap을 켠다 — 설명 칸은 minWidth를 0으로 낮춰서(기본값
            auto면 내용 길이만큼 폭을 요구해 줄바꿈 대신 그냥 넘쳐버린다) 필요하면 통째로 다음 줄로
            떨어지게 한다. */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 10.5, fontWeight: 800, color: 'var(--gray-soft)' }}>
          <span style={{ width: 134 }}>모양</span>
          <span style={{ width: 76 }}>넓이 (Area)</span>
          <span style={{ width: 56 }}>x̄</span>
        </div>
        {ROWS.map((r) => (
          <div key={r.name} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', borderTop: '1px solid var(--line)', paddingTop: 6 }}>
            <ShapeSVG row={r} />
            <span style={{ width: 76, fontSize: 12.5, fontWeight: 800 }}>{r.area}</span>
            <span style={{ width: 56, fontSize: 12.5, fontWeight: 800 }}>{r.xbar}</span>
            <span style={{ flex: '1 1 160px', minWidth: 0, fontSize: 10.5, color: 'var(--gray-soft)', lineHeight: 1.5 }}>{r.note}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
