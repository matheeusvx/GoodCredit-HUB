import { useEffect, useMemo, useRef, useState } from "react";
import { USAGE_GUIDES, USAGE_GUIDE_LAST_REVIEWED_AT, USAGE_GUIDE_VERSION } from "../../data/usageGuideData";
import { filterUsageGuides } from "../../lib/usageGuideSearch";
import { buildUsageGuideInstructions } from "../../lib/usageGuideInstructions";
import type { HubView } from "../Sidebar";
import type { UsageGuide, UsageGuideDestination } from "../../types/usageGuide";
import { UsageGuideCards } from "./UsageGuideCards";
import { UsageGuideContent } from "./UsageGuideContent";
import { UsageGuideEmptyState } from "./UsageGuideEmptyState";
import { UsageGuideHeader } from "./UsageGuideHeader";
import { UsageGuideNavigation } from "./UsageGuideNavigation";
import { UsageGuideSearch } from "./UsageGuideSearch";

type CopyFeedback = "instructions" | "link" | null;

function guideFromHash(): UsageGuide | undefined {
  const anchor = decodeURIComponent(window.location.hash.replace(/^#/, ""));
  return USAGE_GUIDES.find((guide) => guide.anchor === anchor);
}

async function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export function UsageGuidePage({ onNavigate }: { onNavigate: (view: HubView) => void }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<UsageGuide["id"]>(() => guideFromHash()?.id ?? "home");
  const [feedback, setFeedback] = useState<CopyFeedback>(null);
  const feedbackTimer = useRef<number | null>(null);
  const filteredGuides = useMemo(() => filterUsageGuides(USAGE_GUIDES, query), [query]);
  const selectedGuide = USAGE_GUIDES.find((guide) => guide.id === selectedId) ?? USAGE_GUIDES[0];

  useEffect(() => {
    function selectHashGuide() {
      const guide = guideFromHash();
      if (!guide) return;
      setSelectedId(guide.id);
      window.setTimeout(() => document.getElementById(guide.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    }
    selectHashGuide();
    window.addEventListener("hashchange", selectHashGuide);
    return () => window.removeEventListener("hashchange", selectHashGuide);
  }, []);

  useEffect(() => () => {
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
  }, []);

  function selectGuide(guide: UsageGuide) {
    setSelectedId(guide.id);
    setFeedback(null);
    window.history.replaceState(window.history.state, "", `/guia-de-uso#${guide.anchor}`);
    window.setTimeout(() => document.getElementById(guide.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  function showFeedback(type: CopyFeedback) {
    setFeedback(type);
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 2200);
  }

  async function copyInstructions() {
    await copyToClipboard(buildUsageGuideInstructions(selectedGuide));
    showFeedback("instructions");
  }

  async function copyLink() {
    await copyToClipboard(`${window.location.origin}/guia-de-uso#${selectedGuide.anchor}`);
    showFeedback("link");
  }

  function openModule(destination: UsageGuideDestination) {
    onNavigate(destination);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <UsageGuideHeader />
      <main className="mx-auto flex max-w-[1500px] flex-col gap-7 px-4 py-6 sm:px-6 xl:px-8">
        <UsageGuideSearch value={query} resultCount={filteredGuides.length} onChange={setQuery} onClear={() => setQuery("")} />

        {filteredGuides.length > 0 ? (
          <UsageGuideCards guides={filteredGuides} selectedId={selectedId} onSelect={selectGuide} onOpenModule={openModule} />
        ) : (
          <UsageGuideEmptyState onClear={() => setQuery("")} />
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          <UsageGuideNavigation guides={USAGE_GUIDES} selectedId={selectedId} onSelect={selectGuide} />
          <UsageGuideContent
            key={selectedGuide.id}
            guide={selectedGuide}
            feedback={feedback}
            onCopyInstructions={copyInstructions}
            onCopyLink={copyLink}
            onOpenModule={openModule}
          />
        </div>

        <footer className="pb-4 text-center text-xs leading-5 text-slate-500">
          <p className="font-bold text-slate-600">Guia de Uso GoodCredit Hub</p>
          <p>Versão {USAGE_GUIDE_VERSION}</p>
          <p>{USAGE_GUIDE_LAST_REVIEWED_AT ? `Última revisão: ${USAGE_GUIDE_LAST_REVIEWED_AT}` : "Guia baseado na versão atual do GoodCredit Hub."}</p>
        </footer>
      </main>
    </div>
  );
}
