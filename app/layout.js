import './globals.css';
import UserProvider from '@/components/UserProvider';
import SiteContentProvider from '@/components/SiteContentProvider';
import SettingsProvider from '@/components/SettingsProvider';

export const metadata = {
  title: '구조역학 2 — 세종대학교 건축공학과',
  description: 'AI 튜터 기반 구조역학 학습 사이트',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <SiteContentProvider>
          <UserProvider>
            <SettingsProvider>{children}</SettingsProvider>
          </UserProvider>
        </SiteContentProvider>
      </body>
    </html>
  );
}
