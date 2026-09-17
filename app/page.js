'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { chapters, CHAPTER_ICONS, findTopic } from '@/lib/chapters';
import { useUser } from '@/components/UserProvider';
import EditableText from '@/components/EditableText';
import { fetchRecentVisits, fetchProgressSummary } from '@/lib/progress';
import ContinueLearning from '@/components/ContinueLearning';
import LearningStatus from '@/components/LearningStatus';
import FloatingActions from '@/components/FloatingActions';
import SiteHeader from '@/components/SiteHeader';

// 프로토타입의 #home (header + hero + board) 마크업을 그대로 옮긴 것.
export default function HomePage() {
  // 클릭 대신 마우스를 올린 챕터를 바로 오른쪽에 미리보기 — 처음엔 첫 챕터(CH.6)를 기본으로
  // 보여주고, 마우스를 올렸다 떼면 그 챕터로 유지된다(마우스가 떠났다고 CH.6으로 되돌아가지 않음).
  const [previewChapter, setPreviewChapter] = useState(0);
  const activeCh = chapters[previewChapter];
  const { userId } = useUser();
  const router = useRouter();

  const [recentVisits, setRecentVisits] = useState([]);
  const [progressSummary, setProgressSummary] = useState([]);

  useEffect(() => {
    if (!userId) return;
    fetchRecentVisits(10).then(setRecentVisits);
    fetchProgressSummary().then(setProgressSummary);
  }, [userId]);

  return (
    <div style={{ background: 'var(--card)', minHeight: '100vh' }}>
      <SiteHeader active="sm2" />

      <ContinueLearning visits={recentVisits} />
      <LearningStatus summary={progressSummary} />

      <div className="board">
        <div>
          <div className="col-label col-label-eng">Chapters</div>
          <div className="chapter-list">
            {chapters.map((ch, idx) => (
              <div
                key={ch.num}
                className={'chapter' + (ch.ready ? '' : ' disabled') + (previewChapter === idx ? ' active' : '')}
                onMouseEnter={() => ch.ready && setPreviewChapter(idx)}
              >
                <div className="icon" dangerouslySetInnerHTML={{ __html: CHAPTER_ICONS[ch.num] || '' }} />
                <div className="body">
                  <span className="num">
                    {ch.num}
                    {ch.ready ? <span className="tag">{ch.subtopics.length}개 소주제</span> : <span className="tag">준비중</span>}
                  </span>
                  <div className="title">{ch.title}</div>
                  <EditableText as="div" className="preview" contentKey={`chapter.${ch.num}.desc`} defaultText={ch.desc} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="col-label col-label-eng">Sections</div>
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
                  <EditableText
                    as="div"
                    className="subprev"
                    contentKey={`subtopic.${activeCh.num}.${st.slug}.desc`}
                    defaultText={st.desc}
                  />
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
