import { ClipboardList, FileSignature, Home, Landmark, PenLine, SearchCheck, ShieldCheck, Wallet } from "lucide-react";

const steps = [
  { title: "Simulação", description: "Primeira estimativa de valores, parcela, banco e enquadramento.", icon: SearchCheck },
  { title: "Documentação", description: "Coleta e conferência dos documentos do comprador, vendedor e imóvel.", icon: ClipboardList },
  { title: "Engenharia", description: "Vistoria e avaliação do imóvel pelo banco.", icon: Home },
  { title: "Análise Jurídica", description: "Validação documental e preparação para emissão do contrato.", icon: ShieldCheck },
  { title: "Emissão do Contrato", description: "Geração do contrato de financiamento pelo banco.", icon: FileSignature },
  { title: "Assinatura", description: "Assinatura das partes envolvidas conforme orientação bancária.", icon: PenLine },
  { title: "Registro", description: "Entrada e acompanhamento do título no cartório.", icon: Landmark },
  { title: "Pagamento ao Vendedor", description: "Liberação dos recursos após conclusão do registro.", icon: Wallet }
];

export function FinancingFlow() {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel sm:p-6">
      <div>
        <h2 className="text-xl font-bold text-slate-950">Fluxo geral do financiamento</h2>
        <p className="mt-1 text-sm text-slate-500">Etapas principais acompanhadas em uma operação imobiliária.</p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <article key={step.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-goodblue-50 text-goodblue-700">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-goodgreen-700">{String(index + 1).padStart(2, "0")}</span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-slate-950">{step.title}</h3>
              <p className="mt-1 text-sm leading-5 text-slate-600">{step.description}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
