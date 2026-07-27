import { useCallback, useEffect, useState } from "react";
import { createBlankEditorState } from "../lib/compliance-checklist/complianceChecklistMapper";
import { readTemporaryComplianceChecklistDraft } from "../lib/compliance-checklist/complianceChecklistStorage";
import { getComplianceChecklistById } from "../services/complianceChecklistService";
import type {
  ComplianceChecklistDetail,
  ComplianceChecklistState
} from "../types/complianceChecklist";

export function useComplianceChecklist(checklistId: string | null) {
  const [detail, setDetail] = useState<ComplianceChecklistDetail | null>(null);
  const [state, setState] = useState<ComplianceChecklistState>(() =>
    createBlankEditorState()
  );
  const [loading, setLoading] = useState(Boolean(checklistId));
  const [error, setError] = useState("");
  const [recoveredDraft, setRecoveredDraft] = useState(false);

  const load = useCallback(async () => {
    if (!checklistId) {
      const draft = readTemporaryComplianceChecklistDraft(localStorage);
      setDetail(null);
      setState(
        draft && !draft.checklistId ? draft.state : createBlankEditorState()
      );
      setRecoveredDraft(Boolean(draft && !draft.checklistId));
      setLoading(false);
      setError("");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const nextDetail = await getComplianceChecklistById(checklistId);
      const draft = readTemporaryComplianceChecklistDraft(localStorage);
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
  }, [checklistId]);

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
    reload: load
  };
}
