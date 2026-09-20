'use client';

import { useMemo, useState } from 'react';
import { fmt, fmtSci } from '@/lib/calc/unitOptions';
import FormulaSection, { Tip } from './FormulaSection';
import AiTutorPanel from './AiTutorPanel';
import EditableText from '@/components/EditableText';
import Frac from '@/components/Frac';
import BeamWorkbench, { NumField, sup, udl, pointLoad } from './BeamWorkbench';

// 단면(I)이 구간마다 달라지는 보. 예전에는 "캔틸레버 + 자유단 집중하중, 전환점 하나" 한 가지만
// 다룰 수 있었는데, 지금은 다른 소분류와 같은 보 빌더 위에서 구간을 원하는 만큼 쌓는다.
//
// 구간마다 재료(E)와 단면(b × h)을 따로 정하면 EI(x)가 구간별로 바뀌고,
// 그 EI를 그대로 풀이에 넘기기 때문에 M/EI 다이어그램이 전환점에서 꺾이는 게 바로 보인다.
// 보 그림 자체도 구간별 높이 비율로 두껍게/얇게 그려서, 어디서 단면이 바뀌는지 눈에 띈다.

let segId = 1;
const newSeg = (fracEnd, b, h, E) => ({ id: `seg-${segId++}`, fracEnd, b, h, E });

export default function NonprismaticBeams() {
  // 구간은 "보 길이에 대한 비율"로 끝 위치를 갖는다 — L을 바꿔도 구성이 그대로 따라온다.
  const [segs, setSegs] = useState([
    newSeg(0.5, 0.15, 0.2, 200e9),
    newSeg(1, 0.15, 0.3, 200e9),
  ]);

  const segEI = (s) => s.E * ((s.b * Math.pow(s.h, 3)) / 12);

  // 구간 끝 비율을 실제 좌표로 펴서, 겹치거나 순서가 뒤집히지 않게 정리한다.
  const spans = (L) => {
    let start = 0;
    return segs.map((s, i) => {
      const end = i === segs.length - 1 ? L : Math.min(L, Math.max(start + L * 0.02, s.fracEnd * L));
      const out = { ...s, xStart: start, xEnd: end, EI: segEI(s), I: (s.b * Math.pow(s.h, 3)) / 12 };
      start = end;
      return out;
    });
  };

  return (
    <>
      <BeamWorkbench
        contentPrefix="calc.NonprismaticBeams"
        intro="단면이 한 값이 아니라(**Nonprismatic**) 구간마다 달라지는 보예요. 구간을 원하는 만큼 쌓고 각 구간의 재료(E)와 단면(b × h)을 정하면, M/EI 다이어그램이 전환점에서 **뚝 꺾이는** 걸 볼 수 있어요. 보 그림의 두께도 구간별 단면 높이를 따라갑니다."
        initial={() => ({ L: 4, supports: [sup('fixed', 0)], loads: [pointLoad(4, 20 * 1000)] })}
        presets={[
          {
            label: '캔틸레버 · 자유단 P',
            hint: '고정단 쪽을 두껍게 하면 처짐이 얼마나 줄까요',
            build: () => ({ L: 4, supports: [sup('fixed', 0)], loads: [pointLoad(4, 20 * 1000)] }),
          },
          {
            label: '단순보 · 등분포 q',
            hint: '중앙을 두껍게 한 보',
            build: () => ({ L: 6, supports: [sup('pin', 0), sup('roller', 6)], loads: [udl(0, 6, 12 * 1000)] }),
          },
        ]}
        diagrams={['MoverEI']}
        eiSpec={({ L }) => spans(L).map((s) => ({ xStart: s.xStart, xEnd: s.xEnd, EI: s.EI }))}
        profile={({ L }) => {
          const list = spans(L);
          const hMax = Math.max(...list.map((s) => s.h));
          return list.map((s) => ({ xStart: s.xStart, xEnd: s.xEnd, scale: s.h / hMax }));
        }}
        extraSettings={(ctx) => (
          <SegmentEditor segs={segs} setSegs={setSegs} spans={spans(ctx.L)} ctx={ctx} />
        )}
      >
        {(ctx) => <Explain ctx={ctx} spans={spans(ctx.L)} />}
      </BeamWorkbench>

      <AiTutorPanel />
    </>
  );
}

function SegmentEditor({ segs, setSegs, spans, ctx }) {
  const { units, lenF, EF, inertiaF } = ctx;
  const update = (id, patch) => setSegs((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  function addSeg() {
    // 마지막 구간을 반으로 잘라 새 구간을 끼워넣는다 — 항상 빈 자리가 생긴다.
    setSegs((prev) => {
      const last = prev[prev.length - 1];
      const prevEnd = prev.length > 1 ? prev[prev.length - 2].fracEnd : 0;
      const mid = (prevEnd + 1) / 2;
      const head = prev.slice(0, -1);
      return [...head, { ...last, fracEnd: mid }, newSeg(1, last.b, last.h * 1.2, last.E)];
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray-soft)' }}>단면 구간 (왼쪽부터)</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="add-block" style={{ margin: 0, padding: '3px 10px', fontSize: 12 }} onClick={addSeg}>
            + 구간 쌓기
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {spans.map((s, i) => (
          <div key={s.id} style={{ border: '1.4px solid var(--line)', padding: '8px 10px', position: 'relative' }}>
            {segs.length > 1 && (
              <div
                onClick={() => setSegs((prev) => prev.filter((x) => x.id !== s.id))}
                style={{ position: 'absolute', top: 6, right: 8, fontSize: 13, color: 'var(--gray-soft)', cursor: 'pointer', fontWeight: 800 }}
                title="이 구간 지우기"
              >
                ×
              </div>
            )}
            <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>
              <span className="color-dot" style={{ background: '#1E7F72' }} />
              구간 {i + 1} · x = {fmt(s.xStart / lenF)} ~ {fmt(s.xEnd / lenF)} {units.length}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {i < spans.length - 1 && (
                <NumField
                  label={`끝 위치 (${units.length})`}
                  value={s.xEnd / lenF}
                  onCommit={(v) => update(s.id, { fracEnd: Math.min(1, Math.max(0.02, (v * lenF) / ctx.L)) })}
                />
              )}
              <NumField label="b (m)" value={s.b} onCommit={(v) => update(s.id, { b: Math.max(0.001, v) })} />
              <NumField label="h (m)" value={s.h} onCommit={(v) => update(s.id, { h: Math.max(0.001, v) })} />
              <NumField label={`E (${units.E})`} value={s.E / EF} onCommit={(v) => update(s.id, { E: Math.max(1, v * EF) })} />
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--gray-soft)', marginTop: 4 }}>
              I = bh³/12 = {fmt(s.I / inertiaF)} {units.inertia} · EI = {fmtSci(s.EI)} N·m²
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: 'var(--gray-soft)', marginTop: 6, lineHeight: 1.6 }}>
        ※ 위 &quot;보 조건&quot;의 E·I는 여기서 구간별로 준 값이 대신합니다.
      </div>
    </div>
  );
}

function Explain({ ctx, spans }) {
  const { solved, L, units, lenF } = ctx;

  // 각 구간이 처짐에 얼마나 기여했는지 — ∫(M/EI)(L−x)dx를 구간별로 쪼개 본다.
  const parts = useMemo(() => {
    if (!solved) return [];
    return spans.map((s) => {
      // EI는 이 구간의 값을 쓴다. 전환점에 딱 걸린 절점은 어느 쪽 EI를 갖는지 애매해서,
      // 그 절점의 EI를 그대로 쓰면 이웃 구간 몫까지 섞여 들어간다.
      let theta = 0;
      for (let i = 0; i < solved.pts.length - 1; i++) {
        const p0 = solved.pts[i], p1 = solved.pts[i + 1];
        const lo = Math.max(p0.x, s.xStart), hi = Math.min(p1.x, s.xEnd);
        if (hi <= lo) continue;
        const span = p1.x - p0.x || 1;
        const mAt = (x) => p0.M + ((p1.M - p0.M) * (x - p0.x)) / span;
        theta += ((mAt(lo) + mAt(hi)) / 2 / s.EI) * (hi - lo);
      }
      return { seg: s, theta };
    });
  }, [solved, spans]);

  if (!solved) return null;

  const totalTheta = parts.reduce((a, p) => a + p.theta, 0);

  return (
    <div className="steps">
      <FormulaSection
        title={<EditableText as="span" contentKey="nonprismatic.title" defaultText="구간별로 나눠서 적분하기" />}
      >
        <div className="step-formula">
          <Tip title="굽힘모멘트는 단면과 상관없이 평형으로 정해진다">M(x)</Tip>는 단면과 무관하지만,{' '}
          <Frac num="M" den="EI" />는 구간마다 EI가 달라서 <b>전환점에서 뚝 끊깁니다</b>
        </div>
        <EditableText
          as="div"
          className="step-row"
          contentKey="nonprismatic.note"
          defaultText="그래서 처짐각·처짐을 구할 때 한 번에 적분할 수 없고, 구간을 나눠 각각 적분한 뒤 더해야 해요. 굵은 구간은 EI가 커서 M/EI가 낮아지고, 그만큼 처짐에 덜 기여합니다."
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
          {parts.map((p, i) => (
            <div key={p.seg.id} className="step-row" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
              <span>
                구간 {i + 1} ({fmt(p.seg.xStart / lenF)}~{fmt(p.seg.xEnd / lenF)} {units.length}) · EI = {fmtSci(p.seg.EI)} N·m²
              </span>
              <b>
                ∫M/EI dx = {fmtSci(p.theta)} rad
                {Math.abs(totalTheta) > 1e-18 && ` (${((p.theta / totalTheta) * 100).toFixed(1)} %)`}
              </b>
            </div>
          ))}
          <div className="step-final" style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
            <span>전체 합</span>
            <b>{fmtSci(totalTheta)} rad</b>
          </div>
        </div>
        <div className="step-row" style={{ marginTop: 6 }}>
          최대 처짐 = {fmt(Math.max(...solved.pts.map((p) => Math.abs(p.v))) * 1000)} mm
          {spans.length > 1 && (
            <>
              {' '}· 가장 굵은 구간과 가장 얇은 구간의 EI 비 ={' '}
              <b>{fmt(Math.max(...spans.map((s) => s.EI)) / Math.min(...spans.map((s) => s.EI)))} 배</b>
            </>
          )}
        </div>
      </FormulaSection>

      <EditableText
        as="div"
        className="ai-hint"
        contentKey="calc.NonprismaticBeams.aiHint"
        defaultText="💬 왜 단면이 큰 쪽에서 처짐 기여도가 작아지는지 궁금하다면, 오른쪽 AI 튜터에게 물어보세요."
      />
    </div>
  );
}
