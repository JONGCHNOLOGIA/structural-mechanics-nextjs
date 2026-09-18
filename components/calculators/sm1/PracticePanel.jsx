'use client';

import { useCallback, useEffect, useState } from 'react';

// 소주제별 연습문제 추천 패널 — 원본 프로토타입의 practiceBoxHTML()/makeNProblems()를 React로 옮긴 것.
// 문제는 각 소주제의 "검증된 계산엔진"을 그대로 재사용해서 만들기 때문에, 숫자가 매번 달라져도
// 정답은 계산기가 내놓는 값과 항상 일치한다. generate는 {q, a} 하나를 만들어 돌려주는 함수
// (만들다 실패하면 null을 돌려줄 수 있어서, 4개가 찰 때까지 최대 40번만 시도한다).

function makeFour(generate) {
  const out = [];
  let guard = 0;
  while (out.length < 4 && guard < 40) {
    guard++;
    const p = generate();
    if (p) out.push(p);
  }
  return out;
}

export default function PracticePanel({ generate }) {
  const [problems, setProblems] = useState([]);
  const [revealed, setRevealed] = useState(new Set());

  const regenerate = useCallback(() => {
    setProblems(makeFour(generate));
    setRevealed(new Set());
  }, [generate]);

  // 서버 렌더와 클라이언트 렌더가 서로 다른 난수를 뽑아 hydration 오류가 나지 않도록,
  // 첫 문제 묶음도 마운트된 뒤에 만든다.
  useEffect(() => {
    regenerate();
  }, [regenerate]);

  function reveal(i) {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  }

  return (
    <div className="practice-panel">
      <h3>📝 이 소주제 연습문제 추천 (교안 문제유형 기반, 매번 다른 숫자)</h3>
      <div className="steps">
        {problems.map((p, i) => (
          <div className="step-card" key={i}>
            <div className="step-header static">문제 {i + 1}</div>
            <div className="step-body">
              <div>{p.q}</div>
              {revealed.has(i) ? (
                <div className="practice-answer">{p.a}</div>
              ) : (
                <button
                  type="button"
                  className="reset-btn"
                  style={{ width: 'auto', padding: '7px 16px', marginTop: 10 }}
                  onClick={() => reveal(i)}
                >
                  정답 보기
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="reset-btn" onClick={regenerate}>
        🔄 다른 문제 4개 생성
      </button>
    </div>
  );
}

// 문제 생성기에서 쓰는 난수 헬퍼 (원본과 동일)
export function randRange(min, max) {
  return min + Math.random() * (max - min);
}
export function randInt(min, max) {
  return Math.round(randRange(min, max));
}
export function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
