// 프로토타입의 fgmVolFracA() / fgmMixColor()를 그대로 옮긴 것.
// zeta: 0=하단(B-rich) ~ 1=상단(A-rich)

export function volFracA(zeta, n) {
  return Math.pow(Math.max(0, Math.min(1, zeta)), n);
}

export function mixColor(hexB, hexA, t) {
  const pa = parseInt(hexA.slice(1), 16);
  const pb = parseInt(hexB.slice(1), 16);
  const ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
  const br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
  const r = Math.round(br + (ar - br) * t);
  const g = Math.round(bg + (ag - bg) * t);
  const b = Math.round(bb + (ab - bb) * t);
  return `rgb(${r},${g},${b})`;
}

// 시드 고정 난수로 점 위치를 만들어 재렌더링해도 위치가 안 바뀌게 함
export function makeDots(count = 180, seedStart = 42) {
  const dots = [];
  let seed = seedStart;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = 0; i < count; i++) dots.push({ x: rand(), y: rand() });
  return dots;
}
