// 공식 안의 분수(a/b)를 실제 분자/분모가 위아래로 쌓인 형태로 보여주는 인라인 컴포넌트.
// step-formula(수식) 안에서 currentColor/em 단위를 써서 주변 글자 색·크기에 자연스럽게 맞춰진다.
export default function Frac({ num, den }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        verticalAlign: 'middle',
        margin: '0 3px',
        lineHeight: 1.15,
        fontSize: '0.86em',
      }}
    >
      <span style={{ padding: '0 2px', borderBottom: '1.3px solid currentColor' }}>{num}</span>
      <span style={{ padding: '0 2px' }}>{den}</span>
    </span>
  );
}
