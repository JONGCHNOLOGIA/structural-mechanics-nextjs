'use client';

// Mohr 원 그림. 원래는 Mohr's Circle 전용 페이지 안에 있었는데, 그 페이지를 없애고
// Plane Stress 안으로 합치면서 그림만 따로 떼어냈다.
// (같은 입력으로 같은 원을 두 군데서 그리던 중복을 없앤 것)

export default function MohrCircleSVG({ sigmaX, sigmaY, tauXY, theta, r }) {
  const w = 480, h = 420, cx = 240, cy = 210;
  const scale = r.R > 0 ? 130 / r.R : 1;

  const px = cx + (r.sx1 - r.avg) * scale, py = cy + r.tx1y1 * scale;
  const qx = cx + (r.sy1 - r.avg) * scale, qy = cy - r.tx1y1 * scale;
  const ax = cx + (sigmaX - r.avg) * scale, ay = cy + tauXY * scale;
  const bx = cx + (sigmaY - r.avg) * scale, by = cy - tauXY * scale;
  const R_px = r.R * scale;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxWidth: 520, margin: '0 auto', display: 'block' }}>
      <line x1="20" y1={cy} x2={w - 20} y2={cy} stroke="#8A97A2" strokeWidth="1.2" />
      <line x1={cx} y1="20" x2={cx} y2={h - 60} stroke="#8A97A2" strokeWidth="1.2" />
      <text x={w - 16} y={cy - 6} fontSize="13" fill="#8A97A2" textAnchor="end" fontWeight="700">σ</text>
      <text x={cx + 8} y="26" fontSize="13" fill="#8A97A2" fontWeight="700">τ (아래 = +)</text>

      <circle cx={cx} cy={cy} r={R_px} fill="#F7E3E6" fillOpacity="0.35" stroke="#51626F" strokeWidth="1.4" />
      <circle cx={cx} cy={cy} r="2.5" fill="#51626F" />
      <text x={cx} y={cy - 8} fontSize="13" fill="#51626F" textAnchor="middle">C</text>

      <line x1={ax} y1={ay} x2={bx} y2={by} stroke="#8A97A2" strokeWidth="1.2" strokeDasharray="4 3" />
      <circle cx={ax} cy={ay} r="3" fill="#8A97A2" />
      <text x={ax + 6} y={ay - 6} fontSize="13" fill="#8A97A2">A(θ=0)</text>

      <line x1={px} y1={py} x2={qx} y2={qy} stroke="#C3002F" strokeWidth="1.8" />
      <circle cx={px} cy={py} r="4" fill="#C3002F" />
      <text x={px + 7} y={py + 4} fontSize="14" fill="#C3002F" fontWeight="800">x1면</text>
      <circle cx={qx} cy={qy} r="4" fill="#1E7F72" />
      <text x={qx + 7} y={qy + 4} fontSize="14" fill="#1E7F72" fontWeight="800">y1면</text>

      <circle cx={cx + R_px} cy={cy} r="3" fill="#B0790A" />
      <text x={cx + R_px} y={cy + 16} fontSize="13" fill="#B0790A" textAnchor="middle">σ1</text>
      <circle cx={cx - R_px} cy={cy} r="3" fill="#B0790A" />
      <text x={cx - R_px} y={cy + 16} fontSize="13" fill="#B0790A" textAnchor="middle">σ2</text>
      <circle cx={cx} cy={cy + R_px} r="3" fill="#4A5FBF" />
      <text x={cx + 8} y={cy + R_px + 3} fontSize="13" fill="#4A5FBF">τmax</text>
      <text x={cx} y={h - 30} fontSize="14" fill="#8A97A2" textAnchor="middle">2θ = {(2 * theta).toFixed(0)}° (θ={theta.toFixed(0)}°)</text>
    </svg>
  );
}
