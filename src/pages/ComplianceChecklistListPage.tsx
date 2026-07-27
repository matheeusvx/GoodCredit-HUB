import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ComplianceChecklistDuplicateDialog } from "../components/compliance-checklist/ComplianceChecklistDuplicateDialog";
import { ComplianceChecklistEmptyState } from "../components/compliance-checklist/ComplianceChecklistEmptyState";
import { ComplianceChecklistListFilters } from "../components/compliance-checklist/ComplianceChecklistListFilters";
import { ComplianceChecklistListHeader } from "../components/compliance-checklist/ComplianceChecklistListHeader";
import { ComplianceChecklistMetrics } from "../components/compliance-checklist/ComplianceChecklistMetrics";
import { ComplianceChecklistPagination } from "../components/compliance-checklist/ComplianceChecklistPagination";
import { ComplianceChecklistRecords } from "../components/compliance-checklist/ComplianceChecklistRecords";
import { LocalChecklistMigrationCard } from "../components/compliance-checklist/LocalChecklistMigrationCard";
import { useComplianceChecklists } from "../hooks/useComplianceChecklists";
import { generateComplianceChecklistPdf } from "../lib/compliance-checklist/complianceChecklistPdf";
import {
  complianceChecklistEditorPath,
  navigateComplianceChecklist
} from "../lib/compliance-checklist/complianceChecklistNavigation";
import { calculateComplianceChecklistSummary } from "../lib/compliance-checklist/complianceChecklistSummary";
import {
  getLegacyComplianceChecklistMigrationId,
  markLegacyComplianceChecklistMigrated,
  readLegacyComplianceChecklist,
  removeLegacyComplianceChecklist
} from "../lib/compliance-checklist/complianceChecklistStorage";
import {
  archiveComplianceChecklist,
  duplicateComplianceChecklist,
  getComplianceChecklistById,
  importLocalComplianceChecklist,
  restoreComplianceChecklist
} from "../services/complianceChecklistService";
import type {
  ComplianceChecklistDuplicateOptions,
  ComplianceChecklistListFilters as Filters,
  ComplianceChecklistRecord,
  ComplianceChecklistState
} from "../types/complianceChecklist";

export const DEFAULT_COMPLIANCE_LIST_FILTERS: Filters = {
  search: "",
  status: "ALL",
  analystName: "",
  startDate: "",
  endDate: "",
  archive: "ACTIVE",
  sort: "UPDATED_DESC",
  page: 1,
  pageSize: 10
};

export function ComplianceChecklistListPage() {
  const { user, signOut } = useAuth();
  const [filters, setFilters] = useState(DEFAULT_COMPLIANCE_LIST_FILTERS);
  const { records, metrics, analysts, total, loading, error, refresh } =
    useComplianceChecklists(filters);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [duplicateRecord, setDuplicateRecord] =
    useState<ComplianceChecklistRecord | null>(null);
  const [legacyState, setLegacyState] = useState<ComplianceChecklistState | null>(
    () => readLegacyComplianceChecklist(localStorage)
  );
  const [importing, setImporting] = useState(false);

  const hasFilters =
    Boolean(filters.search) ||
    filters.status !== "ALL" ||
    Boolean(filters.analystName) ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate) ||
    filters.archive !== "ACTIVE";

  function updateFilters(patch: Partial<Filters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  async function handlePdf(record: ComplianceChecklistRecord) {
    setBusyId(record.id);
    setNotice("");
    try {
      const detail = await getComplianceChecklistById(record.id);
      const summary = calculateComplianceChecklistSummary(detail.state.items);
      await generateComplianceChecklistPdf(detail.state, summary, false, {
        checklistId: detail.record.id,
        createdByLabel: detail.record.createdByLabel,
        updatedByLabel: detail.record.updatedByLabel,
        createdAt: detail.record.createdAt,
        updatedAt: detail.record.updatedAt
      });
      setNotice("PDF gerado com os dados salvos.");
    } catch {
      setNotice("Não foi possível gerar o PDF deste checklist.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchive(record: ComplianceChecklistRecord) {
    if (
      !window.confirm(
        "Deseja arquivar este checklist? O registro continuará disponível no histórico."
      )
    ) {
      return;
    }
    setBusyId(record.id);
    try {
      await archiveComplianceChecklist(record.id);
      setNotice("Checklist arquivado.");
      refresh();
    } catch {
      setNotice("Não foi possível arquivar o checklist.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRestore(record: ComplianceChecklistRecord) {
    setBusyId(record.id);
    try {
      await restoreComplianceChecklist(record.id);
      setNotice("Checklist restaurado.");
      refresh();
    } catch {
      setNotice("Não foi possível restaurar o checklist.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(options: ComplianceChecklistDuplicateOptions) {
    if (!duplicateRecord) return;
    const source = duplicateRecord;
    setDuplicateRecord(null);
    setBusyId(source.id);
    try {
      const id = await duplicateComplianceChecklist(source.id, options);
      navigateComplianceChecklist(complianceChecklistEditorPath(id));
    } catch {
      setNotice("Não foi possível duplicar o checklist.");
      setBusyId(null);
    }
  }

  async function handleImportLocal() {
    if (!legacyState?.clientName.trim()) {
      setNotice("Informe o nome do cliente no checklist local antes de importá-lo.");
      return;
    }
    setImporting(true);
    try {
      const migrationId = getLegacyComplianceChecklistMigrationId(localStorage);
      const id = await importLocalComplianceChecklist(legacyState, migrationId);
      markLegacyComplianceChecklistMigrated(localStorage);
      setLegacyState(null);
      navigateComplianceChecklist(complianceChecklistEditorPath(id));
    } catch {
      setNotice("Não foi possível importar o checklist local. Tente novamente.");
    } finally {
      setImporting(false);
    }
  }

  function handleRemoveLocal() {
    if (!window.confirm("Deseja remover os dados locais deste checklist?")) return;
    removeLegacyComplianceChecklist(localStorage);
    setLegacyState(null);
    setNotice("Os dados locais foram removidos.");
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <ComplianceChecklistListHeader
        userLabel={user?.email ?? "Usuário autenticado"}
        refreshing={loading}
        onNew={() => navigateComplianceChecklist("/checklist-conformidade/novo")}
        onRefresh={refresh}
        onSignOut={() => void signOut()}
      />
      <main className="mx-auto flex max-w-[1700px] flex-col gap-5 px-4 py-6 sm:px-6 xl:px-8">
        <div aria-live="polite">
          {(notice || error) && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                error || notice.startsWith("Não")
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-goodgreen-200 bg-goodgreen-50 text-goodgreen-800"
              }`}
            >
              {error || notice}
            </div>
          )}
        </div>

        {legacyState && (
          <LocalChecklistMigrationCard
            state={legacyState}
            importing={importing}
            onImport={() => void handleImportLocal()}
            onIgnore={() => setLegacyState(null)}
            onRemove={handleRemoveLocal}
          />
        )}

        <ComplianceChecklistMetrics metrics={metrics} />
        <ComplianceChecklistListFilters
          filters={filters}
          analysts={analysts}
          onChange={updateFilters}
          onClear={() => setFilters(DEFAULT_COMPLIANCE_LIST_FILTERS)}
        />

        {loading && records.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Carregando checklists...
          </div>
        ) : records.length === 0 ? (
          <ComplianceChecklistEmptyState
            filtered={hasFilters}
            onNew={() => navigateComplianceChecklist("/checklist-conformidade/novo")}
            onClearFilters={() => setFilters(DEFAULT_COMPLIANCE_LIST_FILTERS)}
          />
        ) : (
          <>
            <ComplianceChecklistRecords
              records={records}
              busyId={busyId}
              onOpen={(record) =>
                navigateComplianceChecklist(complianceChecklistEditorPath(record.id))
              }
              onPdf={(record) => void handlePdf(record)}
              onDuplicate={setDuplicateRecord}
              onArchive={(record) => void handleArchive(record)}
              onRestore={(record) => void handleRestore(record)}
            />
            <ComplianceChecklistPagination
              page={filters.page}
              pageSize={filters.pageSize}
              total={total}
              onPageChange={(page) => updateFilters({ page })}
              onPageSizeChange={(pageSize) =>
                updateFilters({ pageSize, page: 1 })
              }
            />
          </>
        )}
      </main>

      {duplicateRecord && (
        <ComplianceChecklistDuplicateDialog
          clientName={duplicateRecord.clientName}
          onClose={() => setDuplicateRecord(null)}
          onConfirm={(options) => void handleDuplicate(options)}
        />
      )}
    </div>
  );
}
