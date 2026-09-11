'use client';

import { useState } from 'react';
import Link from 'next/link';
import { chapters, CHAPTER_ICONS } from '@/lib/chapters';

// 프로토타입의 #home (header + hero + board) 마크업을 그대로 옮긴 것.
export default function HomePage() {
  const [activeChapter, setActiveChapter] = useState(null);
  const activeCh = activeChapter !== null ? chapters[activeChapter] : null;

  return (
    <div>
      <header>
        <div className="subject-title">구조역학 2</div>
        <div className="user-tag">22011011 김세종</div>
      </header>

      <div className="hero">
        <div className="hero-text">
          <h1>안녕하세요, 세종님 👋</h1>
          <p>구조역학 2의 각 챕터를 클릭해 소주제를 살펴보고, 인터랙티브 시각화와 AI 튜터로 개념을 확인해보세요.</p>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="n">⟳</div>
              <div className="l">실시간 계산</div>
            </div>
            <div className="hero-stat">
              <div className="n">▤</div>
              <div className="l">단면 시각화</div>
            </div>
            <div className="hero-stat">
              <div className="n">◎</div>
              <div className="l">AI 설명</div>
            </div>
          </div>
        </div>
        <div className="hero-art">
          <div className="cover-placeholder">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5V4.5Z" />
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            </svg>
            <span>
              표지 이미지
              <br />
              (cover.jpg)
            </span>
          </div>
          <div className="cover-info">
            <div className="book-title">
              재료역학
              <br />
              (Mechanics of Materials)
            </div>
            9th Edition
            <br />
            James M. Gere · Barry J. Goodno
            <br />
            Cengage Learning
          </div>
        </div>
      </div>

      <div className="board">
        <div>
          <div className="col-label">CHAPTERS</div>
          <div className="chapter-list">
            {chapters.map((ch, idx) => (
              <div
                key={ch.num}
                className={'chapter' + (ch.ready ? '' : ' disabled') + (activeChapter === idx ? ' active' : '')}
                onClick={() => ch.ready && setActiveChapter(idx)}
              >
                <div className="icon" dangerouslySetInnerHTML={{ __html: CHAPTER_ICONS[ch.num] || '' }} />
                <div className="body">
                  <span className="num">
                    {ch.num}
                    {ch.ready ? <span className="tag">{ch.subtopics.length}개 소주제</span> : <span className="tag">준비중</span>}
                  </span>
                  <div className="title">{ch.title}</div>
                  <div className="preview">{ch.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="col-label">SUB-TOPICS</div>
          <div className="subtopics">
            {!activeCh ? (
              <div className="empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <path d="M8 9h8M8 13h5" />
                </svg>
                왼쪽에서 챕터를 클릭하면
                <br />
                소주제 목록이 나타납니다.
              </div>
            ) : activeCh.subtopics.length === 0 ? (
              <div className="empty">이 챕터는 아직 소주제가 준비되지 않았습니다.</div>
            ) : (
              activeCh.subtopics.map((st) => (
                <Link key={st.slug} href={`${activeCh.base}/${st.slug}`} className="subtopic">
                  <div className="subtopic-row">
                    <span className="name">{st.name}</span>
                    <span className="go">열기 →</span>
                  </div>
                  <div className="subprev">{st.desc}</div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
