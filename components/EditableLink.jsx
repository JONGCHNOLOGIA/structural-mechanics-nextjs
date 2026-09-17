'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from './UserProvider';
import { useSiteContent } from './SiteContentProvider';

// EditableText는 문구 하나만 고치지만, 푸터의 정책 링크처럼 "문구 + 연결 링크"를 함께
// 고쳐야 하는 곳에 씀. contentKey를 기준으로 `${contentKey}.label` / `${contentKey}.href`
// 두 개의 site_content 키를 따로 저장한다.
export default function EditableLink({ contentKey, defaultLabel, defaultHref, className, style }) {
  const { canEditContent } = useUser();
  const { content, setLocal } = useSiteContent();
  const labelKey = `${contentKey}.label`;
  const hrefKey = `${contentKey}.href`;
  const label = content[labelKey] ?? defaultLabel;
  const href = content[hrefKey] ?? defaultHref;

  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(label);
  const [draftHref, setDraftHref] = useState(href);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function startEditing() {
    setDraftLabel(label);
    setDraftHref(href);
    setError('');
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { error: upsertError } = await supabase.from('site_content').upsert([
      { key: labelKey, value: draftLabel, updated_by: session?.user?.id },
      { key: hrefKey, value: draftHref, updated_by: session?.user?.id },
    ]);
    setSaving(false);
    if (upsertError) {
      setError('저장에 실패했어요. 다시 시도해주세요.');
      return;
    }
    setLocal(labelKey, draftLabel);
    setLocal(hrefKey, draftHref);
    setEditing(false);
  }

  if (editing) {
    return (
      <span
        style={{
          display: 'inline-flex', flexDirection: 'column', gap: 6, background: '#111',
          border: '1px solid rgba(255,255,255,0.2)', padding: 10, minWidth: 220,
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <input
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          placeholder="메뉴 이름"
          style={{ fontSize: 12.5, padding: '6px 8px', border: '1px solid rgba(255,255,255,0.25)', background: '#000', color: '#fff' }}
        />
        <input
          value={draftHref}
          onChange={(e) => setDraftHref(e.target.value)}
          placeholder="https://..."
          style={{ fontSize: 12.5, padding: '6px 8px', border: '1px solid rgba(255,255,255,0.25)', background: '#000', color: '#fff' }}
        />
        {error && <span style={{ color: 'var(--crimson)', fontSize: 11 }}>{error}</span>}
        <span style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ fontSize: 11.5, fontWeight: 700, padding: '5px 12px', background: 'var(--crimson)', color: '#fff', border: 'none', cursor: 'pointer' }}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
          <button
            onClick={() => setEditing(false)}
            style={{ fontSize: 11.5, fontWeight: 700, padding: '5px 12px', background: 'transparent', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.25)', cursor: 'pointer' }}
          >
            취소
          </button>
        </span>
      </span>
    );
  }

  return (
    <span className={className} style={style}>
      <a href={href} target="_blank" rel="noopener noreferrer">
        {label}
      </a>
      {canEditContent && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startEditing();
          }}
          title="이 링크 수정하기"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 16,
            height: 16,
            marginLeft: 5,
            verticalAlign: 'middle',
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.3)',
            background: 'transparent',
            color: 'rgba(255,255,255,0.5)',
            fontSize: 9,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ✎
        </button>
      )}
    </span>
  );
}
