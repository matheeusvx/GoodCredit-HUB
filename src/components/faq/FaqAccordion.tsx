import type { FaqItem as FaqItemData } from "../../types/faq";
import { FaqItem } from "./FaqItem";

interface FaqAccordionProps {
  items: FaqItemData[];
  openIds: Set<string>;
  feedback: { id: string; type: "answer" | "link" } | null;
  onToggle: (id: string) => void;
  onCopyAnswer: (item: FaqItemData) => void;
  onCopyLink: (item: FaqItemData) => void;
}

export function FaqAccordion({
  items,
  openIds,
  feedback,
  onToggle,
  onCopyAnswer,
  onCopyLink
}: FaqAccordionProps) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <FaqItem
          key={item.id}
          item={item}
          isOpen={openIds.has(item.id)}
          feedback={feedback?.id === item.id ? feedback.type : undefined}
          onToggle={() => onToggle(item.id)}
          onCopyAnswer={() => onCopyAnswer(item)}
          onCopyLink={() => onCopyLink(item)}
        />
      ))}
    </div>
  );
}
