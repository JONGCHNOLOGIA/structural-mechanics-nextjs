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
  const [activeChapter, setActiveChapter] = useState(null);
  const activeCh = activeChapter !== null ? chapters[activeChapter] : null;
  const { userId } = useUser();
  const router = useRouter();

  const [recentVisits, setRecentVisits] = useState([]);
  const [progressSummary, setProgressSummary] = useState([]);

  useEffect(() => {
    if (!userId) return;
    fetchRecentVisits(5).then(setRecentVisits);
    fetchProgressSummary().then(setProgressSummary);
  }, [userId]);

  return (
    <div style={{ background: 'var(--card)', minHeight: '100vh' }}>
      <SiteHeader active="sm2" />

      <ContinueLearning visits={recentVisits} />
      <LearningStatus summary={progressSummary} />

      <div className="board">
        <div>
          <div className="col-label">챕터</div>
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
                  <EditableText as="div" className="preview" contentKey={`chapter.${ch.num}.desc`} defaultText={ch.desc} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="col-label">소주제</div>
          <div className="subtopics">
            {!activeCh ? (
              chapters.map((ch) => (
                <div key={ch.num}>
                  <div className="subtopics-group-label">{ch.num} · {ch.title}</div>
                  {ch.subtopics.map((st) => (
                    <div
                      key={st.slug}
                      className="subtopic"
                      onClick={() => router.push(`${ch.base}/${st.slug}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="subtopic-row">
                        <span className="name">{st.name}</span>
                        <span className="go">열기 →</span>
                      </div>
                      <EditableText
                        as="div"
                        className="subprev"
                        contentKey={`subtopic.${ch.num}.${st.slug}.desc`}
                        defaultText={st.desc}
                      />
                    </div>
                  ))}
                </div>
              ))
            ) : activeCh.subtopics.length === 0 ? (
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
