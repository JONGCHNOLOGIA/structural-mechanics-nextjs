'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { chapters, CHAPTER_ICONS, findTopic } from '@/lib/chapters';
import { useUser } from '@/components/UserProvider';
import LogoutButton from '@/components/LogoutButton';
import SettingsButton from '@/components/SettingsButton';
import EditableText from '@/components/EditableText';
import { fetchRecentVisits, fetchProgressSummary } from '@/lib/progress';
import ContinueLearning from '@/components/ContinueLearning';
import LearningStatus from '@/components/LearningStatus';

// 프로토타입의 #home (header + hero + board) 마크업을 그대로 옮긴 것.
export default function HomePage() {
  const [activeChapter, setActiveChapter] = useState(null);
  const activeCh = activeChapter !== null ? chapters[activeChapter] : null;
  const { displayName, studentId, userId } = useUser();
  const router = useRouter();

  const [recentVisits, setRecentVisits] = useState([]);
  const [progressSummary, setProgressSummary] = useState([]);

  useEffect(() => {
    if (!userId) return;
    fetchRecentVisits(3).then(setRecentVisits);
    fetchProgressSummary().then(setProgressSummary);
  }, [userId]);

  return (
    <div>
      <header>
        <div className="subject-title">
          <Link href="/subjects" className="back-link">
            ← 과목 선택
          </Link>
          <span>구조역학 2</span>
        </div>
        <div className="header-right">
          {userId ? (
            <>
              <SettingsButton />
              <LogoutButton />
              <div className="user-tag">
                {studentId} {displayName}
              </div>
            </>
          ) : (
            <Link href="/login" className="add-block" style={{ margin: 0, padding: '8px 16px' }}>
              로그인
            </Link>
          )}
        </div>
      </header>

      <div className="hero">
        <div className="hero-text">
          <h1>{userId ? `안녕하세요, ${displayName}님 👋` : '구조역학 2, 둘러보는 중이에요 👋'}</h1>
          {!userId && (
            <div style={{ fontSize: 12.5, color: 'var(--crimson)', fontWeight: 700, marginBottom: 4 }}>
              <Link href="/login" style={{ color: 'inherit' }}>로그인</Link>하면 진도가 저장되고 이어서 학습할 수 있어요.
            </div>
          )}
          <EditableText
            contentKey="home.hero.description"
            defaultText="구조역학 2의 각 챕터를 클릭해 소주제를 살펴보고, 인터랙티브 시각화와 AI 튜터로 개념을 확인해보세요."
          />
          <div className="hero-stats">
            <Link href="/subjects/structural-mechanics-2/problem-generator" className="hero-stat hero-stat-link">
              <div className="n">✎</div>
              <div className="l">문제 생성</div>
            </Link>
            <Link href="/subjects/structural-mechanics-2/section-properties" className="hero-stat hero-stat-link">
              <div className="n">📐</div>
              <div className="l">단면 특성 계산기</div>
            </Link>
          </div>
        </div>
        <div className="hero-art">
          <img
            src="/cover.jpg"
            alt="재료역학 (Mechanics of Materials) 9th Edition 표지"
            style={{ width: 104, height: 140, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }}
          />
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
    </div>
  );
}
