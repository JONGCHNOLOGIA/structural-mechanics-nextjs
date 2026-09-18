'use client';

import { chapters, CHAPTER_ICONS } from '@/lib/chapters';
import SubjectLobby from '@/components/SubjectLobby';

// 구조역학 2 로비 — 예전에는 사이트 첫 화면(/)이었는데, 구조역학 1이 기본 화면이 되면서
// 이 경로로 옮겼다. 화면 구성 자체는 구조역학 1과 완전히 같은 SubjectLobby를 쓴다.
export default function StructuralMechanics2Page() {
  return (
    <SubjectLobby
      subject="sm2"
      chapters={chapters}
      chapterIcons={CHAPTER_ICONS}
      problemGeneratorHref="/subjects/structural-mechanics-2/problem-generator"
    />
  );
}
