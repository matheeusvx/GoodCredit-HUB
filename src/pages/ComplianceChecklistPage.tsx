import { useEffect, useState } from "react";
import { ComplianceChecklistEditorPage } from "./ComplianceChecklistEditorPage";
import { ComplianceChecklistListPage } from "./ComplianceChecklistListPage";
import type { ComplianceChecklistHistoryState } from "../lib/compliance-checklist/complianceChecklistNavigation";

export function getComplianceChecklistRouteState(pathname: string) {
  if (pathname === "/checklist-conformidade/novo") {
    return { type: "NEW" as const, id: null };
  }
  const match = pathname.match(/^\/checklist-conformidade\/([^/]+)$/);
  if (match) {
    return { type: "EDIT" as const, id: decodeURIComponent(match[1]) };
  }
  return { type: "LIST" as const, id: null };
}

function editorKeyFor(route: ReturnType<typeof getComplianceChecklistRouteState>) {
  return route.id ?? "new";
}

export function ComplianceChecklistPage() {
  const [pathname, setPathname] = useState(window.location.pathname);
  const [editorKey, setEditorKey] = useState(() =>
    editorKeyFor(getComplianceChecklistRouteState(window.location.pathname))
  );

  useEffect(() => {
    const handlePathChange = () => {
      const nextPath = window.location.pathname;
      const nextRoute = getComplianceChecklistRouteState(nextPath);
      const historyState = window.history.state as ComplianceChecklistHistoryState | null;
      const adoptedByCurrentEditor =
        nextRoute.type === "EDIT" &&
        historyState?.adoptedChecklistId === nextRoute.id;
      setPathname(nextPath);
      // A checklist just created by the open editor keeps the same editor
      // instance, so the user keeps typing without a loading screen.
      if (!adoptedByCurrentEditor) setEditorKey(editorKeyFor(nextRoute));
    };
    window.addEventListener("popstate", handlePathChange);
    return () => window.removeEventListener("popstate", handlePathChange);
  }, []);

  const route = getComplianceChecklistRouteState(pathname);
  if (route.type === "LIST") return <ComplianceChecklistListPage />;
  return <ComplianceChecklistEditorPage key={editorKey} checklistId={route.id} />;
}
