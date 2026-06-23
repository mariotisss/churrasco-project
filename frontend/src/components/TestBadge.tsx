/** Marks a sandbox edition: one that never counts towards the all-time ranking. */
export default function TestBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 font-condensed text-xs font-bold uppercase tracking-wider text-sky-300 ${className}`}
      title="Edición de prueba: no cuenta para la clasificación histórica"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
      Prueba
    </span>
  );
}
