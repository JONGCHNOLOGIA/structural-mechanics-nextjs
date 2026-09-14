'use client';

import { useState } from 'react';
import Link from 'next/link';
import { chapters, CHAPTER_ICONS } from '@/lib/chapters';
import { useUser } from '@/components/UserProvider';
import LogoutButton from '@/components/LogoutButton';

// 챕터/소주제 선택 → "문제 생성하기" 프런트엔드 흐름만 구현한 화면.
// 실제 문제 생성(AI API 연동)은 아직 없고, 선택 결과를 반영한 미리보기 카드만 보여줌.
function subtopicKey(ch, st) {
  return `${ch.num}::${st.slug}`;
}

export default function ProblemGeneratorPage() {
  const { displayName, studentId } = useUser();
  const [selectedChapters, setSelectedChapters] = useState(new Set());
  const [selectedSubtopics, setSelectedSubtopics] = useState(new Set());
  const [numQuestions, setNumQuestions] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  function toggleChapter(ch) {
    const willSelect = !selectedChapters.has(ch.num);
    setSelectedChapters((prev) => {
      const next = new Set(prev);
      if (willSelect) next.add(ch.num);
      else next.delete(ch.num);
      return next;
    });
    setSelectedSubtopics((prev) => {
      const next = new Set(prev);
      ch.subtopics.forEach((st) => {
        const key = subtopicKey(ch, st);
        if (willSelect) next.add(key);
        else next.delete(key);
      });
      return next;
    });
    setGenerated(false);
  }

  function toggleSubtopic(ch, st) {
    const key = subtopicKey(ch, st);
    setSelectedSubtopics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setGenerated(false);
  }

  function handleGenerate() {
    if (selectedSubtopics.size === 0) return;
    setGenerating(true);
    setGenerated(false);
    setTimeout(() => {
      setGenerating(false);
      setGenerated(true);
    }, 600);
  }

  const activeChapters = chapters.filter((ch) => selectedChapters.has(ch.num));
  const selectedList = activeChapters.flatMap((ch) =>
    ch.subtopics.filter((st) => selectedSubtopics.has(subtopicKey(ch, st))).map((st) => ({ ch, st }))
  );

  return (
    <div>
      <div className="detail-header">
        <div className="subject-title">
          <Link href="/" className="back-link">
            ← 목록으로
          </Link>
          <span>구조역학 2 — 문제 생성</span>
        </div>
        <div className="header-right">
          <LogoutButton />
          <div className="user-tag">
            {studentId} {displayName}
          </div>
        </div>
      </div>

      <div className="board">
        <div>
          <div className="col-label">CHAPTERS</div>
          <div className="chapter-list">
            {chapters.map((ch) => {
              const active = selectedChapters.has(ch.num);
              const checkedCount = ch.subtopics.filter((st) => selectedSubtopics.has(subtopicKey(ch, st))).length;
              return (
                <div key={ch.num} className={'chapter' + (active ? ' active' : '')} onClick={() => toggleChapter(ch)}>
                  <div className="icon" dangerouslySetInnerHTML={{ __html: CHAPTER_ICONS[ch.num] || '' }} />
                  <div className="body">
                    <span className="num">
                      {ch.num}
                      <span className="tag">
                        {checkedCount}/{ch.subtopics.length} 선택
                      </span>
                    </span>
                    <div className="title">{ch.title}</div>
                    <div className="preview">{ch.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="col-label">SUB-TOPICS</div>
          <div className="subtopics">
            {activeChapters.length === 0 ? (
              <div className="empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <path d="M8 9h8M8 13h5" />
                </svg>
                왼쪽에서 챕터를 클릭하면
                <br />
                소주제를 고를 수 있습니다.
              </div>
            ) : (
              activeChapters.map((ch) => (
                <div key={ch.num} style={{ padding: '16px 22px', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--crimson)', marginBottom: 8 }}>
                    {ch.num} · {ch.title}
                  </div>
                  {ch.subtopics.map((st) => {
                    const key = subtopicKey(ch, st);
                    const checked = selectedSubtopics.has(key);
                    return (
                      <label
                        key={st.slug}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', cursor: 'pointer' }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSubtopic(ch, st)}
                          style={{ marginTop: 3, accentColor: 'var(--crimson)' }}
                        />
                        <span>
                          <span style={{ display: 'block', fontSize: 13.5, fontWeight: 700, color: 'var(--ink)' }}>{st.name}</span>
                          <span style={{ display: 'block', fontSize: 11.5, color: 'var(--gray-soft)', marginTop: 1 }}>{st.desc}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="panel" style={{ marginTop: 20, minHeight: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
              <div style={{ fontSize: 13, color: 'var(--gray)' }}>
                선택된 소주제 <b style={{ color: 'var(--crimson)' }}>{selectedSubtopics.size}개</b>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{ fontSize: 12, color: 'var(--gray-soft)', fontWeight: 700 }}>문제 개수</label>
                <select
                  className="unit-inline"
                  value={numQuestions}
                  onChange={(e) => {
                    setNumQuestions(Number(e.target.value));
                    setGenerated(false);
                  }}
                >
                  {[3, 5, 10].map((n) => (
                    <option key={n} value={n}>
                      {n}문제
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="add-block active"
                disabled={selectedSubtopics.size === 0 || generating}
                onClick={handleGenerate}
                style={{ margin: 0, opacity: selectedSubtopics.size === 0 ? 0.5 : 1 }}
              >
                {generating ? '생성 중...' : '문제 생성하기'}
              </button>
            </div>

            {generated && (
              <div style={{ marginTop: 20 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--gray-soft)',
                    background: 'var(--bg)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    marginBottom: 14,
                  }}
                >
                  ⚠️ AI 문제 생성 기능은 아직 연결되지 않았어요 — 지금은 화면 미리보기만 볼 수 있어요. (백엔드 연결 전)
                </div>
                <div className="steps">
                  {Array.from({ length: numQuestions }).map((_, i) => {
                    const src = selectedList[i % selectedList.length];
                    return (
                      <div className="step-card" key={i}>
                        <div className="step-header static">
                          문제 {i + 1} · {src.ch.num} {src.st.name}
                        </div>
                        <div className="step-body">
                          <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.6, marginBottom: 12 }}>
                            (문제 내용이 여기에 표시됩니다 — AI 연결 후 이 소주제에 맞는 실제 문제가 생성돼요.)
                          </div>
                          <button className="add-block" disabled style={{ opacity: 0.5, margin: 0 }}>
                            정답 확인
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
