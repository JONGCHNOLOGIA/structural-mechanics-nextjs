import FGM from '@/components/calculators/FGM';

export default function FGMPage() {
  return (
    <main>
      <header className="bg-white border-b border-line px-10 py-5 flex justify-between items-center">
        <div className="font-extrabold text-lg">구조역학 2 — Ch6. Functionally Graded Beams</div>
      </header>
      <FGM />
    </main>
  );
}
