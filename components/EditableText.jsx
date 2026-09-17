'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from './UserProvider';
import { useSiteContent } from './SiteContentProvider';

// 사이트 여기저기 흩어진 고정 문구(AI 응답이나 계산 결과처럼 코드로 계산되는 값은 제외)를
// 코드 수정 없이 직접 고칠 수 있게 해주는 컴포넌트. 편집 권한은 role='instructor' 전체가 아니라
// UserProvider의 canEditContent(정해진 학번들: 22011031, demo-admin)로 한정됨.
// contentKey로 SiteContentProvider가 미리 불러온 site_content 맵에서 커스텀 값을 찾고,
// 없으면 defaultText를 그대로 보여준다.
// **굵게** 마크다운 문법을 <b>로 렌더링해서, 원래 <b> 태그로 강조돼 있던 문구도
// 서식을 잃지 않고 편집할 수 있게 함 (편집창에는 **...** 그대로 보임).
function renderFormatted(text) {
  const parts = String(text ?? '').split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <b key={i}>{part.slice(2, -2)}</b>;
    }
    return <span key={i}>{part}</span>;
  });
}

export default function EditableText({ contentKey, defaultText, as: Tag = 'p', style, className }) {
  const { canEditContent } = useUser();
  const { content, setLocal } = useSiteContent();
  const text = content[contentKey] ?? defaultText;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function startEditing() {
    setDraft(text);
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
      .upsert({ key: contentKey, value: draft, updated_by: session?.user?.id });
    setSaving(false);
    if (upsertError) {
      setError('저장에 실패했어요. 다시 시도해주세요.');
      return;
    }
    setLocal(contentKey, draft);
    setEditing(false);
  }

  if (editing) {
    return (
      <div
        style={{ margin: '4px 0' }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
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
            borderRadius: 0,
            border: '1px solid var(--line)',
            resize: 'vertical',
          }}
        />
        <p style={{ fontSize: 11, color: 'var(--gray-soft)', marginTop: 4 }}>강조하고 싶은 부분은 **이렇게** 별표 두 개로 감싸면 굵게 표시돼요.</p>
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

  return (
    <Tag className={className} style={style}>
      {renderFormatted(text)}
      {canEditContent && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            startEditing();
          }}
          title="이 문구 수정하기"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 18,
            height: 18,
            marginLeft: 6,
            verticalAlign: 'middle',
            borderRadius: '50%',
            border: '1px solid var(--line)',
            background: 'var(--card)',
            color: 'var(--gray-soft)',
            fontSize: 10,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ✎
        </button>
      )}
    </Tag>
  );
}
