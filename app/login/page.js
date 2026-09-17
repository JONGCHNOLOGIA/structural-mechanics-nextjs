'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { signUpOrLogin, demoLogin } from '@/lib/auth';

export default function LoginPage() {
  const [studentId, setStudentId] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  // 이미 로그인되어 있으면(세션이 살아있으면) 로그인 화면을 건너뛰고 바로 홈 화면으로
  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        router.replace('/');
        return;
      }
      setChecking(false);
    })();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!studentId.trim() || !name.trim() || !password) return;
    setLoading(true);
    setError('');

    const { error: err } = await signUpOrLogin(studentId, name, password);

    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace('/');
  }

  async function handleDemoLogin(kind) {
    setLoading(true);
    setError('');

    const { error: err } = await demoLogin(kind);

    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    router.replace('/');
  }

  if (checking) return null;

  return (
    <div>
      <header>
        <div className="subject-title">구조역학 튜터</div>
      </header>
      <div style={{ maxWidth: 400, margin: '80px auto 0' }}>
        <div className="panel" style={{ minHeight: 'auto' }}>
          <h3>학번과 이름, 비밀번호를 입력해주세요</h3>
          <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 18 }}>
            처음이면 자동으로 계정이 만들어지고, 이미 만든 적이 있으면 그대로 로그인돼요.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>학번</label>
              <input type="text" required value={studentId} onChange={(e) => setStudentId(e.target.value)} />
            </div>
            <div className="field">
              <label>이름</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label>비밀번호</label>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="add-block active" style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? '처리 중...' : '입장하기'}
            </button>
            {error && <p style={{ color: 'var(--crimson)', fontSize: 12, marginTop: 8 }}>{error}</p>}
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 16px' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            <span style={{ fontSize: 11, color: 'var(--gray-soft)' }}>시연용 바로가기</span>
            <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" disabled={loading} className="add-block" style={{ margin: 0, flex: 1, opacity: loading ? 0.6 : 1 }} onClick={() => handleDemoLogin('student')}>
              학생으로 시연
            </button>
            <button type="button" disabled={loading} className="add-block" style={{ margin: 0, flex: 1, opacity: loading ? 0.6 : 1 }} onClick={() => handleDemoLogin('admin')}>
              관리자로 시연
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
