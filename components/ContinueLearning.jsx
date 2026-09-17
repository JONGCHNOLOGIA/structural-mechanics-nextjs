'use client';

import { useState } from 'react';
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
// 건축공학과 홈페이지의 "학과 공지사항" 카드를 레퍼런스 삼음 — 기본은 흰 배경(제목=CH.n · 챕터명,
// 본문=소주제명, 하단=날짜)이고, 마우스를 올리면 레퍼런스의 "선택된" 카드처럼 네이비+흰 글씨로 바뀐다.
export default function ContinueLearning({ visits }) {
  const router = useRouter();
  const [hoveredKey, setHoveredKey] = useState(null);
  const cards = (visits || [])
    .map((v) => {
      const topic = findTopic(v.chapter_num, v.subtopic_slug);
      return topic ? { ...topic, visitedAt: v.visited_at } : null;
    })
    .filter(Boolean);

  if (cards.length === 0) return null;

  return (
    <div style={{ maxWidth: 1600, margin: '36px auto 0', padding: '0 40px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 18 }}>
        <div style={{ fontSize: 30, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.01em' }}>이어서 학습하기</div>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-soft)' }}>더보기 +</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {cards.map((c) => {
          const key = `${c.chapter.num}::${c.subtopic.slug}`;
          const hovered = hoveredKey === key;
          return (
            <div
              key={key}
              onClick={() => router.push(c.href)}
              onMouseEnter={() => setHoveredKey(key)}
              onMouseLeave={() => setHoveredKey(null)}
              style={{
                background: hovered ? 'var(--navy)' : 'var(--card)',
                border: `1px solid ${hovered ? 'var(--navy)' : 'var(--line)'}`,
                borderRadius: 4,
                padding: '26px 20px',
                minHeight: 190,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease',
                boxShadow: hovered ? '0 10px 22px rgba(30,50,69,0.28)' : '0 1px 3px rgba(0,0,0,0.04)',
                transform: hovered ? 'translateY(-2px)' : 'none',
              }}
            >
              <div style={{ fontSize: 17, fontWeight: 800, color: hovered ? '#fff' : 'var(--ink)', lineHeight: 1.4, marginBottom: 10 }}>
                {c.chapter.num} · {c.chapter.title}
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: hovered ? 'rgba(255,255,255,0.85)' : 'var(--gray)', lineHeight: 1.5, marginBottom: 16 }}>
                {c.subtopic.name}
              </div>
              {c.visitedAt && (
                <div style={{ fontSize: 12, fontWeight: 700, color: hovered ? 'rgba(255,255,255,0.75)' : 'var(--gray-soft)' }}>
                  {formatVisitedDate(c.visitedAt)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ height: 3, marginTop: 26, borderRadius: 2, background: 'linear-gradient(to right, var(--crimson) 0%, var(--crimson) 30%, var(--line) 30%, var(--line) 100%)' }} />
    </div>
  );
}
