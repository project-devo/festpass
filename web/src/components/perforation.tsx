// Dashed tear line with half-circle notches on both edges, like a paper ticket
export function Perforation({ notchClass = "bg-white" }: { notchClass?: string }) {
  return (
    <div aria-hidden className="relative h-0 border-t-2 border-dashed border-zinc-200">
      <span className={`absolute -left-3 -top-3 size-6 rounded-full border border-zinc-200 ${notchClass} [clip-path:inset(0_0_0_50%)]`} />
      <span className={`absolute -right-3 -top-3 size-6 rounded-full border border-zinc-200 ${notchClass} [clip-path:inset(0_50%_0_0)]`} />
    </div>
  );
}
