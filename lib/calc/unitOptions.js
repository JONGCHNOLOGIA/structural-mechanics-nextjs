// 프로토타입(HTML 데모)의 UNIT_OPTIONS를 그대로 옮긴 것 — 값 하나 안 바뀜
export const UNIT_OPTIONS = {
  length: { in: 0.0254, mm: 0.001, m: 1 },
  E: { ksi: 6894757, psi: 6894.757, MPa: 1e6, GPa: 1e9 },
  stress: { psi: 6894.757, ksi: 6894757, MPa: 1e6, kPa: 1e3 },
  moment: { 'kip·in': 112.9848, 'lb·in': 0.1129848, 'kN·m': 1000, 'kN·mm': 1, 'N·m': 1 },
  force: { lb: 4.448222, kip: 4448.222, N: 1, kN: 1000 },
  distLoad: { 'kN/m': 1000, 'N/mm': 1000, 'lb/ft': 14.5939, 'kip/ft': 14593.9 },
  inertia: { 'mm⁴': 1e-12, 'in⁴': 4.16231425e-7, 'm⁴': 1, 'cm⁴': 1e-8 },
};

export const CB_SLIDER_RANGE = {
  length: { in: [0.1, 48, 0.05], mm: [1, 1200, 1], m: [0.01, 4, 0.01] },
  E: { ksi: [10, 30000, 10], psi: [10, 5000000, 100], MPa: [10, 300000, 50], GPa: [0.1, 400, 0.5] },
  moment: {
    'kip·in': [0, 200, 1],
    'lb·in': [0, 200000, 100],
    'kN·m': [0, 25, 0.1],
    'kN·mm': [0, 25000, 50],
    'N·m': [0, 25000, 50],
  },
  distLoad: {
    'kN/m': [0, 20, 0.1],
    'N/mm': [0, 20, 0.1],
    'lb/ft': [0, 1500, 5],
    'kip/ft': [0, 1.5, 0.01],
  },
  span: {
    in: [1, 400, 1],
    mm: [10, 10000, 10],
    m: [0.05, 10, 0.05],
  },
};

export function cbSliderRangeFor(type, unit) {
  return (CB_SLIDER_RANGE[type] && CB_SLIDER_RANGE[type][unit]) || [0, 100, 1];
}

// 결과 표시용 소수점 자리수 — 설정 버튼(SettingsProvider)에서 로그인 계정의 저장값이나
// localStorage 값으로 덮어씀. fmt()는 이 모듈 변수를 매 호출마다 읽기 때문에, 설정이 바뀌어
// 화면 전체가 다시 렌더링되기만 하면 (각 계산기 컴포넌트를 손댈 필요 없이) 자동으로 반영됨.
export let DECIMALS = 3;
export function setGlobalDecimals(n) {
  DECIMALS = n;
}

// 숫자 포맷 (세 자릿수마다 콤마) — 화면에 표시만 할 때 사용
export function fmt(v) {
  if (!isFinite(v)) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: DECIMALS, maximumFractionDigits: DECIMALS });
}

// <input type="number">의 defaultValue용 — 콤마가 들어가면 브라우저가 값을 통째로 무시해버려서
// (예: "1,500"은 number input에서 invalid) 콤마 없이 같은 자릿수 규칙으로 포맷함
export function fmtInput(v) {
  if (!isFinite(v)) return '';
  const a = Math.abs(v);
  const decimals = a >= 1000 ? 0 : a >= 10 ? 1 : 2;
  return v.toFixed(decimals);
}

const SUPERSCRIPTS = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
function toSup(str) {
  return String(str)
    .split('')
    .map((ch) => SUPERSCRIPTS[ch] || ch)
    .join('');
}

// 공학적 표기법 (지수를 3의 배수로): 예) 9.10 × 10⁶
export function fmtSci(v, sig = 3) {
  if (!isFinite(v) || v === 0) return '0';
  const sign = v < 0 ? '-' : '';
  const absV = Math.abs(v);
  let exp = Math.floor(Math.log10(absV));
  exp = Math.floor(exp / 3) * 3;
  const mantissa = absV / Math.pow(10, exp);
  return `${sign}${mantissa.toFixed(sig)} × 10${toSup(String(exp))}`;
}

// 블록(재료) 색상 팔레트 — colorId로 고정 매핑, 순서 바뀌어도 색은 유지됨
export const BLOCK_COLORS = [
  { name: 'Red', fill: '#F7E3E6', stroke: '#C3002F' },
  { name: 'Green', fill: '#E3F3E7', stroke: '#1F8A4C' },
  { name: 'Amber', fill: '#FBEED9', stroke: '#B0790A' },
  { name: 'Blue', fill: '#E7E9F7', stroke: '#4A5FBF' },
  { name: 'Purple', fill: '#F0E6F5', stroke: '#7A3E8C' },
];

export function blockColor(block) {
  return BLOCK_COLORS[block.colorId % BLOCK_COLORS.length];
}

export function EFor(block) {
  return UNIT_OPTIONS.E[block.EUnit];
}
