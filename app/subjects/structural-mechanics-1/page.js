'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { chapters1, CHAPTER_ICONS_1 } from '@/lib/chapters1';
import EditableImages from '@/components/EditableImages';
import FloatingActions from '@/components/FloatingActions';
import SiteHeader from '@/components/SiteHeader';

// 구조역학 1 로비 — 구조역학 2의 로비(app/page.js)와 같은 CHAPTERS / SECTIONS 2단 구성.
// 구조역학 2 로비에 있는 "이어서 학습하기 / 학습 현황"은 진도 기록이 구조역학 2 기준으로 쌓여 있어서
// 여기서는 넣지 않고, 챕터·소주제 목록만 둔다.
export default function StructuralMechanics1Page() {
  const [previewChapter, setPreviewChapter] = useState(0);
  const activeCh = chapters1[previewChapter];
  const router = useRouter();

  return (
    <div style={{ background: 'var(--card)', minHeight: '100vh' }}>
      <SiteHeader active="sm1" />

      <div className="board">
        <div>
          <div className="col-label">Chapters</div>
          <div className="chapter-list">
            {chapters1.map((ch, idx) => (
              <div
                key={ch.num}
                className={'chapter' + (ch.ready ? '' : ' disabled') + (previewChapter === idx ? ' active' : '')}
                onMouseEnter={() => ch.ready && setPreviewChapter(idx)}
              >
                <div className="icon" dangerouslySetInnerHTML={{ __html: CHAPTER_ICONS_1[ch.num] || '' }} />
                <div className="body">
                  <span className="num">
                    {ch.num}
                    {ch.ready ? <span className="tag">{ch.subtopics.length}개 소주제</span> : <span className="tag">준비중</span>}
                  </span>
                  <div className="title">{ch.title}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="col-label">Sections</div>
          <div className="subtopics">
            <div className="subtopics-group-label">
              <span className="ch-badge">{activeCh.num}</span> {activeCh.title}
            </div>
            {activeCh.subtopics.map((st) => (
              <div
                key={st.slug}
                className="subtopic"
                onClick={() => router.push(`${activeCh.base}/${st.slug}`)}
                style={{ cursor: 'pointer' }}
              >
                <div className="subtopic-row">
                  <span className="name">{st.name}</span>
                  <span className="go">열기 →</span>
                </div>
                <EditableImages contentKeyBase={`subtopic.${activeCh.num}.${st.slug}.image`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <FloatingActions />
    </div>
  );
}
