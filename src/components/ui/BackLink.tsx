import { ArrowLeft } from "lucide-react";

/** A way back to the parent screen, drawn as the top line of the PageHeader that follows it. */
export function BackLink({ label, onClick, maxWidth = "max-w-[1700px]" }: { label: string; onClick: () => void; maxWidth?: string }) {
  return (
    <div className="bg-white">
      <div className={`mx-auto ${maxWidth} px-4 pt-4 sm:px-6 xl:px-8`}>
        <button
          type="button"
          onClick={onClick}
          className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-medium text-ink-muted transition-colors hover:bg-slate-50 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-400/60"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          {label}
        </button>
      </div>
    </div>
  );
}
