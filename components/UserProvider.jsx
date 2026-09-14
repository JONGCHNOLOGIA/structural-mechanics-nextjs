'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// 로그인한 사용자의 학번/이름을 앱 어디서나 꺼내 쓸 수 있게 하는 공용 컨텍스트.
// 동시에 "로그인 안 했으면 /login으로 보내기" 라우트 가드 역할도 겸함.

// 사이트 문구(EditableText) 수정 권한은 role='instructor' 전체가 아니라 이 학번 한 명으로 한정함.
// (공모전 발표용 "관리자로 시연" 데모 계정도 role='instructor'라서, role만으로 구분하면
// 시연 중 아무나 실제 사이트 문구를 고칠 수 있게 되어버림 — 그래서 studentId로 따로 구분)
const CONTENT_EDITOR_STUDENT_ID = '22011031';

const UserContext = createContext({ studentId: null, displayName: null, role: null, isAdmin: false, canEditContent: false, ready: false });

export function useUser() {
  return useContext(UserContext);
}

export default function UserProvider({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState({ studentId: null, displayName: null, role: null, isAdmin: false, canEditContent: false, ready: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (pathname !== '/login') router.replace('/login');
        if (!cancelled) setState({ studentId: null, displayName: null, role: null, isAdmin: false, canEditContent: false, ready: true });
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('display_name, student_id, role').eq('id', session.user.id).single();

      if (!cancelled) {
        setState({
          studentId: profile?.student_id ?? null,
          displayName: profile?.display_name ?? null,
          role: profile?.role ?? 'student',
          isAdmin: profile?.role === 'instructor',
          canEditContent: profile?.student_id === CONTENT_EDITOR_STUDENT_ID,
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
