import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  clearTemporaryComplianceChecklistDraft,
  saveTemporaryComplianceChecklistDraft
} from "../lib/compliance-checklist/complianceChecklistStorage";
import {
  ComplianceChecklistConflictError,
  createComplianceChecklist,
  updateComplianceChecklist
} from "../services/complianceChecklistService";
import type {
  ComplianceChecklistRecord,
  ComplianceChecklistSaveStatus,
  ComplianceChecklistState
} from "../types/complianceChecklist";

interface AutosaveOptions {
  state: ComplianceChecklistState;
  checklistId: string | null;
  pendingCreationId: string | null;
  expectedUpdatedAt: string | null;
  dirty: boolean;
  enabled: boolean;
  onCreated: (id: string) => void;
  onSaved: (record: ComplianceChecklistRecord) => void;
  onDirtyChange: (dirty: boolean) => void;
}

export function useComplianceChecklistAutosave({
  state,
  checklistId,
  pendingCreationId,
  expectedUpdatedAt,
  dirty,
  enabled,
  onCreated,
  onSaved,
  onDirtyChange
}: AutosaveOptions) {
  const { user } = useAuth();
  const [status, setStatus] = useState<ComplianceChecklistSaveStatus>("IDLE");
  const [message, setMessage] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const savingRef = useRef(false);

  const saveNow = useCallback(async () => {
    if (!enabled || !user || savingRef.current || !state.clientName.trim()) {
      return false;
    }
    savingRef.current = true;
    setStatus("SAVING");
    setMessage("");
    saveTemporaryComplianceChecklistDraft(
      localStorage,
      state,
      checklistId,
      expectedUpdatedAt,
      pendingCreationId,
      user.id
    );

    try {
      if (!checklistId) {
        const id = await createComplianceChecklist(
          state,
          pendingCreationId ?? undefined
        );
        clearTemporaryComplianceChecklistDraft(localStorage, user.id);
        onDirtyChange(false);
        setStatus("SAVED");
        setSavedAt(new Date().toISOString());
        onCreated(id);
        return true;
      }

      if (!expectedUpdatedAt) {
        setStatus("ERROR");
        setMessage("Não foi possível identificar a versão atual do checklist.");
        return false;
      }
      const record = await updateComplianceChecklist(
        checklistId,
        state,
        expectedUpdatedAt
      );
      clearTemporaryComplianceChecklistDraft(localStorage, user.id);
      onDirtyChange(false);
      setStatus("SAVED");
      setSavedAt(new Date().toISOString());
      onSaved(record);
      return true;
    } catch (reason) {
      if (reason instanceof ComplianceChecklistConflictError) {
        setStatus("CONFLICT");
        setMessage(
          "O checklist não está mais disponível ou foi atualizado. Volte à lista ou recarregue os dados."
        );
      } else {
        setStatus("ERROR");
        setMessage(
          "Não foi possível sincronizar as alterações. Uma cópia temporária foi mantida neste navegador."
        );
      }
      return false;
    } finally {
      savingRef.current = false;
    }
  }, [
    checklistId,
    enabled,
    expectedUpdatedAt,
    onCreated,
    onDirtyChange,
    onSaved,
    pendingCreationId,
    state,
    user
  ]);

  useEffect(() => {
    if (!dirty || !enabled || !state.clientName.trim()) return;
    setStatus("PENDING");
    const timer = window.setTimeout(() => {
      void saveNow();
    }, 800);
    return () => window.clearTimeout(timer);
  }, [dirty, enabled, saveNow, state.clientName]);

  return { status, message, savedAt, saveNow };
}
