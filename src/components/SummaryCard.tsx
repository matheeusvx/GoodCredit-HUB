interface SummaryCardProps {
  label: string;
  value: string;
  detail?: string;
  tone?: "green" | "blue" | "slate";
}

export function SummaryCard({ label, value, detail, tone = "slate" }: SummaryCardProps) {
  const toneClass = {
    green: "border-goodgreen-100 bg-goodgreen-50 text-goodgreen-700",
    blue: "border-goodblue-100 bg-goodblue-50 text-goodblue-700",
    slate: "border-slate-200 bg-white text-slate-900"
  }[tone];

  return (
    <article className={`rounded-lg border p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-bold uppercase tracking-wide opacity-75">{label}</p>
      <p className="mt-2 text-xl font-bold">{value}</p>
      {detail && <p className="mt-1 text-xs opacity-75">{detail}</p>}
    </article>
  );
}
