'use client';

import { useState } from 'react';
import Link from 'next/link';

// 프로토타입 HTML의 chapters 배열 + renderChapters()/renderSubtopics()를 그대로 옮긴 것.
// slug만 추가해서 Next.js 라우트(app/subjects/.../<slug>/page.js)로 연결함.
const chapters = [
  {
    num: 'CH.6',
    title: 'Stress in beams',
    desc: '굽힘응력과 전단응력의 분포에 대해서 배우는 챕터',
    ready: true,
    base: '/subjects/structural-mechanics-2/ch6',
    subtopics: [
      { slug: 'composite-beams', name: 'Composite Beams', desc: '서로 다른 두 재료로 이루어진 단면의 중립축과 응력 분포를 계산합니다.' },
      { slug: 'transformed-section', name: 'Transformed Section Method', desc: '복합단면을 하나의 재료로 환산해 동일한 문제를 더 간단히 풉니다.' },
      { slug: 'fgm', name: 'Functionally Graded Beams', desc: '단면 내에서 재료 조성이 연속적으로 변하는 보의 개념을 다룹니다.' },
      { slug: 'inclined-loads', name: 'Beams with Inclined Loads', desc: '경사하중을 두 축의 모멘트로 분해해 단면 각 지점의 응력 부호를 판정합니다.' },
      { slug: 'elastoplastic-bending', name: 'Elastoplastic Bending', desc: '하중이 커짐에 따라 탄성에서 완전소성으로 변하는 단면의 응력분포 변화를 봅니다.' },
    ],
  },
  {
    num: 'CH.7',
    title: 'Analysis of stress and strain',
    desc: '응력과 변형률의 변환, 모어의 원을 다루는 챕터',
    ready: true,
    base: '/subjects/structural-mechanics-2/ch7',
    subtopics: [
      { slug: 'plane-stress', name: 'Plane Stress', desc: '평면응력 변환식으로 임의 각도의 응력을 구하고, 주응력과 최대전단응력까지 함께 다룹니다.' },
      { slug: 'mohrs-circle', name: "Mohr's Circle", desc: '평면응력 변환을 원 하나로 그래픽하게 표현하는 방법입니다.' },
      { slug: 'hookes-law', name: "Hooke's Law for Plane Stress", desc: '평면응력 상태에서 응력과 변형률 사이의 관계(후크의 법칙)를 다룹니다.' },
    ],
  },
  {
    num: 'CH.8',
    title: 'Application of plane stress',
    desc: '평면응력 상태의 응용을 다루는 챕터',
    ready: true,
    base: '/subjects/structural-mechanics-2/ch8',
    subtopics: [
      { slug: 'spherical-pressure-vessels', name: 'Spherical Pressure Vessels', desc: '구형 압력용기 벽면의 응력, 최대전단응력, 변형률을 다룹니다.' },
      { slug: 'cylindrical-pressure-vessels', name: 'Cylindrical Pressure Vessels', desc: '원통형 압력용기의 원주응력·축방향응력과, 용접선 각도에 따른 응력 변환을 다룹니다.' },
      { slug: 'max-beam-stress', name: 'Maximum Stresses in Beams', desc: '보의 단면 내 위치(y)에 따라 굽힘응력과 전단응력이 어떻게 조합되는지 다룹니다.' },
      { slug: 'combined-loadings', name: 'Combined Loadings', desc: '여러 하중이 겹칠 때, 각 성분을 합쳐 평면응력 해석으로 마무리하는 방법을 다룹니다.' },
    ],
  },
  { num: 'CH.9', title: 'Deflection of beams', desc: '보의 처짐을 계산하고 시각화하는 챕터 (준비중)', ready: false, base: '', subtopics: [] },
  { num: 'CH.10', title: 'Statically indeterminate beams', desc: '부정정보의 해석을 다루는 챕터 (준비중)', ready: false, base: '', subtopics: [] },
];

export default function HomePage() {
  const [activeChapter, setActiveChapter] = useState(null);
  const activeCh = activeChapter !== null ? chapters[activeChapter] : null;

  return (
    <main className="max-w-[1200px] mx-auto p-10">
      <h1 className="text-2xl font-extrabold mb-2">구조역학 2</h1>
      <p className="text-gray mb-8">세종대학교 건축공학과 AI 튜터 사이트 — 챕터를 선택해 소주제를 열어보세요.</p>

      <div className="grid grid-cols-[1fr_1fr] gap-8">
        {/* 챕터 목록 */}
        <div className="flex flex-col gap-3">
          {chapters.map((ch, idx) => (
            <div
              key={ch.num}
              onClick={() => ch.ready && setActiveChapter(idx)}
              className={
                'border rounded-2xl p-4 flex gap-3 items-start transition-colors ' +
                (ch.ready ? 'cursor-pointer bg-white ' : 'opacity-50 cursor-not-allowed bg-white ') +
                (activeChapter === idx ? 'border-crimson' : 'border-line')
              }
            >
              <div className="flex-1">
                <span className="text-[11px] font-extrabold text-crimson">
                  {ch.num}
                  {ch.ready ? (
                    <span className="ml-2 text-[10px] bg-crimsonSoft text-crimson rounded-full px-2 py-0.5">
                      {ch.subtopics.length}개 소주제
                    </span>
                  ) : (
                    <span className="ml-2 text-[10px] bg-line text-graySoft rounded-full px-2 py-0.5">준비중</span>
                  )}
                </span>
                <div className="font-extrabold mt-1">{ch.title}</div>
                <div className="text-sm text-graySoft mt-0.5">{ch.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 소주제 패널 */}
        <div className="flex flex-col gap-3">
          {!activeCh ? (
            <div className="border-2 border-dashed border-line rounded-2xl p-10 text-center text-graySoft text-sm">
              왼쪽에서 챕터를 선택하면 소주제 목록이 여기에 나타납니다.
            </div>
          ) : (
            activeCh.subtopics.map((st) => (
              <Link
                key={st.slug}
                href={`${activeCh.base}/${st.slug}`}
                className="border border-line rounded-2xl p-4 bg-white hover:border-crimson transition-colors block"
              >
                <div className="flex justify-between items-center">
                  <span className="font-extrabold">{st.name}</span>
                  <span className="text-crimson text-sm font-bold">열기 →</span>
                </div>
                <div className="text-sm text-graySoft mt-1">{st.desc}</div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
