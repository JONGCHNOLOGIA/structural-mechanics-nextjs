'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/components/UserProvider';
import LogoutButton from '@/components/LogoutButton';
import SettingsButton from '@/components/SettingsButton';
import EditableText from '@/components/EditableText';
import EditableVideo from '@/components/EditableVideo';

export default function SubjectsPage() {
  const { displayName, studentId } = useUser();
  const router = useRouter();
  const [sm2Hovered, setSm2Hovered] = useState(false);

  return (
    <div>
      <header>
        <div className="subject-title">과목 선택</div>
        <div className="header-right">
          <SettingsButton />
          <LogoutButton />
          <div className="user-tag">
            {studentId} {displayName}
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 700, margin: '60px auto 0', padding: '0 40px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>안녕하세요, {displayName}님 👋</h1>
        <EditableText
          as="p"
          contentKey="subjects.intro"
          defaultText="공부할 과목을 선택해주세요."
          style={{ fontSize: 14, color: 'var(--gray)', marginBottom: 28 }}
        />

        <div className="chapter-list">
          <div className="chapter disabled">
            <div className="body">
              <span className="num">
                구조역학 1<span className="tag">준비중</span>
              </span>
              <div className="title">Structural Mechanics 1</div>
              <EditableText as="div" className="preview" contentKey="subjects.sm1.desc" defaultText="다른 팀원이 만들고 있어요. 곧 열립니다." />
            </div>
          </div>

          <div
            className="chapter"
            onClick={() => router.push('/')}
            onMouseEnter={() => setSm2Hovered(true)}
            onMouseLeave={() => setSm2Hovered(false)}
            style={{ textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
          >
            <div className="body">
              <span className="num">
                구조역학 2<span className="tag">입장 가능</span>
              </span>
              <div className="title">Structural Mechanics 2</div>
              <EditableText
                as="div"
                className="preview"
                contentKey="subjects.sm2.desc"
                defaultText="보의 응력, 처짐, 부정정보까지 — 지금 바로 시작할 수 있어요."
              />
              <div
                style={{
                  display: 'grid',
                  gridTemplateRows: sm2Hovered ? '1fr' : '0fr',
                  transition: 'grid-template-rows 0.25s ease',
                }}
              >
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ paddingTop: 14, marginTop: 4, borderTop: '1px dashed var(--line)' }} onClick={(e) => e.stopPropagation()}>
                    <EditableText
                      as="div"
                      contentKey="subjects.sm2.detail"
                      defaultText="세종대학교 건축공학과 구조역학 2 수업을 위한 인터랙티브 학습 사이트예요. 계산기로 개념을 직접 조작해보고, 문제도 랜덤 생성해서 풀어볼 수 있어요."
                      style={{ fontSize: 12.5, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 12 }}
                    />
                    <EditableVideo contentKey="subjects.sm2.videoUrl" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
