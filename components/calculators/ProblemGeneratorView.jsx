'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import FloatingActions from '@/components/FloatingActions';
import ProblemDiagram from '@/components/problemDiagrams/ProblemDiagram';
import EditableText from '@/components/EditableText';
import { useProgress } from '@/components/ProgressProvider';
import { recordAttempt } from '@/lib/progress';
import { fileToResizedBase64 } from '@/lib/resizeImage';
import { savePgSession, loadPgSession } from '@/lib/pgSession';

// 챕터/소주제를 고르면 문제은행(lib/problemBank*.js)의 "문제 템플릿 + 랜덤 숫자"로 실제 문제를
// 생성한다. 지문/숫자는 교재를 그대로 베끼지 않고 새로 작성한 템플릿이고, 정답은 각 계산기와 동일한
// 검증된 공식(lib/calc/*.js)으로 계산한다. 손풀이 사진 채점만 /api/grade-solution을 거쳐 Gemini
// Vision을 씀 — 문제 자체를 AI가 새로 만들지는 않는다(정확한 숫자 계산은 여전히 코드가 담당).
// 문제은행에 없는 소주제는 아예 선택 목록에 나타나지 않는다.
//
// 구조역학 1·2가 같은 화면을 쓰되 문제은행과 챕터 목록만 다르므로, 과목별로 다른 것만 props로 받는다.
function subtopicKey(ch, st) {
  return `${ch.num}::${st.slug}`;
}

export default function ProblemGeneratorView(props) {
  return (
    <Suspense fallback={null}>
      <ProblemGeneratorContent {...props} />
    </Suspense>
  );
}

function ProblemGeneratorContent({ chapters, chapterIcons, problemBank, generateProblem, subject, homeHref, introDefault }) {
  const searchParams = useSearchParams();
  const { refresh } = useProgress();

  const SUPPORTED_CHAPTERS = useMemo(
    () =>
      chapters
        .map((ch) => ({ ...ch, subtopics: ch.subtopics.filter((st) => problemBank[subtopicKey(ch, st)]) }))
        .filter((ch) => ch.subtopics.length > 0),
    [chapters, problemBank]
  );
  const [selectedChapters, setSelectedChapters] = useState(new Set());
  const [selectedSubtopics, setSelectedSubtopics] = useState(new Set());
  const [numQuestions, setNumQuestions] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [problems, setProblems] = useState(null);
  const [revealed, setRevealed] = useState(new Set());
  const [solutionImages, setSolutionImages] = useState({});
  const [solutionFiles, setSolutionFiles] = useState({});
  const [graded, setGraded] = useState({}); // { [problemIndex]: 'correct' | 'wrong' }
  const [aiReview, setAiReview] = useState({}); // { [problemIndex]: { loading, feedback, error } }

  // 문제 제작 허브의 "이어서 풀기"에서 ?resume=1 로 들어오면, 정답 확인을 안 한 문제가 남아있던
  // 마지막 생성 결과를 그대로 복원한다 — 고른 챕터/소주제부터 이미 채점한 것까지.
  useEffect(() => {
    if (searchParams.get('resume') !== '1') return;
    const session = loadPgSession(subject);
    if (!session || !Array.isArray(session.problems) || session.problems.length === 0) return;
    setSelectedChapters(new Set(session.selectedChapters));
    setSelectedSubtopics(new Set(session.selectedSubtopics));
    setNumQuestions(session.numQuestions || 5);
    setProblems(session.problems);
    setRevealed(new Set(session.revealed));
    setGraded(session.graded || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 홈 화면 "최근 틀린 개념 → 다시 풀기"에서 ?ch=CH.6&slug=composite-beams 로 들어오면 자동 선택
  useEffect(() => {
    if (searchParams.get('resume') === '1') return;
    const ch = searchParams.get('ch');
    const slug = searchParams.get('slug');
    if (!ch || !slug) return;
    const chapter = SUPPORTED_CHAPTERS.find((c) => c.num === ch);
    const subtopic = chapter?.subtopics.find((s) => s.slug === slug);
    if (!chapter || !subtopic) return;
    setSelectedChapters(new Set([ch]));
    setSelectedSubtopics(new Set([subtopicKey(chapter, subtopic)]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      setGraded({});
      setGenerating(false);
      // 새로 생성한 순간부터 "이어서 풀기" 대상이 된다 — 채점 전에 이 화면을 벗어나도
      // 문제 제작 허브에서 다시 찾아올 수 있게, 생성 직후 바로 저장해둔다.
      savePgSession(subject, { selectedChapters, selectedSubtopics, numQuestions, problems: list, revealed: [], graded: {} });
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

  // AI 자동 채점은 아직 연결 전이라, 정답 확인 후 본인이 맞았는지/틀렸는지 스스로 표시하는 방식으로
  // 대신함. 이 기록이 홈 화면의 "문제 풀이 %"와 "오답 횟수", "최근 틀린 개념"의 근거가 됨.
  function handleSelfGrade(i, p, isCorrect) {
    setGraded((prev) => {
      const next = { ...prev, [i]: isCorrect ? 'correct' : 'wrong' };
      // "이어서 풀기"가 채점 진행 상황까지 기억하도록, 채점할 때마다 저장된 세션도 같이 갱신한다.
      savePgSession(subject, { selectedChapters, selectedSubtopics, numQuestions, problems, revealed, graded: next });
      return next;
    });
    recordAttempt(p.ch.num, p.st.slug, isCorrect).then(refresh);
  }

  function handleUploadSolution(i, file) {
    const url = URL.createObjectURL(file);
    setSolutionImages((prev) => ({ ...prev, [i]: url }));
    setSolutionFiles((prev) => ({ ...prev, [i]: file }));
    setAiReview((prev) => ({ ...prev, [i]: undefined }));
  }

  async function handleAiReview(i, p) {
    const file = solutionFiles[i];
    if (!file) return;
    setAiReview((prev) => ({ ...prev, [i]: { loading: true } }));
    // 서버가 응답도 에러도 없이 그냥 끊기는 경우(예: 서버리스 함수 시간제한)에 대비해서,
    // 일정 시간 넘게 아무 응답이 없으면 클라이언트 쪽에서 직접 포기하고 에러로 처리한다 —
    // 이게 없으면 "검토 중..."이 영원히 떠 있게 된다.
    // 서버 라우트의 maxDuration(60초)과 똑같이 맞췄다가, 서버가 정확히 60.0초 걸려 응답에
    // 성공했는데 클라이언트가 몇 ms 먼저 포기해버려 멀쩡한 답을 에러로 날려버리는 경쟁 상태를
    // 직접 재현했다(AiTutorPanel.jsx와 동일한 원인) — 서버 쪽 한도보다 15초 여유를 더 준다.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 75000);
    try {
      const { data, mediaType } = await fileToResizedBase64(file);
      const res = await fetch('/api/grade-solution', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          imageBase64: data,
          imageMediaType: mediaType,
          prompt: p.prompt,
          answers: p.answers,
        }),
        signal: controller.signal,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '요청에 실패했어요.');
      setAiReview((prev) => ({ ...prev, [i]: { feedback: result.feedback } }));
    } catch (err) {
      const message =
        err.name === 'AbortError'
          ? '응답이 너무 오래 걸려서 중단했어요. 다시 시도해주세요.'
          : err.message || '검토 요청에 실패했어요. 잠시 후 다시 시도해주세요.';
      setAiReview((prev) => ({ ...prev, [i]: { error: message } }));
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const activeChapters = SUPPORTED_CHAPTERS.filter((ch) => selectedChapters.has(ch.num));
  const selectedList = activeChapters.flatMap((ch) =>
    ch.subtopics.filter((st) => selectedSubtopics.has(subtopicKey(ch, st))).map((st) => ({ ch, st }))
  );

  return (
    // body 기본 배경이 흰색으로 바뀌었어도 이 페이지는 원래대로 크림 배경을 쓴다.
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <SiteHeader active={subject} />

      <div className="page-subheader">
        <Link href={homeHref} className="back-link">
          ← 목록으로
        </Link>
        <span className="page-subheader-title">문제 생성</span>
      </div>

      <div className="pg-wrap" style={{ maxWidth: 1600, margin: '20px auto 0' }}>
        <EditableText
          as="div"
          contentKey={`problemGenerator.${subject}.intro`}
          defaultText={introDefault}
          style={{ fontSize: 12, color: 'var(--gray-soft)', lineHeight: 1.6 }}
        />
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
                  <div className="icon" dangerouslySetInnerHTML={{ __html: chapterIcons[ch.num] || '' }} />
                  <div className="body">
                    <span className="num">
                      {ch.num}
                      <span className="tag">
                        {checkedCount}/{ch.subtopics.length} 선택
                      </span>
                    </span>
                    <div className="title">{ch.title}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="col-label">SECTIONS</div>
          <div className="subtopics">
            {activeChapters.length === 0 ? (
              <div className="empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="4" y="4" width="16" height="16" rx="2" />
                  <path d="M8 9h8M8 13h5" />
                </svg>
                <EditableText
                  as="span"
                  contentKey="problemGenerator.pickChapterHint"
                  defaultText="왼쪽에서 챕터를 클릭하면
소주제를 고를 수 있습니다."
                  style={{ whiteSpace: 'pre-line' }}
                />
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
        <div className="pg-wrap" style={{ maxWidth: 1600, margin: '0 auto 40px' }}>
          <EditableText
            as="div"
            contentKey="problemGenerator.resultNote"
            defaultText="📐 선택한 소주제의 공식으로 매번 새로운 숫자를 뽑아 만든 문제예요. 정답은 계산기와 동일한 공식으로 계산돼요. (교재 문제를 그대로 가져오지 않고 새로 작성한 지문입니다)"
            style={{
              fontSize: 11,
              color: 'var(--gray-soft)',
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 0,
              padding: '8px 12px',
              marginBottom: 14,
            }}
          />
          <div className="steps">
            {problems.map((p, i) => (
              <div className="step-card" key={i}>
                <div className="step-header static">
                  문제 {i + 1} · {p.ch.num} {p.st.name}
                </div>
                <div className="step-body pg-step-body" style={{ display: 'grid', gap: 20 }}>
                  {/* 왼쪽: 문제 */}
                  <div>
                    <div className="problem-prompt-text" style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.75, marginBottom: 12, whiteSpace: 'pre-line' }}>
                      {p.prompt}
                    </div>
                    {p.diagram && (
                      <div style={{ background: 'var(--bg)', borderRadius: 0, padding: '14px 10px', marginBottom: 12 }}>
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
                          borderRadius: 0,
                          padding: '10px 14px',
                          lineHeight: 1.8,
                        }}
                      >
                        {p.answers.map((a, k) => (
                          <div key={k}>{a}</div>
                        ))}
                      </div>
                    )}
                    {revealed.has(i) && !graded[i] && (
                      <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--gray-soft)', alignSelf: 'center' }}>내 풀이는 —</span>
                        <button
                          className="add-block"
                          style={{ margin: 0, color: 'var(--teal)', borderColor: 'var(--teal)' }}
                          onClick={() => handleSelfGrade(i, p, true)}
                        >
                          {/* EditableText 안의 수정(✎) 버튼이 <button>이라, 이 버튼 안에 넣으면
                              button 안에 button이 중첩돼 HTML이 깨진다 — 버튼 라벨은 그대로 둔다. */}
                          맞았어요
                        </button>
                        <button
                          className="add-block"
                          style={{ margin: 0, color: 'var(--crimson)', borderColor: 'var(--crimson)' }}
                          onClick={() => handleSelfGrade(i, p, false)}
                        >
                          틀렸어요
                        </button>
                      </div>
                    )}
                    {graded[i] && (
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 12,
                          fontWeight: 700,
                          color: graded[i] === 'correct' ? 'var(--teal)' : 'var(--crimson)',
                        }}
                      >
                        {graded[i] === 'correct' ? (
                          <EditableText as="span" contentKey="problemGenerator.gradedCorrect" defaultText="✓ 정답으로 기록했어요." />
                        ) : (
                          <EditableText
                            as="span"
                            contentKey="problemGenerator.gradedWrong"
                            defaultText="✗ 오답으로 기록했어요 — 홈 화면에서 다시 확인할 수 있어요."
                          />
                        )}
                      </div>
                    )}
                  </div>

                  {/* 오른쪽: 내 풀이 첨부 */}
                  <div
                    style={{
                      border: '1.5px dashed var(--line)',
                      borderRadius: 0,
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
                          style={{ width: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 0, marginBottom: 10, background: 'var(--bg)' }}
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
                        <EditableText
                          as="span"
                          contentKey="problemGenerator.attachHint"
                          defaultText="풀이를 촬영·캡처해서
올려주세요"
                          style={{ fontSize: 12.5, whiteSpace: 'pre-line' }}
                        />
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => e.target.files[0] && handleUploadSolution(i, e.target.files[0])}
                        />
                      </label>
                    )}
                    <button
                      className="add-block"
                      disabled={!solutionFiles[i] || aiReview[i]?.loading}
                      onClick={() => handleAiReview(i, p)}
                      style={{ marginTop: 10, opacity: solutionFiles[i] ? 1 : 0.5, margin: '10px 0 0' }}
                    >
                      {aiReview[i]?.loading ? '검토 중...' : 'AI 튜터에게 검토 요청'}
                    </button>
                    {aiReview[i]?.feedback && (
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 12.5,
                          color: 'var(--ink)',
                          background: 'var(--bg)',
                          border: '1px solid var(--line)',
                          padding: '10px 12px',
                          lineHeight: 1.7,
                          whiteSpace: 'pre-line',
                        }}
                      >
                        {aiReview[i].feedback}
                      </div>
                    )}
                    {aiReview[i]?.error && (
                      <div style={{ marginTop: 8, fontSize: 12, color: 'var(--crimson)' }}>{aiReview[i].error}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <FloatingActions />
    </div>
  );
}
