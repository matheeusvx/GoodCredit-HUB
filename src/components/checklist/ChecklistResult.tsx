import { GeneratedChecklist } from "../../types/checklist";
import { ChecklistAlertBox } from "./ChecklistAlertBox";
import { ChecklistCategoryCard } from "./ChecklistCategoryCard";

interface Props {
  checklist: GeneratedChecklist;
  checkedItems: Record<string, boolean>;
  onToggleItem: (itemKey: string) => void;
}

const labels = {
  participant: {
    COMPRADOR: "Comprador",
    VENDEDOR: "Vendedor"
  },
  banco: {
    CAIXA: "Caixa",
    INTER: "Inter",
    BRADESCO: "Bradesco",
    ITAU: "Itaú",
    SANTANDER: "Santander",
    NAO_INFORMADO: "Não informado"
  },
  fgts: {
    SIM: "Sim",
    NAO: "Não"
  },
  operation: {
    NOVO: "Aquisição de Imóvel Novo",
    USADO: "Aquisição de Imóvel Usado",
    TERRENO: "Aquisição de Terreno",
    NAO_INFORMADO: "Não informado"
  }
};

export function ChecklistResult({ checklist, checkedItems, onToggleItem }: Props) {
  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-goodgreen-600">Resultado do checklist</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">{checklist.title}</h2>
          </div>
          <span className="rounded-lg bg-goodblue-50 px-3 py-2 text-sm font-bold text-goodblue-700">
            {checklist.profileLabel}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Info label="Cliente/processo" value={checklist.formData.nome || "Não informado"} />
          <Info label="Participante" value={labels.participant[checklist.formData.participantType || "COMPRADOR"]} />
          <Info label="Perfil" value={checklist.profileLabel} />
          <Info label="Banco" value={labels.banco[checklist.formData.banco]} />
          <Info label="Uso de FGTS" value={labels.fgts[checklist.formData.usaFgts]} />
          <Info label="Operação" value={labels.operation[checklist.formData.tipoOperacao]} />
        </div>
      </div>

      {checklist.importantAlerts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <h3 className="text-base font-bold text-amber-900">Alertas importantes</h3>
          <div className="mt-3">
            <ChecklistAlertBox alerts={checklist.importantAlerts} />
          </div>
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        {checklist.categories.map((category) => (
          <ChecklistCategoryCard
            key={category.id}
            category={category}
            checkedItems={checkedItems}
            onToggle={onToggleItem}
          />
        ))}
      </div>

      <ChecklistCategoryCard category={checklist.goldenRules} checkedItems={checkedItems} onToggle={onToggleItem} />
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
