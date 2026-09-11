import HookesLaw from '@/components/calculators/HookesLaw';

export default function HookesLawPage() {
  return (
    <main>
      <header className="bg-white border-b border-line px-10 py-5 flex justify-between items-center">
        <div className="font-extrabold text-lg">구조역학 2 — Ch7. Hooke's Law for Plane Stress</div>
      </header>
      <HookesLaw />
    </main>
  );
}
