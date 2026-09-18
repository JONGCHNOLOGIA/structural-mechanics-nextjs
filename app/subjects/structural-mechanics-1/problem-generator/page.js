'use client';

import ProblemGeneratorView from '@/components/calculators/ProblemGeneratorView';
import { chapters1, CHAPTER_ICONS_1 } from '@/lib/chapters1';
import { PROBLEM_BANK_1, generateProblem1 } from '@/lib/problemBank1';

export default function ProblemGenerator1Page() {
  return (
    <ProblemGeneratorView
      chapters={chapters1}
      chapterIcons={CHAPTER_ICONS_1}
      problemBank={PROBLEM_BANK_1}
      generateProblem={generateProblem1}
      subject="problem-generator-1"
      homeHref="/"
      introDefault="각 소주제의 계산기와 똑같은 공식으로 매번 새로운 숫자를 뽑아 문제를 만들어요. 아직 계산기가 만들어진 소주제만 목록에 나타납니다."
    />
  );
}