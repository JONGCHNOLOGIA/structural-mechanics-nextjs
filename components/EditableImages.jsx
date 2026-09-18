'use client';

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from './UserProvider';
import { useSiteContent } from './SiteContentProvider';

const BUCKET = 'content-images';
const MAX_IMAGES = 2;

// SECTIONS 목록에서 소주제에 마우스를 올리면 나타나는 미리보기 이미지(최대 2장) 편집 컴포넌트.
// EditableText와 같은 패턴 — 실제 파일은 Supabase Storage(content-images 버킷)에 올리고,
// 그 공개 URL만 site_content에 키(`${contentKeyBase}.1`, `.2`)로 저장한다.
// 업로드 버튼은 canEditContent(관리자)에게만 항상 보이고, 이미지 자체는 부모 .subtopic:hover일
// 때만 보이도록 CSS(.subtopic-preview-imgs)로 감춰둔다.
export default function EditableImages({ contentKeyBase, className }) {
  const { canEditContent } = useUser();
  const { content, setLocal } = useSiteContent();
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [error, setError] = useState('');
  const fileInputs = useRef([]);

  const urls = Array.from({ length: MAX_IMAGES }, (_, i) => content[`${contentKeyBase}.${i + 1}`]).filter(Boolean);

  async function handleFile(index, file) {
    if (!file) return;
    setUploadingIndex(index);
    setError('');
    const ext = file.name.split('.').pop() || 'png';
    const path = `${contentKeyBase.replace(/\./g, '-')}-${index + 1}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (uploadError) {
      setUploadingIndex(null);
      setError('업로드에 실패했어요. 다시 시도해주세요.');
      return;
    }
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const key = `${contentKeyBase}.${index + 1}`;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { error: upsertError } = await supabase
      .from('site_content')
      .upsert({ key, value: data.publicUrl, updated_by: session?.user?.id });
    setUploadingIndex(null);
    if (upsertError) {
      setError('저장에 실패했어요. 다시 시도해주세요.');
      return;
    }
    setLocal(key, data.publicUrl);
  }

  async function handleRemove(index) {
    const key = `${contentKeyBase}.${index + 1}`;
    await supabase.from('site_content').upsert({ key, value: '' });
    setLocal(key, '');
  }

  if (!canEditContent && urls.length === 0) return null;

  return (
    <div className={className}>
      {canEditContent && (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: urls.length ? 8 : 0 }}
        >
          {Array.from({ length: MAX_IMAGES }).map((_, i) => {
            const key = `${contentKeyBase}.${i + 1}`;
            const url = content[key];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {url && <img src={url} alt="" style={{ width: 28, height: 28, objectFit: 'cover', border: '1px solid var(--line)' }} />}
                <input
                  ref={(el) => (fileInputs.current[i] = el)}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFile(i, e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInputs.current[i]?.click()}
                  disabled={uploadingIndex === i}
                  style={{
                    fontSize: 11,
                    padding: '4px 9px',
                    border: '1px solid var(--line)',
                    background: 'var(--card)',
                    color: 'var(--gray)',
                    cursor: 'pointer',
                  }}
                >
                  {uploadingIndex === i ? '업로드 중...' : `이미지 ${i + 1} ${url ? '변경' : '추가'}`}
                </button>
                {url && (
                  <button
                    type="button"
                    onClick={() => handleRemove(i)}
                    style={{ fontSize: 11, color: 'var(--gray-soft)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    삭제
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {error && <p style={{ fontSize: 11, color: 'var(--crimson)', marginBottom: 6 }}>{error}</p>}
      {urls.length > 0 && (
        <div className="subtopic-preview-imgs">
          {urls.map((u, i) => (
            <img key={i} src={u} alt="" />
          ))}
        </div>
      )}
    </div>
  );
}
