'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', session.user.id).single();
        if (profile?.display_name) {
          router.replace('/');
          return;
        }
      }
      setChecking(false);
    })();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    let {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      const { data, error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      session = data.session;
    }

    const { error: upsertError } = await supabase.from('profiles').upsert({ id: session.user.id, display_name: name.trim() });

    setLoading(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    router.replace('/');
  }

  if (checking) return null;

  return (
    <div>
      <header>
        <div className="subject-title">구조역학 2</div>
      </header>
      <div style={{ maxWidth: 400, margin: '80px auto 0' }}>
        <div className="panel" style={{ minHeight: 'auto' }}>
          <h3>이름을 입력해주세요</h3>
          <p style={{ fontSize: 13, color: 'var(--gray)', lineHeight: 1.6, marginBottom: 18 }}>
            학습 진도와 AI 튜터 대화를 저장하는 데 사용돼요.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <input type="text" required placeholder="이름" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="add-block active" style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? '입장 중...' : '입장하기'}
            </button>
            {error && (
              <p style={{ color: 'var(--crimson)', fontSize: 12, marginTop: 8 }}>{error}</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
