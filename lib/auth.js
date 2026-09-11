import { supabase } from './supabaseClient';

// Supabase Auth는 이메일 기반이라, 학번을 "가짜 이메일"로 변환해서 그대로 이메일+비밀번호 인증을 씀.
// (실제 이메일이 없어도 되고, Supabase가 비밀번호를 안전하게 해싱/저장해주는 이점을 그대로 씀)
function studentIdToEmail(studentId) {
  return `${studentId.trim()}@sejong-demo.local`;
}

// 로그인 화면 하나로 회원가입/로그인을 겸함.
// - 해당 학번으로 계정이 없으면: 새로 만들고 바로 로그인 (회원가입)
// - 이미 있고 비밀번호가 맞으면: 그대로 로그인 (재방문)
// - 이미 있는데 비밀번호가 다르면: "중복된 학번입니다" 에러
//
// role을 넘기면 그 값으로 role도 같이 갱신함 (데모 버튼 전용 — 일반 로그인 폼은 role을 안 넘겨서
// 한 번 수동으로 지정한 role(예: instructor)이 재로그인할 때마다 초기화되지 않게 함)
export async function signUpOrLogin(studentId, name, password, role) {
  const email = studentIdToEmail(studentId);

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });

  let session = signUpData?.session ?? null;

  if (signUpError) {
    const already = signUpError.status === 422 || /already registered|already exists/i.test(signUpError.message || '');
    if (!already) {
      return { error: signUpError.message };
    }
    // 이미 등록된 학번 → 같은 비밀번호로 로그인 시도 (본인이 다시 들어온 경우)
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      return { error: '중복된 학번입니다.' };
    }
    session = signInData.session;
  }

  if (!session) {
    return { error: '로그인에 실패했습니다. 다시 시도해주세요.' };
  }

  const profileData = { id: session.user.id, display_name: name.trim(), student_id: studentId.trim() };
  if (role) profileData.role = role;

  const { error: upsertError } = await supabase.from('profiles').upsert(profileData);
  if (upsertError) {
    return { error: upsertError.message };
  }

  return { session };
}

// 공모전 발표 시연용 — 미리 정해둔 계정으로 타이핑 없이 바로 로그인.
// 실제 서비스 계정이 아니라 데모 전용이라 비밀번호가 코드에 그대로 들어있음(공개돼도 무방).
export const DEMO_ACCOUNTS = {
  student: { studentId: 'demo-student', name: '학생1', password: 'sejong-demo-2026', role: undefined },
  admin: { studentId: 'demo-admin', name: '관리자', password: 'sejong-demo-2026', role: 'instructor' },
};

export async function demoLogin(kind) {
  const acc = DEMO_ACCOUNTS[kind];
  if (!acc) return { error: '알 수 없는 데모 계정입니다.' };
  return signUpOrLogin(acc.studentId, acc.name, acc.password, acc.role);
}
