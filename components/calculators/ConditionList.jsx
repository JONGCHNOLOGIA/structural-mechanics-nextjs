'use client';

/*
  적분상수를 정할 때 쓰는 식들을, 교재가 부르는 이름대로 종류를 나눠 보여준다.

  예전에는 전부 "경계조건"이라고만 적어놨는데, mmch9는 세 가지를 구분한다:

    Boundary   — 지지단·자유단에서 처짐이나 처짐각이 정해지는 것
    Continuity — 하중이 바뀌는 자리에서 좌우 구간이 끊기지 않고 이어져야 하는 것
    Symmetry   — 좌우대칭이면 중앙에서 처짐각이 0이라, 절반만 풀어도 되는 것

  어떤 값이 어느 조건에서 나왔는지가 보여야 "조건이 왜 딱 그만큼 필요한지"가 읽힌다.
  조건 목록 자체는 lib/calc/beamBuilder.js의 conditionsFor()가 만든다.
*/

const KIND = {
  boundary: { label: 'Boundary', ko: '경계조건', color: '#C3002F', bg: 'var(--crimson-soft)' },
  continuity: { label: 'Continuity', ko: '연속조건', color: '#1E7F72', bg: '#E7F3EF' },
  symmetry: { label: 'Symmetry', ko: '대칭조건', color: '#4A5FBF', bg: '#E7E9F7' },
};

export default function ConditionList({ conditions, title = '적분상수를 정하는 조건' }) {
  if (!conditions || !conditions.length) return null;
  const order = ['boundary', 'continuity', 'symmetry'];
  const groups = order
    .map((k) => ({ kind: k, items: conditions.filter((c) => c.kind === k) }))
    .filter((g) => g.items.length);

  return (
    <div className="step-row" style={{ display: 'block' }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {groups.map((g) => {
          const k = KIND[g.kind];
          return (
            <div key={g.kind} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span
                style={{
                  background: k.bg, color: k.color, fontSize: 10, fontWeight: 800,
                  padding: '3px 7px', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1,
                }}
                title={k.ko}
              >
                {k.label}
              </span>
              <div style={{ fontSize: 11.5, lineHeight: 1.7 }}>
                {g.items.map((c, i) => (
                  <div key={i}>
                    <b>{c.text}</b>
                    <span style={{ color: 'var(--gray-soft)' }}> — {c.why}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
