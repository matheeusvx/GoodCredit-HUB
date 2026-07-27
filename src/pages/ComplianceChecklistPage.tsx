import { useEffect, useState } from "react";
import { ComplianceChecklistEditorPage } from "./ComplianceChecklistEditorPage";
import { ComplianceChecklistListPage } from "./ComplianceChecklistListPage";

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

export function ComplianceChecklistPage() {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handlePathChange = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePathChange);
    return () => window.removeEventListener("popstate", handlePathChange);
  }, []);

  const route = getComplianceChecklistRouteState(pathname);
  if (route.type === "LIST") return <ComplianceChecklistListPage />;
  return (
    <ComplianceChecklistEditorPage
      key={route.id ?? "new"}
      checklistId={route.id}
    />
  );
}
