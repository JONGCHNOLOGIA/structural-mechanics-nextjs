'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from './UserProvider';

// 사이트 여기저기 흩어진 짧은 설명 문구를 코드 수정 없이 관리자(instructor) 계정에서
// 직접 고칠 수 있게 해주는 컴포넌트. contentKey로 Supabase site_content 테이블에서
// 커스텀 값을 읽어오고, 없으면 defaultText를 그대로 보여준다.
export default function EditableText({ contentKey, defaultText, as: Tag = 'p', style, className }) {
  const { isAdmin } = useUser();
  const [text, setText] = useState(defaultText);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(defaultText);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('site_content').select('value').eq('key', contentKey).maybeSingle();
      if (!cancelled && data?.value) {
        setText(data.value);
        setDraft(data.value);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contentKey]);

  async function handleSave() {
    setSaving(true);
    setError('');
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { error: upsertError } = await supabase
      .from('site_content')
      .upsert({ key: contentKey, value: draft, updated_by: session?.user?.id });
    setSaving(false);
    if (upsertError) {
      setError('저장에 실패했어요. 다시 시도해주세요.');
      return;
    }
    setText(draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <div style={{ margin: '4px 0' }}>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            maxWidth: 520,
            fontSize: 14,
            fontFamily: 'inherit',
            padding: 10,
            borderRadius: 8,
            border: '1px solid var(--line)',
            resize: 'vertical',
          }}
        />
        {error && <p style={{ color: 'var(--crimson)', fontSize: 12, marginTop: 4 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button className="add-block active" style={{ margin: 0 }} onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
          <button
            className="add-block"
            style={{ margin: 0 }}
            onClick={() => {
              setDraft(text);
              setError('');
              setEditing(false);
            }}
          >
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <Tag className={className} style={style}>
      {text}
      {isAdmin && (
        <button
          onClick={() => setEditing(true)}
          title="이 설명 수정하기 (관리자 전용)"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
            marginLeft: 8,
            verticalAlign: 'middle',
            borderRadius: '50%',
            border: '1px solid var(--line)',
            background: 'var(--card)',
            color: 'var(--gray-soft)',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          ✎
        </button>
      )}
    </Tag>
  );
}
