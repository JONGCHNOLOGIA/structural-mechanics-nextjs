'use client';

import { useRouter } from 'next/navigation';
import { findTopic } from '@/lib/chapters';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 건축공학과 홈페이지 공지사항 카드처럼 "7월 19일(금)" 형식으로 날짜를 표시.
function formatVisitedDate(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${WEEKDAYS[d.getDay()]})`;
}

// 홈 화면 "이어서 학습하기" — 최근에 들어갔던 소주제 카드를 최신순으로 보여준다.
// 방문 기록(lib/progress.js의 topic_visits)이 하나도 없으면 아무것도 렌더링하지 않는다.
// 건축공학과 홈페이지의 "학과 공지사항" 카드(진한 네이비 배경 + 흰 텍스트) 스타일을 레퍼런스 삼음.
export default function ContinueLearning({ visits }) {
  const router = useRouter();
  const cards = (visits || [])
    .map((v) => {
      const topic = findTopic(v.chapter_num, v.subtopic_slug);
      return topic ? { ...topic, visitedAt: v.visited_at } : null;
    })
    .filter(Boolean);

  if (cards.length === 0) return null;

  return (
    <div style={{ maxWidth: 1600, margin: '28px auto 0', padding: '0 40px' }}>
      <div className="col-label" style={{ marginBottom: 14 }}>
        이어서 학습하기
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {cards.map((c) => (
          <div
            key={`${c.chapter.num}::${c.subtopic.slug}`}
            onClick={() => router.push(c.href)}
            style={{
              flex: '1 1 220px',
              maxWidth: 320,
              background: 'var(--navy)',
              border: '1px solid var(--navy)',
              borderRadius: 14,
              padding: '16px 18px',
              cursor: 'pointer',
              transition: 'box-shadow 0.15s ease, transform 0.15s ease',
              boxShadow: '0 2px 10px rgba(30,50,69,0.18)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(30,50,69,0.28)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(30,50,69,0.18)'; }}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: '#F0A8B4', marginBottom: 4 }}>
              {c.chapter.num} · {c.chapter.title}
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: '#fff' }}>{c.subtopic.name}</div>
            <div style={{ fontSize: 12, color: '#fff', fontWeight: 800, marginTop: 8, opacity: 0.9 }}>이어서 학습하기 →</div>
            {c.visitedAt && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 10, fontWeight: 600 }}>
                {formatVisitedDate(c.visitedAt)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
