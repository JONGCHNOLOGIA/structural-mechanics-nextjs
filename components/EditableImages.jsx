'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from './UserProvider';
import { useSiteContent } from './SiteContentProvider';

const BUCKET = 'content-images';
const MAX_IMAGES = 2;

// 같은 슬롯에 이미지(jpg/png/gif)와 영상(mp4/webm)을 둘 다 올릴 수 있게 했다.
// 저장되는 값은 어느 쪽이든 공개 URL 하나라, 화면에 그릴 때 확장자로 구분해서
// <img> 또는 <video>로 렌더링한다. (GIF는 같은 화질에서 mp4보다 10배쯤 무거워서,
//  긴 화면 녹화는 mp4로 올리는 쪽이 훨씬 가볍다)
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|$)/i;
function isVideoUrl(url) {
  return VIDEO_EXT.test(String(url || ''));
}

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
  const uid = useId();
  const previewRef = useRef(null);

  const urls = Array.from({ length: MAX_IMAGES }, (_, i) => content[`${contentKeyBase}.${i + 1}`]).filter(Boolean);

  // 미리보기 칸은 마우스를 올리기 전까지 CSS로 display:none이라, 그 동안에는 브라우저가
  // autoPlay를 아예 시작하지 않는다(화면에 없는 영상은 재생하지 않는 절전 동작).
  // 칸이 실제로 나타나는 순간을 IntersectionObserver로 잡아서 한 번 더 play()를 눌러준다.
  // muted라 자동재생 정책에 걸리지 않으므로 이 호출은 조용히 성공한다.
  useEffect(() => {
    const root = previewRef.current;
    if (!root) return undefined;
    const videos = Array.from(root.querySelectorAll('video'));
    if (videos.length === 0) return undefined;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.play().catch(() => {});
      });
    });
    videos.forEach((v) => io.observe(v));
    return () => io.disconnect();
  }, [urls.join('|')]);

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
            // label의 파일창 열기 네이티브 동작이 살아있어야 하므로 preventDefault는 걸지 않음 —
            // .subtopic 행의 라우팅 클릭으로 번지는 것만 막으면 됨.
            e.stopPropagation();
          }}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: urls.length ? 8 : 0,
          }}
        >
          {Array.from({ length: MAX_IMAGES }).map((_, i) => {
            const key = `${contentKeyBase}.${i + 1}`;
            const url = content[key];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {url &&
                  (isVideoUrl(url) ? (
                    <video src={url} muted playsInline preload="metadata" style={{ width: 28, height: 28, objectFit: 'cover', border: '1px solid var(--line)' }} />
                  ) : (
                    <img src={url} alt="" style={{ width: 28, height: 28, objectFit: 'cover', border: '1px solid var(--line)' }} />
                  ))}
                <input
                  id={`${uid}-${i}`}
                  type="file"
                  accept="image/*,video/mp4,video/webm"
                  style={{
                    position: 'absolute',
                    width: 1,
                    height: 1,
                    padding: 0,
                    margin: -1,
                    overflow: 'hidden',
                    clip: 'rect(0,0,0,0)',
                    whiteSpace: 'nowrap',
                    border: 0,
                  }}
                  onChange={(e) => handleFile(i, e.target.files?.[0])}
                />
                {/* button 대신 input과 직접 연결된 label을 씀 — JS로 입력창에 .click()을
                    대신 걸어주는 방식은 일부 환경에서 브라우저가 "진짜 사용자 클릭"으로 안 쳐줘서
                    파일 선택창이 안 열리는 경우가 있었음. label 클릭은 브라우저가 직접 처리하는
                    네이티브 동작이라 이 문제가 아예 생기지 않음. */}
                <label
                  htmlFor={`${uid}-${i}`}
                  aria-disabled={uploadingIndex === i}
                  style={{
                    fontSize: 11,
                    padding: '4px 9px',
                    border: '1px solid var(--line)',
                    background: 'var(--card)',
                    color: 'var(--gray)',
                    cursor: uploadingIndex === i ? 'default' : 'pointer',
                    opacity: uploadingIndex === i ? 0.6 : 1,
                    pointerEvents: uploadingIndex === i ? 'none' : 'auto',
                    display: 'inline-block',
                  }}
                >
                  {uploadingIndex === i ? '업로드 중...' : `이미지/영상 ${i + 1} ${url ? '변경' : '추가'}`}
                </label>
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
        <div className="subtopic-preview-imgs" ref={previewRef}>
          {urls.map((u, i) =>
            isVideoUrl(u) ? (
              // GIF처럼 소리 없이 저절로 반복 재생되게 — muted가 있어야 브라우저가 자동재생을 허용한다.
              // 미리보기는 마우스를 올려야 보이므로 preload는 metadata까지만 받아둔다.
              <video key={i} src={u} autoPlay loop muted playsInline preload="metadata" />
            ) : (
              <img key={i} src={u} alt="" loading="lazy" decoding="async" />
            )
          )}
        </div>
      )}
    </div>
  );
}
