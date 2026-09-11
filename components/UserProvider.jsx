'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// 로그인한 사용자의 학번/이름을 앱 어디서나 꺼내 쓸 수 있게 하는 공용 컨텍스트.
// 동시에 "로그인 안 했으면 /login으로 보내기" 라우트 가드 역할도 겸함.
const UserContext = createContext({ studentId: null, displayName: null, ready: false });

export function useUser() {
  return useContext(UserContext);
}

export default function UserProvider({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState({ studentId: null, displayName: null, ready: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (pathname !== '/login') router.replace('/login');
        if (!cancelled) setState({ studentId: null, displayName: null, ready: true });
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('display_name, student_id').eq('id', session.user.id).single();

      if (!cancelled) {
        setState({
          studentId: profile?.student_id ?? null,
          displayName: profile?.display_name ?? null,
          ready: true,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!state.ready) return null;

  return <UserContext.Provider value={state}>{children}</UserContext.Provider>;
}
