import { Check, ChevronDown, Copy, ExternalLink, Link2 } from "lucide-react";
import type { FaqItem as FaqItemData } from "../../types/faq";
import { getFaqCategoryLabel } from "../../lib/faqSearch";

interface FaqItemProps {
  item: FaqItemData;
  isOpen: boolean;
  feedback?: "answer" | "link";
  onToggle: () => void;
  onCopyAnswer: () => void;
  onCopyLink: () => void;
}

function AnswerContent({ answer }: { answer: string }) {
  return (
    <div className="space-y-4 text-sm leading-6 text-slate-700 sm:text-[15px]">
      {answer.split(/\n\n/).map((block, blockIndex) => {
        const lines = block.split("\n").filter(Boolean);
        const isList = lines.length > 0 && lines.every((line) => line.trim().startsWith("-"));

        if (isList) {
          return (
            <ul key={blockIndex} className="space-y-2 pl-5">
              {lines.map((line) => (
                <li key={line} className="list-disc pl-1 marker:text-goodgreen-600">
                  {line.replace(/^\s*-\s*/, "")}
                </li>
              ))}
            </ul>
          );
        }

        return <p key={blockIndex}>{lines.join(" ")}</p>;
      })}
    </div>
  );
}

export function FaqItem({ item, isOpen, feedback, onToggle, onCopyAnswer, onCopyLink }: FaqItemProps) {
  const triggerId = `${item.id}-trigger`;
  const panelId = `${item.id}-panel`;

  return (
    <article id={item.id} className="scroll-mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <h2>
        <button
          id={triggerId}
          type="button"
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex w-full items-start gap-3 px-4 py-4 text-left transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-goodgreen-100 sm:gap-4 sm:px-5"
        >
          <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg bg-goodgreen-50 text-sm font-extrabold text-goodgreen-700 ring-1 ring-goodgreen-100">
            {item.number}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold leading-6 text-slate-950 sm:text-base">{item.question}</span>
            <span className="mt-2 inline-flex rounded-md bg-goodblue-50 px-2 py-1 text-xs font-bold text-goodblue-700">
              {getFaqCategoryLabel(item.category)}
            </span>
          </span>
          <ChevronDown
            className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </h2>

      {isOpen && (
        <div
          id={panelId}
          role="region"
          aria-labelledby={triggerId}
          className="border-t border-slate-100 bg-slate-50/60 px-4 py-5 sm:px-5"
        >
          <AnswerContent answer={item.answer} />

          {item.links && item.links.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {item.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-goodblue-100 bg-goodblue-50 px-3 text-sm font-bold text-goodblue-700 transition hover:border-goodblue-200 hover:bg-goodblue-100 focus:outline-none focus:ring-4 focus:ring-goodblue-100"
                >
                  {link.label}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
            <button type="button" onClick={onCopyAnswer} className="btn-muted h-10 px-3">
              {feedback === "answer" ? <Check className="h-4 w-4 text-goodgreen-600" /> : <Copy className="h-4 w-4" />}
              {feedback === "answer" ? "Resposta copiada" : "Copiar resposta"}
            </button>
            <button type="button" onClick={onCopyLink} className="btn-muted h-10 px-3">
              {feedback === "link" ? <Check className="h-4 w-4 text-goodgreen-600" /> : <Link2 className="h-4 w-4" />}
              {feedback === "link" ? "Link copiado" : "Copiar link"}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
