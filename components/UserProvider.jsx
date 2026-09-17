'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// 로그인한 사용자의 학번/이름을 앱 어디서나 꺼내 쓸 수 있게 하는 공용 컨텍스트.
// 동시에 "로그인 안 했으면 /login으로 보내기" 라우트 가드 역할도 겸함 — 단, 홈 화면('/')은
// 학과 홈페이지처럼 로그인 없이도 둘러볼 수 있게 예외로 둔다(구경하다 챕터/계산기를 클릭하면
// 그 페이지에서 다시 이 가드에 걸려 로그인으로 유도됨).
const PUBLIC_PATHS = ['/login', '/'];

// 사이트 문구(EditableText) 수정 권한은 role='instructor' 전체가 아니라 정해진 학번들로 한정함.
// 22011031(실제 관리자 계정)과 demo-admin(로그인 화면의 "관리자로 시연" 데모 버튼) 둘 다 포함 —
// 공모전 발표 중 "관리자로 시연"을 눌러 바로 텍스트 수정 시연이 가능해야 하기 때문.
const CONTENT_EDITOR_STUDENT_IDS = ['22011031', 'demo-admin'];

const UserContext = createContext({ userId: null, studentId: null, displayName: null, role: null, isAdmin: false, canEditContent: false, ready: false });

export function useUser() {
  return useContext(UserContext);
}

export default function UserProvider({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState({ userId: null, studentId: null, displayName: null, role: null, isAdmin: false, canEditContent: false, ready: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        if (!PUBLIC_PATHS.includes(pathname)) router.replace('/login');
        if (!cancelled) setState({ userId: null, studentId: null, displayName: null, role: null, isAdmin: false, canEditContent: false, ready: true });
        return;
      }

      const { data: profile } = await supabase.from('profiles').select('display_name, student_id, role').eq('id', session.user.id).single();

      if (!cancelled) {
        setState({
          userId: session.user.id,
          studentId: profile?.student_id ?? null,
          displayName: profile?.display_name ?? null,
          role: profile?.role ?? 'student',
          isAdmin: profile?.role === 'instructor',
          canEditContent: CONTENT_EDITOR_STUDENT_IDS.includes(profile?.student_id),
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
