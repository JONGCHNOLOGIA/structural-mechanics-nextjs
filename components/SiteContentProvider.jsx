'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// site_content 테이블 전체를 앱 시작 시 한 번만 불러와 공유하는 컨텍스트.
// EditableText가 매번 개별 쿼리를 날리지 않고 이 맵에서 바로 값을 읽도록 하기 위함
// (사이트 전체에 EditableText가 수십~수백 개 박혀도 네트워크 요청은 1번).
const SiteContentContext = createContext({ content: {}, ready: false, setLocal: () => {} });

export function useSiteContent() {
  return useContext(SiteContentContext);
}

export default function SiteContentProvider({ children }) {
  const [content, setContent] = useState({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('site_content').select('key, value');
      if (!cancelled) {
        const map = {};
        (data || []).forEach((row) => {
          map[row.key] = row.value;
        });
        setContent(map);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocal = useCallback((key, value) => {
    setContent((prev) => ({ ...prev, [key]: value }));
  }, []);

  return <SiteContentContext.Provider value={{ content, ready, setLocal }}>{children}</SiteContentContext.Provider>;
}
