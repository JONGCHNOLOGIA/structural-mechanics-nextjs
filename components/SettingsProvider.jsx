'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { setGlobalDecimals } from '@/lib/calc/unitOptions';

// 계산 결과 표시 소수점 자리수 설정. localStorage에 항상 저장해서 비로그인/오프라인에서도
// 바로 적용되고, 로그인 상태면 profiles.decimals에도 저장해서 다른 기기에서도 이어짐.
//
// fmt()는 lib/calc/unitOptions.js의 모듈 변수(DECIMALS)를 읽는 평범한 함수라서, 계산기
// 컴포넌트들은 이 설정을 전혀 구독하지 않는다(21개 파일을 하나도 손 안 대는 게 목적).
// 그런데 React는 {children}을 그대로 통과시키는 Provider가 자기 state만 바뀌어도, 참조가
// 그대로인 children 서브트리까지 자동으로 다시 그려주지는 않는다(자식이 이 컨텍스트를 직접
// 구독하지 않는 한) — 그래서 "지금 보고 있는 페이지의 숫자가 설정을 바꾸자마자 바로 바뀌는"
// 것까지는 안 되고, 값을 바꾼 다음엔 한 번 새로고침해서 반영한다(SettingsButton에서 처리).
// 대신 새로고침 시 첫 렌더부터 정확한 값이 나오도록, localStorage는 useState 초기화 함수에서
// "동기적으로" 읽어 DECIMALS를 먼저 맞춰둔다.
const SettingsContext = createContext({ decimals: 3, setDecimals: async () => {} });

export function useSettings() {
  return useContext(SettingsContext);
}

const STORAGE_KEY = 'sm2_decimals';

function readInitialDecimals() {
  if (typeof window === 'undefined') return 3;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      const n = parseInt(stored, 10);
      if (!isNaN(n)) return n;
    }
  } catch {
    // localStorage 접근 불가 시 기본값 3 유지
  }
  return 3;
}

export default function SettingsProvider({ children }) {
  const [decimals, setDecimalsState] = useState(() => {
    const initial = readInitialDecimals();
    setGlobalDecimals(initial);
    return initial;
  });

  // 로그인 계정이면 profiles.decimals가 이 브라우저의 localStorage보다 최신일 수 있음
  // (다른 기기에서 바꾼 경우) — 다르면 한 번 새로고침해서 전체 화면에 반영
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const { data: profile } = await supabase.from('profiles').select('decimals').eq('id', session.user.id).single();
      if (profile?.decimals !== null && profile?.decimals !== undefined && profile.decimals !== decimals) {
        setGlobalDecimals(profile.decimals);
        setDecimalsState(profile.decimals);
        try {
          localStorage.setItem(STORAGE_KEY, String(profile.decimals));
        } catch {
          // 무시
        }
        window.location.reload();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setDecimals(n) {
    setGlobalDecimals(n);
    setDecimalsState(n);
    try {
      localStorage.setItem(STORAGE_KEY, String(n));
    } catch {
      // 무시 — 저장 안 돼도 이번 세션엔 이미 반영됨
    }
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('profiles').update({ decimals: n }).eq('id', session.user.id);
    }
  }

  return <SettingsContext.Provider value={{ decimals, setDecimals }}>{children}</SettingsContext.Provider>;
}
