// 휴대폰 카메라로 찍은 풀이 사진은 용량이 커서(수 MB) 그대로 API에 보내면 느리고, Vercel
// 서버리스 함수의 요청 크기 제한에도 걸릴 수 있음. 업로드 즉시 캔버스로 리사이즈·재압축해서
// base64로 반환한다 — AI가 글씨를 읽는 데는 이 정도 해상도로 충분함.
export function fileToResizedBase64(file, { maxDim = 1400, quality = 0.82 } = {}) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('이미지 변환에 실패했어요.'));
            return;
          }
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            const match = /^data:(.*);base64,(.*)$/.exec(result);
            if (!match) {
              reject(new Error('이미지 변환에 실패했어요.'));
              return;
            }
            resolve({ mediaType: match[1], data: match[2] });
          };
          reader.onerror = () => reject(new Error('이미지 변환에 실패했어요.'));
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 열 수 없어요.'));
    };
    img.src = objectUrl;
  });
}
