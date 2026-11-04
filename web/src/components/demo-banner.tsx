// Goal 15: a thin strip above the top bar so nobody mistakes the demo for a real fest
export function DemoBanner() {
  return (
    <div className="bg-indigo-600 px-4 py-1.5 text-center text-xs font-medium text-white">
      Demo deployment with seeded data. No real passes or payments.
    </div>
  );
}
