'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from './UserProvider';
import { useSiteContent } from './SiteContentProvider';

// EditableText와 같은 구조로, site_content에 텍스트 대신 YouTube 링크를 저장해서
// 과목 카드 등에 소개 영상을 관리자(canEditContent)만 붙이거나 바꿀 수 있게 해주는 컴포넌트.
function extractYouTubeId(url) {
  const m = String(url ?? '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  return m ? m[1] : null;
}

export default function EditableVideo({ contentKey, style }) {
  const { canEditContent } = useUser();
  const { content, setLocal } = useSiteContent();
  const url = content[contentKey] ?? '';
  const embedId = extractYouTubeId(url);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(url);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function startEditing(e) {
    e.preventDefault();
    e.stopPropagation();
    setDraft(url);
    setError('');
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { error: upsertError } = await supabase
      .from('site_content')
      .upsert({ key: contentKey, value: draft.trim(), updated_by: session?.user?.id });
    setSaving(false);
    if (upsertError) {
      setError('저장에 실패했어요. 다시 시도해주세요.');
      return;
    }
    setLocal(contentKey, draft.trim());
    setEditing(false);
  }

  if (editing) {
    return (
      <div style={{ margin: '4px 0', ...style }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
          style={{
            width: '100%',
            fontSize: 13,
            fontFamily: 'inherit',
            padding: '8px 10px',
            borderRadius: 0,
            border: '1px solid var(--line)',
          }}
        />
        {error && <p style={{ color: 'var(--crimson)', fontSize: 12, marginTop: 4 }}>{error}</p>}
        <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
          <button className="add-block active" style={{ margin: 0 }} onClick={handleSave} disabled={saving}>
            {saving ? '저장 중...' : '저장'}
          </button>
          <button className="add-block" style={{ margin: 0 }} onClick={() => setEditing(false)}>
            취소
          </button>
        </div>
      </div>
    );
  }

  if (!embedId) {
    if (!canEditContent) return null;
    return (
      <div
        style={{
          border: '1.5px dashed var(--line)',
          borderRadius: 0,
          padding: '14px 16px',
          fontSize: 12.5,
          color: 'var(--gray-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          ...style,
        }}
      >
        <span>{url ? '유효한 YouTube 링크가 아니에요.' : '소개 영상 링크를 추가해보세요.'}</span>
        <button onClick={startEditing} className="add-block" style={{ margin: 0, flexShrink: 0 }}>
          영상 링크 {url ? '수정' : '추가'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', ...style }}>
      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: 0, overflow: 'hidden', background: '#000' }}>
        <iframe
          src={`https://www.youtube.com/embed/${embedId}`}
          title="소개 영상"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
        />
      </div>
      {canEditContent && (
        <button
          onClick={startEditing}
          title="영상 링크 수정하기"
          style={{
            marginTop: 6,
            fontSize: 11,
            color: 'var(--gray-soft)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ✎ 영상 링크 수정
        </button>
      )}
    </div>
  );
}
