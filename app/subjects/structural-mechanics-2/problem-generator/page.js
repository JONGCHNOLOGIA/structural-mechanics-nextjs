'use client';

import { useState } from 'react';
import Link from 'next/link';
import { chapters, CHAPTER_ICONS } from '@/lib/chapters';
import { PROBLEM_BANK, generateProblem } from '@/lib/problemBank';
import { useUser } from '@/components/UserProvider';
import LogoutButton from '@/components/LogoutButton';
import ProblemDiagram from '@/components/problemDiagrams/ProblemDiagram';

// 챕터/소주제를 고르면 lib/problemBank.js의 "문제 템플릿 + 랜덤 숫자"로 실제 문제를 생성한다.
// 지문/숫자는 교재를 그대로 베끼지 않고 새로 작성한 템플릿이고, 정답은 각 계산기와 동일한
// 검증된 공식(lib/calc/*.js)으로 계산한다. AI API는 아직 쓰지 않음.
// 참고자료(PDF)에 실제로 있던 유형만 지원하므로, PROBLEM_BANK에 없는 소주제(예: FGM, Plane Stress)는
// 아예 선택 목록에 나타나지 않는다.
function subtopicKey(ch, st) {
  return `${ch.num}::${st.slug}`;
}

const SUPPORTED_CHAPTERS = chapters
  .map((ch) => ({ ...ch, subtopics: ch.subtopics.filter((st) => PROBLEM_BANK[subtopicKey(ch, st)]) }))
  .filter((ch) => ch.subtopics.length > 0);

export default function ProblemGeneratorPage() {
  const { displayName, studentId } = useUser();
  const [selectedChapters, setSelectedChapters] = useState(new Set());
  const [selectedSubtopics, setSelectedSubtopics] = useState(new Set());
  const [numQuestions, setNumQuestions] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [problems, setProblems] = useState(null);
  const [revealed, setRevealed] = useState(new Set());
  const [solutionImages, setSolutionImages] = useState({});

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
    setProblems(null);
  }

  function toggleSubtopic(ch, st) {
    const key = subtopicKey(ch, st);
    setSelectedSubtopics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
    setProblems(null);
  }

  function handleGenerate() {
    if (selectedSubtopics.size === 0) return;
    setGenerating(true);
    setProblems(null);
    setTimeout(() => {
      const list = [];
      for (let i = 0; i < numQuestions; i++) {
        const src = selectedList[Math.floor(Math.random() * selectedList.length)];
        const result = generateProblem(src.ch.num, src.st.slug);
        if (result) list.push({ ch: src.ch, st: src.st, ...result });
      }
      setProblems(list);
      setRevealed(new Set());
      setGenerating(false);
    }, 400);
  }

  function toggleReveal(i) {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function handleUploadSolution(i, file) {
    const url = URL.createObjectURL(file);
    setSolutionImages((prev) => ({ ...prev, [i]: url }));
  }

  const activeChapters = SUPPORTED_CHAPTERS.filter((ch) => selectedChapters.has(ch.num));
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

      <div style={{ maxWidth: 1600, margin: '20px auto 0', padding: '0 40px' }}>
        <div style={{ fontSize: 12, color: 'var(--gray-soft)', lineHeight: 1.6 }}>
          참고 문제 자료에 실제로 있던 유형만 지원해요 — 일부 소주제(예: Functionally Graded Beams, Plane Stress)는 문제 생성에서 제외되어 있어요.
        </div>
      </div>

      <div className="board">
        <div>
          <div className="col-label">CHAPTERS</div>
          <div className="chapter-list">
            {SUPPORTED_CHAPTERS.map((ch) => {
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
                    setProblems(null);
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
          </div>
        </div>
      </div>

      {problems && (
        <div style={{ maxWidth: 1600, margin: '0 auto 40px', padding: '0 40px' }}>
          <div
            style={{
              fontSize: 11,
              color: 'var(--gray-soft)',
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 8,
              padding: '8px 12px',
              marginBottom: 14,
            }}
          >
            📐 선택한 소주제의 공식으로 매번 새로운 숫자를 뽑아 만든 문제예요. 정답은 계산기와 동일한 공식으로 계산돼요. (교재 문제를 그대로 가져오지 않고 새로 작성한 지문입니다)
          </div>
          <div className="steps">
            {problems.map((p, i) => (
              <div className="step-card" key={i}>
                <div className="step-header static">
                  문제 {i + 1} · {p.ch.num} {p.st.name}
                </div>
                <div className="step-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {/* 왼쪽: 문제 */}
                  <div>
                    <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.7, marginBottom: 12, whiteSpace: 'pre-line' }}>
                      {p.prompt}
                    </div>
                    {p.diagram && (
                      <div style={{ background: 'var(--bg)', borderRadius: 10, padding: '14px 10px', marginBottom: 12 }}>
                        <ProblemDiagram diagram={p.diagram} />
                      </div>
                    )}
                    <button className="add-block" onClick={() => toggleReveal(i)} style={{ margin: 0 }}>
                      {revealed.has(i) ? '정답 숨기기' : '정답 확인'}
                    </button>
                    {revealed.has(i) && (
                      <div
                        style={{
                          marginTop: 12,
                          fontSize: 13,
                          color: 'var(--teal)',
                          background: 'var(--teal-soft)',
                          borderRadius: 10,
                          padding: '10px 14px',
                          lineHeight: 1.8,
                        }}
                      >
                        {p.answers.map((a, k) => (
                          <div key={k}>{a}</div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 오른쪽: 내 풀이 첨부 */}
                  <div
                    style={{
                      border: '1.5px dashed var(--line)',
                      borderRadius: 12,
                      padding: 14,
                      minHeight: 220,
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gray)', marginBottom: 10 }}>내 풀이 (사진 첨부)</div>
                    {solutionImages[i] ? (
                      <>
                        <img
                          src={solutionImages[i]}
                          alt="첨부한 풀이"
                          style={{ width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 8, marginBottom: 10, background: 'var(--bg)' }}
                        />
                        <label className="add-block" style={{ textAlign: 'center', cursor: 'pointer', margin: 0 }}>
                          다시 첨부하기
                          <input
                            type="file"
                            accept="image/*"
                            style={{ display: 'none' }}
                            onChange={(e) => e.target.files[0] && handleUploadSolution(i, e.target.files[0])}
                          />
                        </label>
                      </>
                    ) : (
                      <label
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                          cursor: 'pointer',
                          color: 'var(--gray-soft)',
                          textAlign: 'center',
                        }}
                      >
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <rect x="3" y="5" width="18" height="15" rx="2" />
                          <circle cx="9" cy="11" r="2" />
                          <path d="M21 16l-5.5-5.5L3 20" />
                        </svg>
                        <span style={{ fontSize: 12.5 }}>
                          풀이를 촬영·캡처해서
                          <br />
                          올려주세요
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => e.target.files[0] && handleUploadSolution(i, e.target.files[0])}
                        />
                      </label>
                    )}
                    <button className="add-block" disabled style={{ marginTop: 10, opacity: 0.5, margin: '10px 0 0' }} title="준비중">
                      AI 튜터에게 검토 요청 (준비중)
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
