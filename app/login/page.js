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
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', session.user.id)
          .single();
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

    let { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      const { data, error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }
      session = data.session;
    }

    const { error: upsertError } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, display_name: name.trim() });

    setLoading(false);
    if (upsertError) {
      setError(upsertError.message);
      return;
    }
    router.replace('/');
  }

  if (checking) return null;

  return (
    <main className="max-w-md mx-auto p-10 mt-20">
      <h1 className="text-xl font-extrabold mb-2">이름을 입력해주세요</h1>
      <p className="text-gray text-sm mb-6">학습 진도와 AI 튜터 대화를 저장하는 데 사용돼요.</p>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          required
          placeholder="이름"
          className="field-input mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-crimson text-white rounded-xl py-3 font-bold disabled:opacity-50"
        >
          {loading ? '입장 중...' : '입장하기'}
        </button>
        {error && <p className="text-crimson text-sm mt-2">{error}</p>}
      </form>
    </main>
  );
}
