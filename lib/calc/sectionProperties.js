// 단면 특성(Section Properties) 계산 — 모든 치수는 mm 단위로 받아서 mm 단위 결과를 그대로 돌려준다.
// (다른 계산기들과 달리 이 도구는 단면 자체만 독립적으로 다루므로 SI 변환 없이 mm 고정으로 단순화함)

function rectProps(b, h) {
  const A = b * h;
  const Ix = (b * h ** 3) / 12;
  const Iy = (h * b ** 3) / 12;
  return { A, Ix, Iy };
}

export function computeSection(shape, d) {
  switch (shape) {
    case 'rectangle': {
      const { A, Ix, Iy } = rectProps(d.b, d.h);
      return { A, Ix, Iy, cTop: d.h / 2, cBottom: d.h / 2, ybar: d.h / 2 };
    }
    case 'circle': {
      const A = (Math.PI * d.dia ** 2) / 4;
      const I = (Math.PI * d.dia ** 4) / 64;
      return { A, Ix: I, Iy: I, cTop: d.dia / 2, cBottom: d.dia / 2, ybar: d.dia / 2 };
    }
    case 'hollowCircle': {
      const A = (Math.PI * (d.diaOuter ** 2 - d.diaInner ** 2)) / 4;
      const I = (Math.PI * (d.diaOuter ** 4 - d.diaInner ** 4)) / 64;
      return { A, Ix: I, Iy: I, cTop: d.diaOuter / 2, cBottom: d.diaOuter / 2, ybar: d.diaOuter / 2 };
    }
    case 'hollowRect': {
      const outer = rectProps(d.B, d.H);
      const inner = rectProps(d.b, d.h);
      return {
        A: outer.A - inner.A,
        Ix: outer.Ix - inner.Ix,
        Iy: outer.Iy - inner.Iy,
        cTop: d.H / 2,
        cBottom: d.H / 2,
        ybar: d.H / 2,
      };
    }
    case 'iBeam': {
      // 대칭 I형 단면 (wide-flange): 전체 사각형에서 웨브 양옆의 빈 사각형(폭 bf-tw, 높이 h-2tf) 하나를 뺀 값
      const outer = rectProps(d.bf, d.h);
      const gap = rectProps(d.bf - d.tw, d.h - 2 * d.tf);
      const A = 2 * d.bf * d.tf + (d.h - 2 * d.tf) * d.tw;
      const Ix = outer.Ix - gap.Ix;
      const Iy = 2 * ((d.tf * d.bf ** 3) / 12) + ((d.h - 2 * d.tf) * d.tw ** 3) / 12;
      return { A, Ix, Iy, cTop: d.h / 2, cBottom: d.h / 2, ybar: d.h / 2 };
    }
    case 'tSection': {
      // 위쪽 플랜지(bf x tf) + 아래쪽 웨브(tw x (h-tf)), 바닥 기준 좌표계
      const flangeA = d.bf * d.tf;
      const flangeY = d.h - d.tf / 2;
      const webH = d.h - d.tf;
      const webA = d.tw * webH;
      const webY = webH / 2;
      const A = flangeA + webA;
      const ybar = (flangeA * flangeY + webA * webY) / A;
      const flangeI0 = (d.bf * d.tf ** 3) / 12;
      const webI0 = (d.tw * webH ** 3) / 12;
      const Ix = flangeI0 + flangeA * (flangeY - ybar) ** 2 + webI0 + webA * (webY - ybar) ** 2;
      const Iy = (d.tf * d.bf ** 3) / 12 + (webH * d.tw ** 3) / 12;
      return { A, Ix, Iy, cTop: d.h - ybar, cBottom: ybar, ybar };
    }
    default:
      return { A: 0, Ix: 0, Iy: 0, cTop: 0, cBottom: 0, ybar: 0 };
  }
}

// 실전에서 항상 '더 위험한(작은 단면계수)' 쪽 fiber를 쓰므로, 두 Sx 중 작은 값을 governing으로 함께 제공
export function sectionResults(shape, d) {
  const r = computeSection(shape, d);
  const SxTop = r.cTop > 0 ? r.Ix / r.cTop : 0;
  const SxBottom = r.cBottom > 0 ? r.Ix / r.cBottom : 0;
  const Sx = Math.min(SxTop, SxBottom);
  const rx = Math.sqrt(r.Ix / r.A);
  const ry = Math.sqrt(r.Iy / r.A);
  return { ...r, SxTop, SxBottom, Sx, rx, ry };
}
