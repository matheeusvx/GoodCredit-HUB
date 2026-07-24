import { ClipboardCheck } from "lucide-react";
import { ComplianceChecklistItemDefinition, ComplianceChecklistItemState, ComplianceChecklistStatus } from "../../types/complianceChecklist";
import { ComplianceChecklistItem } from "./ComplianceChecklistItem";

interface Props {
  items: Array<{
    definition: ComplianceChecklistItemDefinition;
    state: ComplianceChecklistItemState;
  }>;
  openObservations: Set<string>;
  onStatusChange: (itemId: string, status: ComplianceChecklistStatus) => void;
  onObservationChange: (itemId: string, observation: string) => void;
  onObservationToggle: (itemId: string) => void;
  onObservationRemove: (itemId: string) => void;
}

export function ComplianceChecklistList({
  items,
  openObservations,
  onStatusChange,
  onObservationChange,
  onObservationToggle,
  onObservationRemove
}: Props) {
  return (
    <section aria-labelledby="compliance-list-title">
      <div className="mb-4 flex items-center gap-3">
        <ClipboardCheck className="h-5 w-5 text-goodgreen-700" />
        <div>
          <h2 id="compliance-list-title" className="text-lg font-bold text-slate-950">
            Verificações de Conformidade
          </h2>
          <p className="text-xs text-slate-500">
            Use o checkbox para alternar rapidamente entre Pendente e Conforme.
          </p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map(({ definition, state }) => (
            <ComplianceChecklistItem
              key={definition.id}
              definition={definition}
              item={state}
              observationOpen={openObservations.has(definition.id)}
              onStatusChange={(status) => onStatusChange(definition.id, status)}
              onObservationChange={(observation) =>
                onObservationChange(definition.id, observation)
              }
              onObservationToggle={() => onObservationToggle(definition.id)}
              onObservationRemove={() => onObservationRemove(definition.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
          <p className="text-sm font-bold text-slate-800">Nenhum item neste filtro</p>
          <p className="mt-1 text-xs text-slate-500">
            Selecione outro status ou desative o filtro de observações.
          </p>
        </div>
      )}
    </section>
  );
}
