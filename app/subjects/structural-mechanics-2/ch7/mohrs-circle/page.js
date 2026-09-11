import MohrsCircle from '@/components/calculators/MohrsCircle';

export default function MohrsCirclePage() {
  return (
    <main>
      <header className="bg-white border-b border-line px-10 py-5 flex justify-between items-center">
        <div className="font-extrabold text-lg">구조역학 2 — Ch7. Mohr's Circle</div>
      </header>
      <MohrsCircle />
    </main>
  );
}
