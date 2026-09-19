'use client';

import { useEffect, useRef } from 'react';

/*
  참고자료(mmch8.pdf p.13)의 Stress Contour를 다시 그린 것.

  단순지지보 가운데에 집중하중 P가 걸린 상태에서, 보 옆면 전체에 걸쳐 응력이 어떻게
  퍼져 있는지를 색으로 보여준다. 위쪽(압축)과 아래쪽(인장)이 하중점을 중심으로
  부챗살처럼 퍼지는 모양이 나온다.

  ⚠️ 원본 그림은 유한요소해석(FEM) 결과다. 여기서는 보 이론으로 계산한다:
      σx(x,y) = −M(x)·y / I,   τxy(x,y) = V(x)·Q(y) / (I·b)
  모양은 거의 같게 나오지만, 하중이 찍히는 바로 아래처럼 보 이론이 맞지 않는
  국소 영역은 원본과 다르다. FEM 결과인 척하지 않으려고 화면에도 적어 두었다.

  각도 θ를 주면 그 방향으로 돌린 면의 수직응력 σx1을 대신 그린다 —
  같은 보라도 어느 방향으로 자르느냐에 따라 응력 분포가 달라진다는 걸 보여주기 위함.
      σx1 = (σx+σy)/2 + (σx−σy)/2·cos2θ + τxy·sin2θ   (여기서 σy = 0)

  색은 교재와 같은 무지개 순서 — 압축(−)은 빨강, 0은 초록, 인장(+)은 파랑.
  연속 그라데이션이 아니라 단계로 끊어서 칠하기 때문에 등고선 띠가 저절로 생긴다.
*/

const BANDS = 18;

// 압축(−1) → 0 → 인장(+1) 로 가는 무지개. 교재 컬러바와 같은 방향(빨강→초록→파랑).
function rainbow(t) {
  const clamped = Math.max(-1, Math.min(1, t));
  // -1..1 을 0..1 로
  const u = (clamped + 1) / 2;
  // 빨강(0) → 주황 → 노랑 → 초록(0.5) → 하늘 → 파랑(1)
  const stops = [
    [0.0, 200, 30, 40],
    [0.18, 233, 110, 40],
    [0.34, 240, 200, 60],
    [0.5, 120, 190, 110],
    [0.66, 70, 175, 205],
    [0.84, 45, 105, 190],
    [1.0, 30, 45, 130],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, r0, g0, b0] = stops[i];
    const [p1, r1, g1, b1] = stops[i + 1];
    if (u <= p1 || i === stops.length - 2) {
      const f = p1 === p0 ? 0 : (u - p0) / (p1 - p0);
      const ff = Math.max(0, Math.min(1, f));
      return [Math.round(r0 + (r1 - r0) * ff), Math.round(g0 + (g1 - g0) * ff), Math.round(b0 + (b1 - b0) * ff)];
    }
  }
  return [0, 0, 0];
}

export default function StressContour({ width, height, P, L, thetaDeg = 0 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);

    const b = width, h = height;
    const I = (b * Math.pow(h, 3)) / 12;
    if (!(I > 0) || !(L > 0)) return;

    const th = (thetaDeg * Math.PI) / 180;
    const cos2 = Math.cos(2 * th), sin2 = Math.sin(2 * th);

    // 단순지지보 + 중앙 집중하중: 반력 P/2, M(x)=P·x/2 (x ≤ L/2), V = ±P/2
    const Mof = (x) => (x <= L / 2 ? (P * x) / 2 : (P * (L - x)) / 2);
    const Vof = (x) => (x <= L / 2 ? P / 2 : -P / 2);
    const Qof = (y) => (b / 2) * (Math.pow(h, 2) / 4 - y * y);

    const valueAt = (x, y) => {
      const sx = (-Mof(x) * y) / I;
      const txy = (Vof(x) * Qof(y)) / (I * b);
      return (sx / 2) + (sx / 2) * cos2 + txy * sin2; // σy = 0
    };

    // 색 눈금은 "이 보에서 나올 수 있는 최댓값"(중앙 상·하단의 굽힘응력)으로 고정한다 —
    // 매 프레임 최댓값에 맞춰 다시 정규화하면 각도를 돌릴 때 색이 요동쳐서 비교가 안 된다.
    const sMax = Math.abs((-Mof(L / 2) * (h / 2)) / I) || 1;

    const cols = W, rows = H;
    const img = ctx.createImageData(W, H);
    for (let j = 0; j < rows; j++) {
      // 화면 위쪽이 보의 +y (윗면)
      const y = h / 2 - (j / (rows - 1)) * h;
      for (let i = 0; i < cols; i++) {
        const x = (i / (cols - 1)) * L;
        const v = valueAt(x, y) / sMax;
        // 단계로 끊어서 등고선 띠를 만든다
        const stepped = Math.round(v * BANDS) / BANDS;
        const [r, g, bl] = rainbow(stepped);
        const k = (j * W + i) * 4;
        img.data[k] = r;
        img.data[k + 1] = g;
        img.data[k + 2] = bl;
        img.data[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, [width, height, P, L, thetaDeg]);

  // 컬러바 눈금 (압축 → 0 → 인장)
  const barStops = Array.from({ length: 9 }, (_, i) => {
    const t = 1 - (i / 8) * 2; // +1 → -1
    const [r, g, b] = rainbow(t);
    return { offset: (i / 8) * 100, color: `rgb(${r},${g},${b})` };
  });

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', justifyContent: 'center' }}>
        <div style={{ flex: '1 1 auto', minWidth: 0, maxWidth: 560 }}>
          <div style={{ position: 'relative' }}>
            <canvas
              ref={canvasRef}
              width={560}
              height={120}
              style={{ width: '100%', height: 'auto', display: 'block', border: '1px solid var(--line)' }}
            />
          </div>
          {/* 지점 기호와 하중 — 캔버스 밖에 SVG로 얹어서 보 그림이 어떤 상황인지 알 수 있게 한다 */}
          <svg viewBox="0 0 560 54" style={{ width: '100%', height: 'auto', display: 'block', marginTop: -1 }}>
            <polygon points="14,0 4,18 24,18" fill="none" stroke="#51626F" strokeWidth="1.4" />
            <line x1="0" y1="20" x2="30" y2="20" stroke="#51626F" strokeWidth="1.2" />
            <polygon points="546,0 536,18 556,18" fill="none" stroke="#51626F" strokeWidth="1.4" />
            <circle cx="541" cy="21" r="2" fill="#51626F" />
            <circle cx="551" cy="21" r="2" fill="#51626F" />
            <line x1="14" y1="34" x2="546" y2="34" stroke="#8A97A2" strokeWidth="1" />
            <line x1="14" y1="30" x2="14" y2="38" stroke="#8A97A2" strokeWidth="1" />
            <line x1="546" y1="30" x2="546" y2="38" stroke="#8A97A2" strokeWidth="1" />
            <text x="280" y="50" fontSize="11" fill="#8A97A2" textAnchor="middle">경간 L (가운데에 하중 P)</text>
          </svg>
        </div>
        {/* 컬러바 */}
        <div style={{ flex: '0 0 62px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <svg viewBox="0 0 62 140" style={{ width: 62, height: 140 }}>
            <defs>
              <linearGradient id="contourBar" x1="0" y1="0" x2="0" y2="1">
                {barStops.map((s) => (
                  <stop key={s.offset} offset={`${s.offset}%`} stopColor={s.color} />
                ))}
              </linearGradient>
            </defs>
            <rect x="6" y="10" width="18" height="112" fill="url(#contourBar)" stroke="#8A97A2" strokeWidth="0.8" />
            <text x="28" y="16" fontSize="9.5" fill="#8A97A2">인장 +</text>
            <text x="28" y="69" fontSize="9.5" fill="#8A97A2">0</text>
            <text x="28" y="124" fontSize="9.5" fill="#8A97A2">압축 −</text>
          </svg>
        </div>
      </div>
    </div>
  );
}
