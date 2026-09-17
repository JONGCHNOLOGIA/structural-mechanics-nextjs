'use client';

import EditableText from '@/components/EditableText';

const INSTAGRAM_URL = 'https://www.instagram.com/sejong_archi_eng/';
const ARCHENG_URL = 'https://dept.sejong.ac.kr/archeng/index.do';

const POLICY_LINKS = [
  { label: '개인정보처리방침', href: 'https://www.sejong.ac.kr/kor/etc/privacy-policy.do' },
  { label: '이메일무단수집거부', href: 'https://www.sejong.ac.kr/kor/etc/email-policy.do' },
  { label: '규정공고', href: 'https://www.sejong.ac.kr/kor/intro/regulation-overview.do' },
  { label: '예·결산공고', href: 'https://www.sejong.ac.kr/kor/intro/budget-announcement.do' },
  { label: '대학정보공시', href: 'https://www.academyinfo.go.kr/pubinfo/pubinfo1600/doInit.do?schlId=0000138' },
];

// 건축공학과 홈페이지(dept.sejong.ac.kr/archeng) 푸터 레퍼런스 — 원래는 "대학/대학원 바로가기"·
// "관련사이트 바로가기"가 드롭다운 메뉴였지만, 여기서는 화살표 자리에 아이콘을 넣어 각각
// 인스타그램/건축공학과 사이트로 바로 연결되는 단일 링크로 단순화했다.
// 주소·전화·이메일은 관리자(EditableText)가 나중에 우리 프로젝트 정보로 바꿀 수 있게 해뒀고,
// 지금은 우선 레퍼런스 내용을 그대로 채워둔 상태.
export default function SiteFooter() {
  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <footer className="site-footer">
      <div className="footer-top">
        <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="footer-quicklink">
          <span>건축공학과 인스타그램 바로가기</span>
          <span className="footer-quicklink-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="3" width="18" height="18" rx="5" />
              <circle cx="12" cy="12" r="4.2" />
              <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
            </svg>
          </span>
        </a>
        <a href={ARCHENG_URL} target="_blank" rel="noopener noreferrer" className="footer-quicklink">
          <span>건축공학과 사이트 바로가기</span>
          <img src="/brand/sejong-emblem-white.png" alt="" className="footer-quicklink-icon-plain" />
        </a>
        <button type="button" className="footer-back-top" onClick={scrollToTop} aria-label="맨 위로">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        </button>
      </div>

      <div className="footer-bottom">
        <div className="footer-bottom-inner">
          <div className="footer-logo">
            <img src="/brand/sejong-archeng-logo-white.png" alt="세종대학교 건축공학과" className="footer-logo-img-wide" />
          </div>

          <ul className="footer-info">
            <li>
              <b>주소 :</b>
              <EditableText as="span" contentKey="footer.address" defaultText="05006 서울특별시 광진구 능동로 209(군자동) 세종대학교" />
            </li>
            <li>
              <b>전화번호 :</b>
              <EditableText as="span" contentKey="footer.tel" defaultText="02-3408-3114" />
            </li>
            <li>
              <b>이메일 :</b>
              <EditableText as="span" contentKey="footer.email" defaultText="webmaster@sejong.ac.kr" />
            </li>
          </ul>

          <div className="footer-divider" />

          <div className="footer-bottom-row">
            <ul className="footer-policy-list">
              {POLICY_LINKS.map((p) => (
                <li key={p.label}>
                  <a href={p.href} target="_blank" rel="noopener noreferrer">
                    {p.label}
                  </a>
                </li>
              ))}
            </ul>
            <div className="footer-copyright">COPYRIGHT 2025 SEJONG UNIVERSITY. ALL RIGHTS RESERVED.</div>
          </div>
        </div>
      </div>
    </footer>
  );
}
