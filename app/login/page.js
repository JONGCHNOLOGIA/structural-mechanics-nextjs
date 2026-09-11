'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="max-w-md mx-auto p-10 mt-20">
      <h1 className="text-xl font-extrabold mb-6">로그인</h1>
      {sent ? (
        <p className="text-gray">이메일로 로그인 링크를 보냈어요. 메일함을 확인해주세요.</p>
      ) : (
        <form onSubmit={handleLogin}>
          <input
            type="email"
            required
            placeholder="학교 이메일"
            className="field-input mb-3"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button type="submit" className="w-full bg-crimson text-white rounded-xl py-3 font-bold">
            로그인 링크 받기
          </button>
          {error && <p className="text-crimson text-sm mt-2">{error}</p>}
        </form>
      )}
    </main>
  );
}
