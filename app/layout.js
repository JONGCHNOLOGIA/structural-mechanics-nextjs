import './globals.css';
import UserProvider from '@/components/UserProvider';
import ProgressProvider from '@/components/ProgressProvider';
import SiteContentProvider from '@/components/SiteContentProvider';
import SettingsProvider from '@/components/SettingsProvider';
import SiteFooter from '@/components/SiteFooter';

export const metadata = {
  title: '세종대학교 건축공학과 공모전',
  description: 'AI 튜터 기반 구조역학 학습 사이트',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>
        <SiteContentProvider>
          <UserProvider>
            <ProgressProvider>
              <div className="app-main">
                <SettingsProvider>{children}</SettingsProvider>
              </div>
              <SiteFooter />
            </ProgressProvider>
          </UserProvider>
        </SiteContentProvider>
      </body>
    </html>
  );
}
