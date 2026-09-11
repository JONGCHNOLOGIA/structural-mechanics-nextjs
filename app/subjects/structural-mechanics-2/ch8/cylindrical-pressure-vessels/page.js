import CylindricalVessel from '@/components/calculators/CylindricalVessel';

export default function CylindricalVesselPage() {
  return (
    <main>
      <header className="bg-white border-b border-line px-10 py-5 flex justify-between items-center">
        <div className="font-extrabold text-lg">구조역학 2 — Ch8. Cylindrical Pressure Vessels</div>
      </header>
      <CylindricalVessel />
    </main>
  );
}
