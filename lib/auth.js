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
export async function signUpOrLogin(studentId, name, password) {
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

  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert({ id: session.user.id, display_name: name.trim(), student_id: studentId.trim() });
  if (upsertError) {
    return { error: upsertError.message };
  }

  return { session };
}
