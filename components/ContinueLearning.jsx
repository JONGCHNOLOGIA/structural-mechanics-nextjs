'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { chapters as sm2Chapters } from '@/lib/chapters';

// 방문 기록의 (chapterNum, slug)를 주어진 챕터 목록에서 찾아 실제 라우트까지 만들어준다.
// chapters를 넘기지 않으면 구조역학 2 목록을 쓴다(기존 호출부 호환).
function resolveTopic(chapters, chapterNum, slug) {
  const chapter = chapters.find((c) => c.num === chapterNum);
  const subtopic = chapter?.subtopics.find((s) => s.slug === slug);
  if (!chapter || !subtopic) return null;
  return { chapter, subtopic, href: `${chapter.base}/${subtopic.slug}` };
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const CARD_WIDTH = 260;
// 카드 목록 좌우 페이드 폭 — 페이지 기본 좌우 여백(64px, .home-header/.board와 동일 값)과
// 맞춰서, 카드가 옅어지는 구간이 "원래 거기 있던 여백"만큼만 차지하도록 함.
const EDGE_FADE = 64;

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
// 화면이 좁아지면 카드가 줄바꿈되는 대신, 레퍼런스처럼 가로 스크롤 + 하단 진행바로 넘겨본다.
export default function ContinueLearning({ visits, chapters = sm2Chapters }) {
  const router = useRouter();
  const [hoveredKey, setHoveredKey] = useState(null);
  const scrollRef = useRef(null);
  const trackRef = useRef(null);
  const draggingRef = useRef(false);
  const [thumb, setThumb] = useState({ widthPct: 100, leftPct: 0 });

  const cards = (visits || [])
    .map((v) => {
      const topic = resolveTopic(chapters, v.chapter_num, v.subtopic_slug);
      return topic ? { ...topic, visitedAt: v.visited_at } : null;
    })
    .filter(Boolean);

  function updateThumb() {
    const el = scrollRef.current;
    if (!el) return;
    const widthPct = Math.min(100, (el.clientWidth / el.scrollWidth) * 100);
    const maxScroll = el.scrollWidth - el.clientWidth;
    const leftPct = maxScroll > 0 ? (el.scrollLeft / maxScroll) * (100 - widthPct) : 0;
    setThumb({ widthPct, leftPct });
  }

  // 진행바를 실제 스크롤바처럼 드래그해서 카드 목록을 넘길 수 있게 함 — 트랙의 어디를 잡든
  // 그 x좌표 비율만큼 카드 목록의 scrollLeft를 옮긴다.
  function seekTo(clientX) {
    const track = trackRef.current;
    const el = scrollRef.current;
    if (!track || !el) return;
    const rect = track.getBoundingClientRect();
    const ratio = rect.width > 0 ? Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) : 0;
    el.scrollLeft = ratio * (el.scrollWidth - el.clientWidth);
  }

  function handleTrackPointerDown(e) {
    draggingRef.current = true;
    seekTo(e.clientX);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }

  function handlePointerMove(e) {
    if (!draggingRef.current) return;
    seekTo(e.clientX);
  }

  function handlePointerUp() {
    draggingRef.current = false;
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }

  useEffect(() => {
    updateThumb();
    window.addEventListener('resize', updateThumb);
    return () => {
      window.removeEventListener('resize', updateThumb);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length]);

  if (cards.length === 0) return null;

  // 왼쪽/오른쪽 중 실제로 가려진 카드가 있는 쪽만 옅어지게 — 양쪽 다 가려졌으면 양쪽 다,
  // 한쪽 끝까지 다 왔으면 그쪽은 다시 선명해짐(대칭적으로 동작).
  const atStart = thumb.leftPct <= 0.5;
  const atEnd = thumb.leftPct + thumb.widthPct >= 99.5;
  let maskImage = 'none';
  if (thumb.widthPct < 100) {
    if (!atStart && !atEnd) {
      maskImage = `linear-gradient(to right, transparent, black ${EDGE_FADE}px, black calc(100% - ${EDGE_FADE}px), transparent)`;
    } else if (!atEnd) {
      maskImage = `linear-gradient(to right, black calc(100% - ${EDGE_FADE}px), transparent)`;
    } else if (!atStart) {
      maskImage = `linear-gradient(to right, transparent, black ${EDGE_FADE}px)`;
    }
  }

  return (
    <div style={{ maxWidth: 1600, margin: '48px auto 0', padding: '0 64px' }}>
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 56, fontWeight: 600, color: 'var(--navy)', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
          이어서 학습하기
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={updateThumb}
        className="hide-scrollbar"
        style={{
          display: 'flex',
          gap: 22,
          overflowX: 'auto',
          paddingBottom: 4,
          WebkitMaskImage: maskImage,
          maskImage,
        }}
      >
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
                flex: `0 0 ${CARD_WIDTH}px`,
                width: CARD_WIDTH,
                background: hovered ? 'var(--navy)' : 'var(--card)',
                border: `1px solid ${hovered ? 'var(--navy)' : '#D8E0E8'}`,
                borderRadius: 0,
                padding: '36px 32px',
                minHeight: 220,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease',
                boxShadow: hovered ? '0 10px 24px rgba(30,50,69,0.28)' : 'none',
                transform: hovered ? 'translateY(-3px)' : 'none',
              }}
            >
              <div style={{ fontSize: 19, fontWeight: 700, color: hovered ? '#fff' : 'var(--ink)', lineHeight: 1.4, marginBottom: 10 }}>
                {c.chapter.num} · {c.chapter.title}
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 500, color: hovered ? 'rgba(255,255,255,0.85)' : 'var(--gray)', lineHeight: 1.5, marginBottom: 16 }}>
                {c.subtopic.name}
              </div>
              {c.visitedAt && (
                <div style={{ fontSize: 12.5, fontWeight: hovered ? 700 : 600, color: hovered ? 'rgba(255,255,255,0.75)' : 'var(--gray-soft)' }}>
                  {formatVisitedDate(c.visitedAt)}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div
        ref={trackRef}
        onPointerDown={handleTrackPointerDown}
        style={{ height: 14, marginTop: 16, display: 'flex', alignItems: 'center', cursor: 'pointer', touchAction: 'none' }}
      >
        <div style={{ width: '100%', height: 4, borderRadius: 0, background: 'var(--line)', overflow: 'hidden', pointerEvents: 'none' }}>
          <div
            style={{
              height: '100%',
              borderRadius: 0,
              background: 'var(--crimson)',
              width: `${thumb.widthPct}%`,
              transform: `translateX(${(thumb.leftPct / thumb.widthPct) * 100}%)`,
              transition: draggingRef.current ? 'none' : 'transform 0.1s linear',
            }}
          />
        </div>
      </div>
    </div>
  );
}
