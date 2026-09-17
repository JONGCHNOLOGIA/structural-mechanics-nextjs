'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { chapters, CHAPTER_ICONS, findTopic } from '@/lib/chapters';
import { useUser } from '@/components/UserProvider';
import { supabase } from '@/lib/supabaseClient';
import EditableText from '@/components/EditableText';
import { fetchRecentVisits, fetchProgressSummary } from '@/lib/progress';
import ContinueLearning from '@/components/ContinueLearning';
import LearningStatus from '@/components/LearningStatus';
import FloatingActions from '@/components/FloatingActions';

const ARCHENG_URL = 'https://dept.sejong.ac.kr/archeng/index.do';

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
    <div>
      <header>
        <Link href="/" className="site-logo">
          <div className="site-logo-eng">SEJONG UNIVERSITY</div>
          <div className="site-logo-kr">2026 건축공학과 학술제</div>
        </Link>

        <nav className="site-nav">
          <span className="site-nav-item disabled" title="다른 팀원이 만들고 있어요 — 준비중">구조역학 1</span>
          <span className="site-nav-item active">구조역학 2</span>
          <span className="site-nav-item" onClick={() => router.push('/subjects/structural-mechanics-2/problem-generator')}>
            문제 제작
          </span>
          <span className="site-nav-item disabled" title="준비중">커뮤니티</span>
        </nav>

        <div className="header-right">
          {userId ? (
            <button
              className="btn-outline"
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace('/login');
              }}
              aria-label="로그아웃"
            >
              로그아웃
            </button>
          ) : (
            <Link href="/login" className="btn-outline">로그인</Link>
          )}
          <a href={ARCHENG_URL} target="_blank" rel="noopener noreferrer" className="btn-solid">
            건축공학과 ↗
          </a>
        </div>
      </header>

      <ContinueLearning visits={recentVisits} />
      <LearningStatus summary={progressSummary} />

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
                  <EditableText as="div" className="preview" contentKey={`chapter.${ch.num}.desc`} defaultText={ch.desc} />
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
