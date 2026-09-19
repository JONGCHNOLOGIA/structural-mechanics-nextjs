// 구조역학 1(CH.1~CH.5) 계산기들이 쓰는 단위 테이블 — 원본 프로토타입("구조역학1 (13).html")의
// LENGTH_UNITS/FORCE_UNITS/... 를 값 하나 안 바꾸고 그대로 옮긴 것.
// 구조역학 2의 lib/calc/unitOptions.js와 따로 두는 이유: 그쪽은 단위 종류가 더 좁고
// (예: 길이 in/mm/m만) 슬라이더 범위 테이블과 묶여 있어서, 섞으면 양쪽 다 깨지기 쉬움.
import { DECIMALS } from './unitOptions';

export const LENGTH_UNITS = { mm: 0.001, cm: 0.01, m: 1, in: 0.0254, ft: 0.3048 };
export const FORCE_UNITS = { N: 1, kN: 1000, lb: 4.4482216153, kip: 4448.2216153 };
export const STRESS_UNITS = { Pa: 1, kPa: 1e3, MPa: 1e6, GPa: 1e9, psi: 6894.757, ksi: 6894757 };
export const AREA_UNITS = { mm2: 1e-6, cm2: 1e-4, m2: 1, in2: 0.00064516 };
export const TORQUE_UNITS = {
  'N·m': 1,
  'N·mm': 0.001,
  'kN·m': 1000,
  'lb·in': 0.112984829,
  'lb·ft': 1.3558179483,
  'kip·in': 112.984829,
  'kip·ft': 1355.8179483,
};
// 분포하중 강도(CH.4) — "길이 1m당 몇 N" 기준
export const QINTENSITY_UNITS = { 'N/m': 1, 'kN/m': 1000, 'N/mm': 1000, 'lb/ft': 14.5939029 };
// 단면1차모멘트 Q(부피 차원)와 단면2차모멘트 I(길이⁴) — CH.5-4 전단흐름에서 직접 입력받는다.
export const VOLUME3_UNITS = { mm3: 1e-9, cm3: 1e-6, m3: 1, in3: 1.6387064e-5 };
export const IN4_UNITS = { mm4: 1e-12, cm4: 1e-8, m4: 1, in4: 4.16231426e-7 };

export function toBase(v, u, map) {
  return v * map[u];
}
export function fromBase(v, u, map) {
  return v / map[u];
}

// 원본의 fmt()는 값 크기에 따라 소수점 자리수를 자동으로 정했고, 지금 사이트에는 설정 버튼으로
// 바꾸는 전역 소수점 자리수(DECIMALS)가 따로 있다. 둘 다 살리기 위해, 자리수를 명시하면 그 값을
// 그대로 쓰고(원본이 특정 자리수를 의도한 곳), 생략하면 전역 설정값을 따르게 했다.
// unitOptions.js의 fmt()와 같은 규칙 — 딱 떨어지는 값이면 소수점을 붙이지 않는다.
export function fmt1(v, decimals) {
  if (v === null || v === undefined || !isFinite(v)) return '—';
  const d = decimals === undefined ? DECIMALS : decimals;
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: d });
}

// 입력 치수를 그림 크기에 반영할 때 쓰는 스케일 — 면적 지각에 맞춰 sqrt로 키우고 범위를 자른다.
export function scaledPx(value, maxValue, minPx, maxPx) {
  const v = Math.max(0, value || 0);
  return minPx + (maxPx - minPx) * Math.sqrt(Math.min(1, v / maxValue));
}

// 원형 단면의 극관성모멘트 (비틀림 CH.3에서 공용)
export function IpSolid(dM) {
  return (Math.PI / 32) * Math.pow(dM, 4);
}
export function IpHollow(dOuterM, dInnerM) {
  return (Math.PI / 32) * (Math.pow(dOuterM, 4) - Math.pow(dInnerM, 4));
}

// 굽힘 축에 대한 단면2차모멘트 (CH.5에서 공용) — 극관성모멘트 Ip와 달리 중립축 하나에 대한 값이다.
export function Irect(bM, hM) {
  return (bM * Math.pow(hM, 3)) / 12;
}
export function Icircle(dM) {
  return (Math.PI * Math.pow(dM, 4)) / 64;
}
