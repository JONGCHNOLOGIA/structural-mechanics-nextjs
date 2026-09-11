import './globals.css';

export const metadata = {
  title: '구조역학 2 — 세종대학교 건축공학과',
  description: 'AI 튜터 기반 구조역학 학습 사이트',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="pb-14">
        {children}
        <div className="fixed bottom-0 left-0 right-0 bg-gray text-white text-center text-[13px] font-bold py-3.5 z-20">
          세종대학교 건축공학과 AI 튜터 사이트
        </div>
      </body>
    </html>
  );
}
