'use client';

import EditableText from './EditableText';

// 건축공학과 홈페이지 하단의 "일반공지 / 학사공지" 2단 리스트 레퍼런스.
// 실제 공지 게시판 데이터는 없어서, 각 줄을 EditableText로 만들어 문구 수정 권한이 있는
// 계정(canEditContent)이 실제 내용으로 바로 고쳐서 쓸 수 있게 했다.
const GENERAL = [
  { title: 'AI 튜터 베타 오픈 안내', date: '9월 15일(화)' },
  { title: '구조역학 2 문제은행 업데이트', date: '9월 10일(목)' },
  { title: '단면 특성 계산기 신규 오픈', date: '9월 3일(목)' },
  { title: '모바일 화면 최적화 작업 안내', date: '8월 28일(금)' },
  { title: '사이트 이용 가이드 영상 업로드', date: '8월 20일(목)' },
];

const ACADEMIC = [
  { title: '2026-2학기 구조역학 2 강의계획서 공지', date: '9월 14일(월)' },
  { title: '중간고사 일정 및 범위 안내', date: '9월 12일(토)' },
  { title: '전공 실습실(중무관) 이용 안내', date: '9월 5일(토)' },
  { title: '2026학년도 2학기 수강정정 안내', date: '8월 30일(일)' },
  { title: '건축공학과 학술제 참가 신청 안내', date: '8월 22일(토)' },
];

function NoticeColumn({ heading, prefix, rows }) {
  return (
    <div style={{ flex: '1 1 320px', minWidth: 280 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{heading}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-soft)', marginBottom: 14, cursor: 'default' }}>더보기 +</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((r, i) => (
          <div
            key={i}
            style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16,
              padding: '11px 0', borderBottom: i < rows.length - 1 ? '1px solid var(--line)' : 'none',
            }}
          >
            <EditableText
              as="span"
              contentKey={`home.notice.${prefix}.${i}.title`}
              defaultText={r.title}
              style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}
            />
            <EditableText
              as="span"
              contentKey={`home.notice.${prefix}.${i}.date`}
              defaultText={r.date}
              style={{ fontSize: 12.5, color: 'var(--gray-soft)', fontWeight: 600, flexShrink: 0 }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DeptNotices() {
  return (
    <div style={{ maxWidth: 1600, margin: '44px auto 0', padding: '0 40px', display: 'flex', gap: 60, flexWrap: 'wrap' }}>
      <NoticeColumn heading="일반공지" prefix="general" rows={GENERAL} />
      <NoticeColumn heading="학사공지" prefix="academic" rows={ACADEMIC} />
    </div>
  );
}
