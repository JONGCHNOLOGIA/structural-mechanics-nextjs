'use client';

import ProblemGeneratorView from '@/components/calculators/ProblemGeneratorView';
import { chapters, CHAPTER_ICONS } from '@/lib/chapters';
import { PROBLEM_BANK, generateProblem } from '@/lib/problemBank';

export default function ProblemGenerator2Page() {
  return (
    <ProblemGeneratorView
      chapters={chapters}
      chapterIcons={CHAPTER_ICONS}
      problemBank={PROBLEM_BANK}
      generateProblem={generateProblem}
      subject="problem-generator-2"
      homeHref="/subjects/structural-mechanics-2"
      introDefault="참고 문제 자료에 실제로 있던 유형만 지원해요 — 일부 소주제(예: Functionally Graded Beams, Plane Stress)는 문제 생성에서 제외되어 있어요."
    />
  );
}