import { ChevronDown, Download, FileSpreadsheet, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { CrmDashboardResponse } from "../../../types/crmDashboard";

type ExportKind = "pdf" | "excel";

export function CrmExportMenu({ dashboard }: { dashboard: CrmDashboardResponse }) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState<ExportKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeWhenOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  async function exportReport(kind: ExportKind) {
    if (generating) return;
    setOpen(false);
    setGenerating(kind);
    setError(null);
    try {
      const report = await import("../../../lib/crm/reportExport");
      const model = report.createCrmReportModel(dashboard);
      if (kind === "excel") await report.downloadCrmExcelReport(model);
      else report.downloadCrmPdfReport(model);
    } catch {
      setError("Não foi possível gerar o relatório. Tente novamente.");
    } finally {
      setGenerating(null);
    }
  }

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-busy={Boolean(generating)}
        disabled={Boolean(generating)}
        onClick={() => setOpen((current) => !current)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500 disabled:cursor-wait disabled:opacity-65"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        {generating ? "Gerando..." : "Exportar"}
        {!generating && <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />}
      </button>

      {open && !generating && (
        <div
          role="menu"
          aria-label="Opções de exportação"
          className="absolute right-0 top-full z-30 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => void exportReport("pdf")}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500"
          >
            <FileText className="h-4 w-4 text-red-600" aria-hidden="true" />
            Relatório PDF
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => void exportReport("excel")}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goodgreen-500"
          >
            <FileSpreadsheet className="h-4 w-4 text-goodgreen-700" aria-hidden="true" />
            Planilha Excel
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 shadow-sm">
          {error}
        </p>
      )}
    </div>
  );
}
