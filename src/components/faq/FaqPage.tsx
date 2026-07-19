import { ChevronsDown, ChevronsUp, Info } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FAQ_CONTENT_VERSION, FAQ_ITEMS, FAQ_LAST_REVIEWED_AT } from "../../data/faqData";
import { filterFaqItems } from "../../lib/faqSearch";
import type { FaqCategory, FaqItem } from "../../types/faq";
import { FaqAccordion } from "./FaqAccordion";
import { FaqCategoryFilters } from "./FaqCategoryFilters";
import { FaqEmptyState } from "./FaqEmptyState";
import { FaqHeader } from "./FaqHeader";
import { FaqSearch } from "./FaqSearch";

type CopyFeedback = { id: string; type: "answer" | "link" } | null;

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

export function FaqPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory | "ALL">("ALL");
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [feedback, setFeedback] = useState<CopyFeedback>(null);
  const feedbackTimer = useRef<number | null>(null);

  const filteredItems = useMemo(() => filterFaqItems(FAQ_ITEMS, query, category), [category, query]);

  useEffect(() => {
    function openHashQuestion() {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!FAQ_ITEMS.some((item) => item.id === id)) return;

      setQuery("");
      setCategory("ALL");
      setOpenIds((current) => new Set(current).add(id));
      window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }

    openHashQuestion();
    window.addEventListener("hashchange", openHashQuestion);
    return () => window.removeEventListener("hashchange", openHashQuestion);
  }, []);

  useEffect(
    () => () => {
      if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
    },
    []
  );

  function toggleQuestion(id: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function showFeedback(id: string, type: "answer" | "link") {
    setFeedback({ id, type });
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current);
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 2200);
  }

  async function copyAnswer(item: FaqItem) {
    await copyToClipboard(`Pergunta:\n${item.question}\n\nResposta:\n${item.answer}`);
    showFeedback(item.id, "answer");
  }

  async function copyLink(item: FaqItem) {
    await copyToClipboard(`${window.location.origin}/faq#${item.id}`);
    showFeedback(item.id, "link");
  }

  function clearFilters() {
    setQuery("");
    setCategory("ALL");
  }

  const resultLabel = `${filteredItems.length} ${filteredItems.length === 1 ? "pergunta encontrada" : "perguntas encontradas"}`;

  return (
    <div className="min-h-screen bg-slate-100">
      <FaqHeader />

      <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6" aria-label="Pesquisa e filtros do FAQ">
          <FaqSearch value={query} onChange={setQuery} />
          <div className="mt-5">
            <FaqCategoryFilters selected={category} onChange={setCategory} />
          </div>
        </section>

        <section className="rounded-lg border border-goodblue-100 bg-goodblue-50 p-4 text-sm leading-6 text-goodblue-800">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
            <p>
              Material interno de apoio. As condições podem variar conforme a operação, o produto, as regras vigentes e
              a análise da instituição financeira.
            </p>
          </div>
        </section>

        <section aria-labelledby="faq-results-heading">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="faq-results-heading" className="text-lg font-bold text-slate-950">
                Perguntas e respostas
              </h2>
              <p className="mt-1 text-sm font-medium text-slate-500" aria-live="polite">
                {resultLabel}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setOpenIds(new Set(filteredItems.map((item) => item.id)))}
                className="btn-muted h-10 flex-1 px-3 sm:flex-none"
                disabled={filteredItems.length === 0}
              >
                <ChevronsDown className="h-4 w-4" aria-hidden="true" />
                Abrir todas
              </button>
              <button
                type="button"
                onClick={() => setOpenIds(new Set())}
                className="btn-muted h-10 flex-1 px-3 sm:flex-none"
                disabled={openIds.size === 0}
              >
                <ChevronsUp className="h-4 w-4" aria-hidden="true" />
                Fechar todas
              </button>
            </div>
          </div>

          {filteredItems.length > 0 ? (
            <FaqAccordion
              items={filteredItems}
              openIds={openIds}
              feedback={feedback}
              onToggle={toggleQuestion}
              onCopyAnswer={copyAnswer}
              onCopyLink={copyLink}
            />
          ) : (
            <FaqEmptyState onClear={clearFilters} />
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-goodgreen-700" aria-hidden="true" />
            <div>
              <h2 className="font-bold text-slate-950">Orientação institucional</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                As respostas deste FAQ possuem caráter orientativo e refletem procedimentos internos e condições gerais.
                A aplicação de cada regra depende do perfil do cliente, da modalidade, da documentação, das normas
                vigentes e da validação da instituição financeira.
              </p>
            </div>
          </div>
        </section>

        <footer className="pb-4 text-center text-xs leading-5 text-slate-500">
          <p className="font-bold text-slate-600">FAQ de Atendimento GoodCredit — Material interno de apoio</p>
          <p>Versão {FAQ_CONTENT_VERSION}</p>
          <p>
            {FAQ_LAST_REVIEWED_AT
              ? `Última revisão: ${FAQ_LAST_REVIEWED_AT}`
              : "Versão inicial baseada no material revisado fornecido pela GoodCredit."}
          </p>
        </footer>
      </main>
    </div>
  );
}
