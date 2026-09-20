// CH.10 부정정보 — 여분력(redundant)을 골라서 푸는 과정을 그대로 재현한다.
//
// 참고자료 mmch10.pdf의 흐름을 따른다:
//   1. 여분력 하나를 고른다 (Fig.10-1의 (b) RB, (c) MA)
//   2. 그 구속을 풀어준 released structure를 만든다 — 이건 정정보다
//   3. released structure가 실제 하중만으로 얼마나 움직이는지 본다 (δB 또는 θA)
//   4. 그 자리에 단위하중 1만 줬을 때 얼마나 움직이는지 본다 (δbb 또는 θaa)
//   5. 적합조건: 실제 구조에서는 그 자리가 안 움직여야 하므로 δB + R·δbb = 0 → R = −δB/δbb
//
// 3·4의 값은 두 가지로 구한다: released structure를 직접 풀어서 읽은 값과,
// 교재처럼 가상일 적분 ∫M·δM/EI dx, ∫(δM)²/EI dx 로 구한 값. 둘이 같아야 한다.

import { solveBeamFull } from './beamBuilder';
import { virtualWork } from './beamEnergy';

const LETTERS = 'ABCDEFGH';
const letterFor = (i) => LETTERS[i] || `S${i + 1}`;

// 고를 수 있는 여분력 목록. 부정정 차수만큼 골라야 완전히 풀리지만,
// 화면에서는 한 번에 하나씩 고르며 과정을 보여준다.
export function redundantOptions(supports) {
  const out = [];
  supports.forEach((s, i) => {
    const L = letterFor(i);
    // 연직반력을 여분력으로 고르는 건 힌지·롤러에서만 제시한다. 고정단을 통째로 떼어내면
    // 회전구속까지 같이 풀려서 구속이 하나가 아니라 둘 빠지고, 남은 구조가 불안정해진다
    // (교재 Fig.10-1도 (b)는 B의 롤러, (c)는 A의 회전구속만 푼다).
    if (supports.length > 1 && s.type !== 'fixed') {
      out.push({
        key: `Fy-${s.id}`,
        supIdx: i,
        kind: 'force',
        symbol: `R${L}`,
        label: `${L}의 연직반력 R${L}`,
        releasedName: `${L} 지지단을 떼어낸 구조`,
      });
    }
    if (s.type === 'fixed') {
      out.push({
        key: `M-${s.id}`,
        supIdx: i,
        kind: 'moment',
        symbol: `M${L}`,
        label: `${L}의 반력모멘트 M${L}`,
        releasedName: `${L}의 회전구속만 풀어 힌지로 바꾼 구조`,
      });
    }
  });
  return out;
}

// 고른 여분력을 풀어준 구조
function releaseSupports(supports, opt) {
  if (opt.kind === 'force') return supports.filter((_, i) => i !== opt.supIdx);
  return supports.map((s, i) => (i === opt.supIdx ? { ...s, type: 'pin' } : s));
}

// 여분력의 "양의 방향"으로 크기 1인 하중.
//   force  — 반력 Fy는 위가 +라서, 아래가 + 인 집중하중으로는 P = −1
//   moment — 고정단 반력모멘트는 M(x)에 +1로 들어가는데, 적용 모멘트는 −M0으로 들어가므로 M0 = −1
function unitLoadFor(supports, opt) {
  const s = supports[opt.supIdx];
  return opt.kind === 'force'
    ? { id: 'redundant-unit', kind: 'point', x: s.x, P: -1 }
    : { id: 'redundant-unit', kind: 'moment', x: s.x, M0: -1 };
}

export function analyzeRedundant(L, supports, loads, ei, opt, N = 600) {
  const relSupports = releaseSupports(supports, opt);
  const x0 = supports[opt.supIdx].x;
  const unitLoad = unitLoadFor(supports, opt);

  const released = solveBeamFull(L, relSupports, loads, ei, N);
  const unitCase = solveBeamFull(L, relSupports, [unitLoad], ei, N);
  if (released.determinacy === 'unstable' || unitCase.determinacy === 'unstable') {
    return { ok: false, reason: 'released-unstable', relSupports };
  }

  const at = (pts) => {
    const i = Math.min(pts.length - 1, Math.max(0, Math.round((x0 / L) * (pts.length - 1))));
    return pts[i];
  };
  // 여분력의 양의 방향으로 잰 변위. 아래에서 구할 가상일 적분(∫M·δM/EI)과 같은 방향을 재야
  // 두 방법의 값이 부호까지 맞는다 — 연직반력은 위가 +(= −v), 반력모멘트는 slope 그대로다.
  const proj = (p) => (opt.kind === 'force' ? -p.v : p.slope);
  const dofLoad = proj(at(released.pts));
  const dofUnit = proj(at(unitCase.pts));

  // 교재식 가상일 적분 — 위의 값과 같은 것을 다른 길로 구한 것
  const vwLoad = virtualWork(released, unitCase);
  const vwUnit = virtualWork(unitCase, unitCase);

  const value = Math.abs(dofUnit) > 1e-30 ? -dofLoad / dofUnit : NaN;

  // 검산용 — 원래(부정정) 보를 통째로 푼 결과에서 같은 반력을 읽는다
  const full = solveBeamFull(L, supports, loads, ei, N);
  const fullValue =
    full.supports && full.supports[opt.supIdx]
      ? opt.kind === 'force'
        ? full.supports[opt.supIdx].reactionFy
        : full.supports[opt.supIdx].reactionM
      : NaN;

  return {
    ok: true,
    opt,
    relSupports,
    released,
    unitCase,
    x0,
    dofLoad,
    dofUnit,
    vwLoad,
    vwUnit,
    value,
    full,
    fullValue,
    matches: Math.abs(fullValue) > 1e-12 ? Math.abs(value - fullValue) / Math.abs(fullValue) < 5e-3 : Math.abs(value) < 1e-9,
  };
}
