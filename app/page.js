import Link from 'next/link';

// TODO: 프로토타입 HTML의 chapters 배열 + renderChapters()/renderSubtopics()를
// 그대로 이 페이지의 데이터/컴포넌트로 옮기면 됨 (구조는 동일, JSX 문법만 다름)
export default function HomePage() {
  return (
    <main className="max-w-[1200px] mx-auto p-10">
      <h1 className="text-2xl font-extrabold mb-4">구조역학 2</h1>
      <p className="text-gray mb-8">
        이 페이지는 자리만 잡아둔 상태예요. 프로토타입의 챕터/소주제 목록 UI를 그대로 옮기면 됩니다.
      </p>
      <Link
        href="/subjects/structural-mechanics-2/ch6/composite-beams"
        className="inline-block bg-crimson text-white rounded-xl px-5 py-3 font-bold"
      >
        Composite Beams 계산기 열어보기 (포팅 완료) →
      </Link>
    </main>
  );
}
