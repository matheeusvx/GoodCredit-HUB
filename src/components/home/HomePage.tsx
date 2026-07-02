import { BarChart3, CheckSquare, FileClock, PiggyBank, WalletCards } from "lucide-react";
import { HubView } from "../Sidebar";
import { FinancingFlow } from "./FinancingFlow";
import { HomeHero } from "./HomeHero";
import { ImportantNotice } from "./ImportantNotice";
import { ModuleCard } from "./ModuleCard";
import { ModuleStatus } from "./ModuleStatus";

interface Props {
  onNavigate: (view: HubView) => void;
}

const modules = [
  {
    title: "Simulação de Financiamento",
    description: "Calcule valor financiado, taxa, parcela, LTV e comprometimento de renda com base nas regras comerciais configuradas.",
    status: "Ativo" as const,
    actionLabel: "Acessar Simulação",
    icon: WalletCards,
    target: "simulation" as const
  },
  {
    title: "Planilha de Amortização",
    description: "Simule SAC, PRICE, aportes manuais, uso de FGTS, economia de juros e redução de prazo.",
    status: "Ativo" as const,
    actionLabel: "Acessar Amortização",
    icon: BarChart3,
    target: "amortization" as const
  },
  {
    title: "Checklist Documental",
    description: "Gere checklists por perfil documental, como comprador CLT, autônomo e vendedor pessoa jurídica.",
    status: "Ativo" as const,
    actionLabel: "Gerar Checklist",
    icon: CheckSquare,
    target: "checklist" as const
  },
  {
    title: "Apuração de Renda",
    description: "Ferramenta para apurar renda média com base em entradas, extratos e movimentações bancárias.",
    status: "Em desenvolvimento" as const,
    actionLabel: "Em breve",
    icon: FileClock
  },
  {
    title: "Uso de FGTS",
    description: "Central de orientação sobre uso, resgate, autorização e regras de FGTS no financiamento.",
    status: "Em desenvolvimento" as const,
    actionLabel: "Em breve",
    icon: PiggyBank
  }
];

export function HomePage({ onNavigate }: Props) {
  return (
    <main className="mx-auto flex max-w-[1700px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8">
      <HomeHero />

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-950">Ferramentas disponíveis</h2>
          <p className="mt-1 text-sm text-slate-500">Acesse os módulos ativos ou acompanhe o que está em desenvolvimento.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <ModuleCard key={module.title} {...module} onNavigate={onNavigate} />
          ))}
        </div>
      </section>

      <FinancingFlow />
      <ModuleStatus />
      <ImportantNotice />
    </main>
  );
}
