'use client';

import { useRouter } from 'next/navigation';
import { findTopic } from '@/lib/chapters';

// 홈 화면 "이어서 학습하기" — 최근에 들어갔던 소주제 카드를 최신순으로 보여준다.
// 방문 기록(lib/progress.js의 topic_visits)이 하나도 없으면 아무것도 렌더링하지 않는다.
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
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 14,
              padding: '16px 18px',
              cursor: 'pointer',
              transition: 'box-shadow 0.15s ease, border-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--crimson)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--line)')}
          >
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--crimson)', marginBottom: 4 }}>
              {c.chapter.num} · {c.chapter.title}
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--ink)' }}>{c.subtopic.name}</div>
            <div style={{ fontSize: 12, color: 'var(--crimson)', fontWeight: 800, marginTop: 8 }}>이어서 학습하기 →</div>
          </div>
        ))}
      </div>
    </div>
  );
}
