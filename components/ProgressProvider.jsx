'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useUser } from '@/components/UserProvider';
import { fetchRecentVisits, fetchProgressSummary } from '@/lib/progress';

// "이어서 학습하기" / "학습 현황"이 쓰는 recentVisits·progressSummary를 이 컨텍스트 하나에서만
// 들고 있는다. app/layout.js처럼 페이지 전환에도 그대로 살아있는 위치에 두는 게 핵심 —
// 전에는 SubjectLobby(구조역학 1/2 로비, 문제 제작 허브가 아니라 각 과목 로비)가 페이지를
// 옮길 때마다 통째로 언마운트→새로 마운트되면서 recentVisits가 []로 리셋됐다가 fetch가
// 끝나야 다시 채워졌고, 그 사이 "이어서 학습하기"가 사라졌다 나타나는 깜박임으로 보였다.
// 여기서는 userId가 바뀔 때 한 번만 불러오고, 로비들은 이미 채워진 값을 그대로 읽기만 한다.
const ProgressContext = createContext({ recentVisits: [], progressSummary: [], refresh: () => {} });

export function useProgress() {
  return useContext(ProgressContext);
}

export default function ProgressProvider({ children }) {
  const { userId } = useUser();
  const [recentVisits, setRecentVisits] = useState([]);
  const [progressSummary, setProgressSummary] = useState([]);

  const refresh = useCallback(() => {
    if (!userId) return;
    fetchRecentVisits(10).then(setRecentVisits);
    fetchProgressSummary().then(setProgressSummary);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setRecentVisits([]);
      setProgressSummary([]);
      return;
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return <ProgressContext.Provider value={{ recentVisits, progressSummary, refresh }}>{children}</ProgressContext.Provider>;
}
