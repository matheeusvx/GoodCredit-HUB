import { Building2, FileText, Home, Landmark, PiggyBank, ShieldCheck, User, Users, WalletCards } from "lucide-react";
import { ChecklistCategory } from "../../types/checklist";
import { ChecklistAlertBox } from "./ChecklistAlertBox";
import { ChecklistItemRow } from "./ChecklistItemRow";

interface Props {
  category: ChecklistCategory;
  checkedItems: Record<string, boolean>;
  onToggle: (itemKey: string) => void;
}

const icons = {
  user: User,
  users: Users,
  wallet: WalletCards,
  alert: FileText,
  home: Home,
  building: Building2,
  bank: Landmark,
  piggy: PiggyBank,
  file: FileText,
  shield: ShieldCheck
};

export function ChecklistCategoryCard({ category, checkedItems, onToggle }: Props) {
  const Icon = icons[(category.icon ?? "file") as keyof typeof icons] ?? FileText;

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-goodgreen-50 text-goodgreen-700">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-950">{category.title}</h3>
          {category.note && <p className="mt-1 text-sm text-slate-500">{category.note}</p>}
        </div>
      </div>

      {category.items.length > 0 && (
        <div className="mt-4 space-y-2">
          {category.items.map((item) => {
            const key = `${category.id}:${item.id}`;
            return <ChecklistItemRow key={key} item={item} checked={Boolean(checkedItems[key])} onToggle={() => onToggle(key)} />;
          })}
        </div>
      )}

      {category.alerts && category.alerts.length > 0 && (
        <div className="mt-4">
          <ChecklistAlertBox alerts={category.alerts} />
        </div>
      )}
    </article>
  );
}
