'use client';

import { chapters1, CHAPTER_ICONS_1 } from '@/lib/chapters1';
import SubjectLobby from '@/components/SubjectLobby';

// 사이트의 첫 화면 = 구조역학 1 로비.
// (구조역학 2는 /subjects/structural-mechanics-2 로 옮겼고, 화면 구성은 SubjectLobby로 공용.)
export default function HomePage() {
  return <SubjectLobby subject="sm1" chapters={chapters1} chapterIcons={CHAPTER_ICONS_1} />;
}
