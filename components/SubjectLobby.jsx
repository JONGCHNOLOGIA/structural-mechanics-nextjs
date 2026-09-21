'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProgress } from '@/components/ProgressProvider';
import EditableImages from '@/components/EditableImages';
import ContinueLearning from '@/components/ContinueLearning';
import FloatingActions from '@/components/FloatingActions';
import SiteHeader from '@/components/SiteHeader';

/*
  구조역학 1·2 로비의 공통 틀. 두 과목의 화면이 똑같아야 하므로 한 컴포넌트로 합치고,
  과목마다 다른 것(챕터 목록·아이콘·헤더 활성탭·문제 생성기 유무)만 props로 받는다.

  진도 기록(topic_visits / problem_attempts)은 두 과목이 같은 테이블을 쓰지만 챕터 번호가
  겹치지 않아서(구조역학 1 = CH.1~5, 구조역학 2 = CH.6~10), 이 과목의 챕터 번호에 해당하는
  기록만 걸러서 각 로비가 자기 과목 진도만 보여주게 한다.
*/
export default function SubjectLobby({ subject, chapters, chapterIcons, problemGeneratorHref = null }) {
  const [previewChapter, setPreviewChapter] = useState(0);
  const activeCh = chapters[previewChapter];
  const router = useRouter();

  // recentVisits는 app/layout.js에 있는 ProgressProvider가 한 번만 불러와 들고 있는 값을 그대로
  // 읽는다 — 이 로비 컴포넌트 자체는 구조역학 1↔2를 오갈 때마다 통째로 새로 마운트되지만
  // (라우트가 바뀌니까), 값을 들고 있는 쪽은 그 위에서 안 바뀌고 그대로 살아있어서
  // "이어서 학습하기"가 [] → 데이터로 채워지는 깜박임 없이 처음부터 채워진 값으로 바로 그려진다.
  const { recentVisits } = useProgress();

  const chapterNums = new Set(chapters.map((c) => c.num));
  const myVisits = recentVisits.filter((v) => chapterNums.has(v.chapter_num));

  return (
    <div style={{ background: 'var(--card)', minHeight: '100vh' }}>
      <SiteHeader active={subject} />

      <ContinueLearning visits={myVisits} chapters={chapters} />

      <div className="board">
        <div>
          <div className="col-label">Chapters</div>
          <div className="chapter-list">
            {chapters.map((ch, idx) => (
              <div
                key={ch.num}
                className={'chapter' + (ch.ready ? '' : ' disabled') + (previewChapter === idx ? ' active' : '')}
                onMouseEnter={() => ch.ready && setPreviewChapter(idx)}
              >
                <div className="icon" dangerouslySetInnerHTML={{ __html: chapterIcons[ch.num] || '' }} />
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
            <div className="subtopics-group-label">{activeCh.num} · {activeCh.title}</div>
            {activeCh.subtopics.length === 0 ? (
              <div className="empty">이 챕터는 아직 소주제가 준비되지 않았습니다.</div>
            ) : (
              activeCh.subtopics.map((st) => (
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
              ))
            )}
          </div>
        </div>
      </div>

      <FloatingActions />
    </div>
  );
}
