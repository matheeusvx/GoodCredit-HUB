import { useEffect, useMemo, useState } from "react";
import { ComplianceChecklistActions } from "../components/compliance-checklist/ComplianceChecklistActions";
import { ComplianceChecklistFilters } from "../components/compliance-checklist/ComplianceChecklistFilters";
import { ComplianceChecklistHeader } from "../components/compliance-checklist/ComplianceChecklistHeader";
import { ComplianceChecklistList } from "../components/compliance-checklist/ComplianceChecklistList";
import { ComplianceClientIdentification } from "../components/compliance-checklist/ComplianceClientIdentification";
import { ComplianceProgressSummary } from "../components/compliance-checklist/ComplianceProgressSummary";
import { COMPLIANCE_CHECKLIST_ITEMS } from "../data/complianceChecklistItems";
import { generateComplianceChecklistPdf } from "../lib/compliance-checklist/complianceChecklistPdf";
import {
  calculateComplianceChecklistSummary
} from "../lib/compliance-checklist/complianceChecklistSummary";
import {
  createNewComplianceChecklist,
  readComplianceChecklistState,
  resetComplianceChecklistItems,
  saveComplianceChecklistState
} from "../lib/compliance-checklist/complianceChecklistStorage";
import {
  ComplianceChecklistFilter,
  ComplianceChecklistItemState,
  ComplianceChecklistState,
  ComplianceChecklistStatus
} from "../types/complianceChecklist";

export function ComplianceChecklistPage() {
  const [state, setState] = useState<ComplianceChecklistState>(() =>
    readComplianceChecklistState(localStorage)
  );
  const [filter, setFilter] = useState<ComplianceChecklistFilter>("ALL");
  const [observationsOnly, setObservationsOnly] = useState(false);
  const [openObservations, setOpenObservations] = useState<Set<string>>(
    () => new Set()
  );
  const [notice, setNotice] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const summary = useMemo(
    () => calculateComplianceChecklistSummary(state.items),
    [state.items]
  );

  const visibleItems = useMemo(() => {
    const stateById = new Map(state.items.map((item) => [item.itemId, item]));
    return COMPLIANCE_CHECKLIST_ITEMS.map((definition) => ({
      definition,
      state:
        stateById.get(definition.id) ??
        ({
          itemId: definition.id,
          status: "PENDING",
          observation: "",
          updatedAt: null
        } satisfies ComplianceChecklistItemState)
    })).filter(({ state: item }) => {
      const matchesStatus = filter === "ALL" || item.status === filter;
      const matchesObservation = !observationsOnly || Boolean(item.observation.trim());
      return matchesStatus && matchesObservation;
    });
  }, [filter, observationsOnly, state.items]);

  useEffect(() => {
    saveComplianceChecklistState(localStorage, state);
  }, [state]);

  function updateState(patch: Partial<ComplianceChecklistState>) {
    setState((current) => ({
      ...current,
      ...patch,
      lastUpdatedAt: new Date().toISOString()
    }));
    setNotice("");
  }

  function updateItem(
    itemId: string,
    patch: Partial<ComplianceChecklistItemState>
  ) {
    const timestamp = new Date().toISOString();
    setState((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.itemId === itemId ? { ...item, ...patch, updatedAt: timestamp } : item
      ),
      lastUpdatedAt: timestamp
    }));
    setNotice("");
  }

  function handleStatusChange(itemId: string, status: ComplianceChecklistStatus) {
    updateItem(itemId, { status });
    if (status === "HAS_ISSUE") {
      setOpenObservations((current) => new Set(current).add(itemId));
    }
  }

  function toggleObservation(itemId: string) {
    setOpenObservations((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function removeObservation(itemId: string) {
    updateItem(itemId, { observation: "" });
    setOpenObservations((current) => {
      const next = new Set(current);
      next.delete(itemId);
      return next;
    });
  }

  function markAllCompliant() {
    if (!window.confirm("Deseja marcar todos os itens como conformes?")) return;
    const timestamp = new Date().toISOString();
    setState((current) => ({
      ...current,
      items: current.items.map((item) => ({
        ...item,
        status: "COMPLIANT",
        updatedAt: timestamp
      })),
      lastUpdatedAt: timestamp
    }));
    setNotice("Todos os itens foram marcados como conformes.");
  }

  function clearItems() {
    setState((current) => resetComplianceChecklistItems(current));
    setOpenObservations(new Set());
    setFilter("ALL");
    setObservationsOnly(false);
    setNotice("Status e observações foram limpos. A identificação foi mantida.");
  }

  function startNew() {
    setState(createNewComplianceChecklist());
    setOpenObservations(new Set());
    setFilter("ALL");
    setObservationsOnly(false);
    setNotice("Novo checklist iniciado.");
  }

  async function generatePdf() {
    if (!state.clientName.trim()) {
      setNotice("Informe o nome do cliente antes de gerar o relatório.");
      return;
    }

    let draft = false;
    if (summary.completed === 0) {
      const confirmed = window.confirm(
        "O checklist ainda não possui verificações concluídas. Deseja gerar um relatório em rascunho?"
      );
      if (!confirmed) return;
      draft = true;
    }

    setGeneratingPdf(true);
    setNotice("");
    try {
      await generateComplianceChecklistPdf(state, summary, draft);
      setNotice(
        draft
          ? "Relatório em rascunho gerado."
          : "Relatório do Checklist de Conformidade gerado."
      );
    } catch {
      setNotice("Não foi possível gerar o relatório. Tente novamente.");
    } finally {
      setGeneratingPdf(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <ComplianceChecklistHeader />

      <main className="mx-auto flex max-w-[1700px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8">
        <div aria-live="polite" className="min-h-0">
          {notice && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                notice.startsWith("Informe") || notice.startsWith("Não foi")
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-goodgreen-200 bg-goodgreen-50 text-goodgreen-800"
              }`}
            >
              {notice}
            </div>
          )}
        </div>

        <ComplianceClientIdentification state={state} onChange={updateState} />
        <ComplianceProgressSummary summary={summary} />
        <ComplianceChecklistActions
          generatingPdf={generatingPdf}
          onMarkAllCompliant={markAllCompliant}
          onClearItems={clearItems}
          onStartNew={startNew}
          onGeneratePdf={() => {
            void generatePdf();
          }}
        />
        <ComplianceChecklistFilters
          selected={filter}
          observationsOnly={observationsOnly}
          summary={summary}
          onSelectedChange={setFilter}
          onObservationsOnlyChange={setObservationsOnly}
        />
        <ComplianceChecklistList
          items={visibleItems}
          openObservations={openObservations}
          onStatusChange={handleStatusChange}
          onObservationChange={(itemId, observation) =>
            updateItem(itemId, { observation })
          }
          onObservationToggle={toggleObservation}
          onObservationRemove={removeObservation}
        />

        <section className="rounded-lg border border-goodblue-100 bg-goodblue-50 px-4 py-4 text-sm leading-6 text-goodblue-900">
          <strong>Importante:</strong> este checklist é uma ferramenta de controle interno e
          não substitui a conferência documental e operacional do analista.
        </section>
      </main>
    </div>
  );
}
