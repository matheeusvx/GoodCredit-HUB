import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { createBlankEditorState } from "../lib/compliance-checklist/complianceChecklistMapper";
import { readTemporaryComplianceChecklistDraft } from "../lib/compliance-checklist/complianceChecklistStorage";
import { getComplianceChecklistById } from "../services/complianceChecklistService";
import type {
  ComplianceChecklistDetail,
  ComplianceChecklistState
} from "../types/complianceChecklist";

export function useComplianceChecklist(checklistId: string | null) {
  const { user } = useAuth();
  // Depend on the user id, not the User object: Supabase emits a new object on
  // every token refresh / tab focus, which must not reload the editor.
  const userId = user?.id ?? null;
  const [detail, setDetail] = useState<ComplianceChecklistDetail | null>(null);
  const [state, setState] = useState<ComplianceChecklistState>(() =>
    createBlankEditorState()
  );
  const [loading, setLoading] = useState(Boolean(checklistId));
  const [error, setError] = useState("");
  const [recoveredDraft, setRecoveredDraft] = useState(false);
  // Id of a checklist that was just created from this editor. Its contents are
  // already on screen, so only the server metadata needs to be fetched.
  const adoptedIdRef = useRef<string | null>(null);

  const adoptCreatedChecklist = useCallback((id: string) => {
    adoptedIdRef.current = id;
  }, []);

  const load = useCallback(async () => {
    if (!userId) {
      setDetail(null);
      setState(createBlankEditorState());
      setRecoveredDraft(false);
      setLoading(false);
      setError("Sessão expirada. Entre novamente.");
      return;
    }
    if (!checklistId) {
      const draft = readTemporaryComplianceChecklistDraft(localStorage, userId);
      setDetail(null);
      setState(
        draft && !draft.checklistId ? draft.state : createBlankEditorState()
      );
      setRecoveredDraft(Boolean(draft && !draft.checklistId));
      setLoading(false);
      setError("");
      return;
    }

    if (adoptedIdRef.current === checklistId) {
      adoptedIdRef.current = null;
      try {
        const nextDetail = await getComplianceChecklistById(checklistId);
        setDetail(nextDetail);
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Não foi possível carregar o checklist."
        );
      }
      return;
    }

    setLoading(true);
    setError("");
    try {
      const nextDetail = await getComplianceChecklistById(checklistId);
      const draft = readTemporaryComplianceChecklistDraft(localStorage, userId);
      const shouldRecover =
        draft?.checklistId === checklistId &&
        new Date(draft.savedAt).getTime() >
          new Date(nextDetail.record.updatedAt).getTime();
      setDetail(nextDetail);
      setState(shouldRecover && draft ? draft.state : nextDetail.state);
      setRecoveredDraft(Boolean(shouldRecover));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível carregar o checklist."
      );
    } finally {
      setLoading(false);
    }
  }, [checklistId, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    detail,
    setDetail,
    state,
    setState,
    loading,
    error,
    recoveredDraft,
    reload: load,
    adoptCreatedChecklist
  };
}
