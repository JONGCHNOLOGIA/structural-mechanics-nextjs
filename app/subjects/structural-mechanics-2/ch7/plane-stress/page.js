import PlaneStress from '@/components/calculators/PlaneStress';

export default function PlaneStressPage() {
  return (
    <main>
      <header className="bg-white border-b border-line px-10 py-5 flex justify-between items-center">
        <div className="font-extrabold text-lg">구조역학 2 — Ch7. Plane Stress</div>
      </header>
      <PlaneStress />
    </main>
  );
}
