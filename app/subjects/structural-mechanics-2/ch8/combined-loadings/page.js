import CombinedLoadings from '@/components/calculators/CombinedLoadings';

export default function CombinedLoadingsPage() {
  return (
    <main>
      <header className="bg-white border-b border-line px-10 py-5 flex justify-between items-center">
        <div className="font-extrabold text-lg">구조역학 2 — Ch8. Combined Loadings</div>
      </header>
      <CombinedLoadings />
    </main>
  );
}
