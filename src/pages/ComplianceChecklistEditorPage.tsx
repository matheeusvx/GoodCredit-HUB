import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ComplianceChecklistActions } from "../components/compliance-checklist/ComplianceChecklistActions";
import { ComplianceChecklistFilters } from "../components/compliance-checklist/ComplianceChecklistFilters";
import { ComplianceChecklistHeader } from "../components/compliance-checklist/ComplianceChecklistHeader";
import { ComplianceChecklistList } from "../components/compliance-checklist/ComplianceChecklistList";
import { ComplianceChecklistSaveStatus } from "../components/compliance-checklist/ComplianceChecklistSaveStatus";
import { ComplianceClientIdentification } from "../components/compliance-checklist/ComplianceClientIdentification";
import { ComplianceProgressSummary } from "../components/compliance-checklist/ComplianceProgressSummary";
import { COMPLIANCE_CHECKLIST_ITEMS } from "../data/complianceChecklistItems";
import { useComplianceChecklist } from "../hooks/useComplianceChecklist";
import { useComplianceChecklistAutosave } from "../hooks/useComplianceChecklistAutosave";
import { generateComplianceChecklistPdf } from "../lib/compliance-checklist/complianceChecklistPdf";
import {
  complianceChecklistEditorPath,
  navigateComplianceChecklist
} from "../lib/compliance-checklist/complianceChecklistNavigation";
import { calculateComplianceChecklistSummary } from "../lib/compliance-checklist/complianceChecklistSummary";
import {
  createNewComplianceChecklist,
  readTemporaryComplianceChecklistDraft,
  resetComplianceChecklistItems,
  saveTemporaryComplianceChecklistDraft
} from "../lib/compliance-checklist/complianceChecklistStorage";
import { getComplianceChecklistById } from "../services/complianceChecklistService";
import type {
  ComplianceChecklistFilter,
  ComplianceChecklistItemState,
  ComplianceChecklistRecord,
  ComplianceChecklistState,
  ComplianceChecklistStatus
} from "../types/complianceChecklist";

interface Props {
  checklistId: string | null;
}

export function ComplianceChecklistEditorPage({ checklistId }: Props) {
  const { user } = useAuth();
  const {
    detail,
    setDetail,
    state,
    setState,
    loading,
    error,
    recoveredDraft,
    reload,
    adoptCreatedChecklist
  } = useComplianceChecklist(checklistId);
  const [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState<ComplianceChecklistFilter>("ALL");
  const [observationsOnly, setObservationsOnly] = useState(false);
  const [openObservations, setOpenObservations] = useState<Set<string>>(
    () => new Set()
  );
  const [notice, setNotice] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [pendingCreationId] = useState<string | null>(() => {
    if (checklistId) return null;
    if (!user) return crypto.randomUUID();
    return (
      readTemporaryComplianceChecklistDraft(localStorage, user.id)
        ?.pendingCreationId ??
      crypto.randomUUID()
    );
  });

  useEffect(() => {
    if (recoveredDraft) {
      setDirty(true);
    }
  }, [recoveredDraft]);

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
      const matchesObservation =
        !observationsOnly || Boolean(item.observation.trim());
      return matchesStatus && matchesObservation;
    });
  }, [filter, observationsOnly, state.items]);

  const persistTemporary = useCallback(
    (nextState: ComplianceChecklistState) => {
      if (!user) return;
      saveTemporaryComplianceChecklistDraft(
        localStorage,
        nextState,
        checklistId,
        detail?.record.updatedAt ?? null,
        pendingCreationId,
        user.id
      );
    },
    [checklistId, detail?.record.updatedAt, pendingCreationId, user]
  );

  function replaceState(nextState: ComplianceChecklistState) {
    setState(nextState);
    persistTemporary(nextState);
    setDirty(true);
    setNotice("");
  }

  function updateState(patch: Partial<ComplianceChecklistState>) {
    const nextState = {
      ...state,
      ...patch,
      lastUpdatedAt: new Date().toISOString()
    };
    replaceState(nextState);
  }

  function updateItem(
    itemId: string,
    patch: Partial<Pick<ComplianceChecklistItemState, "status" | "observation">>
  ) {
    const timestamp = new Date().toISOString();
    replaceState({
      ...state,
      items: state.items.map((item) =>
        item.itemId === itemId ? { ...item, ...patch, updatedAt: timestamp } : item
      ),
      lastUpdatedAt: timestamp
    });
  }

  const handleCreated = useCallback(
    (id: string) => {
      // Keep this editor mounted with the current content instead of
      // reloading the newly created checklist from scratch.
      adoptCreatedChecklist(id);
      navigateComplianceChecklist(complianceChecklistEditorPath(id), true, {
        adoptedChecklistId: id
      });
    },
    [adoptCreatedChecklist]
  );

  const handleSaved = useCallback(
    (record: ComplianceChecklistRecord) => {
      setDetail((current) =>
        current ? { ...current, record, state } : current
      );
    },
    [setDetail, state]
  );

  const autosave = useComplianceChecklistAutosave({
    state,
    checklistId,
    pendingCreationId,
    expectedUpdatedAt: detail?.record.updatedAt ?? null,
    dirty,
    // Right after creation, wait for the record's version before updating it.
    enabled: !loading && (!checklistId || Boolean(detail)),
    onCreated: handleCreated,
    onSaved: handleSaved,
    onDirtyChange: setDirty
  });

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
    replaceState({
      ...state,
      items: state.items.map((item) => ({
        ...item,
        status: "COMPLIANT",
        updatedAt: timestamp
      })),
      lastUpdatedAt: timestamp
    });
  }

  function clearItems() {
    replaceState(resetComplianceChecklistItems(state));
    setOpenObservations(new Set());
    setFilter("ALL");
    setObservationsOnly(false);
  }

  async function saveNow() {
    if (!state.clientName.trim()) {
      setNotice("Informe o nome do cliente antes de salvar o checklist.");
      return false;
    }
    return autosave.saveNow();
  }

  async function generatePdf() {
    if (!state.clientName.trim()) {
      setNotice("Informe o nome do cliente antes de gerar o relatório.");
      return;
    }

    if (!checklistId) {
      await saveNow();
      return;
    }

    if (dirty && !(await saveNow())) return;

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
      const savedDetail = await getComplianceChecklistById(checklistId);
      const savedSummary = calculateComplianceChecklistSummary(
        savedDetail.state.items
      );
      await generateComplianceChecklistPdf(
        savedDetail.state,
        savedSummary,
        draft,
        {
          checklistId,
          createdByLabel: savedDetail.record.createdByLabel,
          updatedByLabel: savedDetail.record.updatedByLabel,
          createdAt: savedDetail.record.createdAt,
          updatedAt: savedDetail.record.updatedAt
        }
      );
    } catch {
      setNotice("Não foi possível gerar o relatório. Tente novamente.");
    } finally {
      setGeneratingPdf(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-100 p-8 text-center text-sm text-slate-500">
        Carregando Checklist de Conformidade...
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-xl rounded-lg border border-rose-200 bg-white p-6 text-center">
          <h1 className="text-lg font-bold text-ink">
            Não foi possível abrir o checklist
          </h1>
          <p className="mt-2 text-sm text-rose-700">{error}</p>
          <button
            type="button"
            onClick={() => navigateComplianceChecklist("/checklist-conformidade")}
            className="btn-primary mt-5"
          >
            Voltar para Checklists
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <ComplianceChecklistHeader
        title={checklistId ? "Checklist de Conformidade" : "Novo Checklist de Conformidade"}
        modeLabel={checklistId ? "Editando checklist" : "Novo checklist"}
        saving={autosave.status === "SAVING"}
        onBack={() => navigateComplianceChecklist("/checklist-conformidade")}
        onSave={() => void saveNow()}
      />

      <main className="mx-auto flex max-w-[1700px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8">
        <div aria-live="polite">
          {notice && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              {notice}
            </div>
          )}
        </div>

        <ComplianceChecklistSaveStatus
          status={autosave.status}
          message={autosave.message}
          savedAt={autosave.savedAt}
          onRetry={() => void saveNow()}
          onReload={() => {
            setDirty(false);
            void reload();
          }}
        />

        <ComplianceClientIdentification state={state} onChange={updateState} />
        <ComplianceProgressSummary summary={summary} />
        <ComplianceChecklistActions
          generatingPdf={generatingPdf}
          onMarkAllCompliant={markAllCompliant}
          onClearItems={clearItems}
          onStartNew={() => {
            replaceState(createNewComplianceChecklist());
            navigateComplianceChecklist("/checklist-conformidade/novo");
          }}
          onGeneratePdf={() => void generatePdf()}
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
      </main>
    </div>
  );
}
