'use client';

import { useState } from 'react';
import EditableText from '@/components/EditableText';

/*
  "계산하기"를 눌러야 계산 과정이 열리는 틀 — 구조역학 2(Composite Beams 등)와 같은 동작.

  누른 시점의 입력값을 통째로 얼려서(snapshot) 그 값으로만 계산 과정을 그린다. 그래서 버튼을
  누른 뒤 슬라이더를 움직여도 아래 계산 과정은 바뀌지 않고, 대신 "입력값이 바뀌었어요" 경고가
  뜬다. 시각화 그림과 결과 카드는 지금처럼 실시간으로 움직인다.
*/
export function useCalcGate(inputs) {
  const [snapshot, setSnapshot] = useState(null);

  // 얼려둔 입력과 지금 입력이 다른지 — 객체를 그대로 비교하면 매 렌더 새 객체라 안 되므로 직렬화해서 비교
  const stale = snapshot !== null && JSON.stringify(snapshot) !== JSON.stringify(inputs);

  return {
    snapshot,
    stale,
    state: snapshot === null ? 'idle' : stale ? 'stale' : 'done',
    calculate: () => setSnapshot(inputs),
  };
}

export function CalcGate({ gate, title = '계산 과정 (Step by Step)', formula, children }) {
  return (
    <div className="step-card">
      <div className="step-header static">{title}</div>
      <div className="step-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
          {formula && (
            <div className="step-formula" style={{ flex: '1 1 240px', margin: 0 }}>
              {formula}
            </div>
          )}
          <div style={{ flexShrink: 0, textAlign: 'right', marginLeft: formula ? 0 : 'auto' }}>
            {gate.state === 'stale' && (
              <EditableText
                as="div"
                contentKey="calcGate.staleWarning"
                defaultText="⚠️ 입력값이 바뀌었어요 — 아래는 이전 값 기준 결과예요."
                style={{
                  fontSize: 11,
                  color: 'var(--crimson)',
                  background: 'var(--crimson-soft)',
                  borderRadius: 0,
                  padding: '8px 12px',
                  marginBottom: 8,
                  maxWidth: 180,
                }}
              />
            )}
            <button className="add-block calc-trigger" onClick={gate.calculate} style={{ margin: 0 }}>
              {gate.state === 'idle' ? '계산하기' : '다시 계산하기'}
            </button>
          </div>
        </div>
        {gate.snapshot !== null && children(gate.snapshot)}
      </div>
    </div>
  );
}
