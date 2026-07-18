import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useMemo, useState, useEffect } from "react";
import { AmortizationTable } from "./components/AmortizationTable";
import { AmortizationImpact } from "./components/AmortizationImpact";
import { EvolutionChart } from "./components/EvolutionChart";
import { FgtsContributionModal } from "./components/FgtsContributionModal";
import { Header } from "./components/Header";
import { InputCard } from "./components/InputCard";
import { ManualContributionModal } from "./components/ManualContributionModal";
import { Sidebar, HubView } from "./components/Sidebar";
import { SummaryCard } from "./components/SummaryCard";
import { ChecklistPage } from "./components/checklist/ChecklistPage";
import { HomePage } from "./components/home/HomePage";
import { SimulationPage } from "./components/simulation/SimulationPage";
import { FgtsPage } from "./components/fgts/FgtsPage";
import { IncomeAnalysisPage } from "./components/income-analysis/IncomeAnalysisPage";
import { ProSolutoPage } from "./components/pro-soluto/ProSolutoPage";
import {
  calcMonthlyRate,
  formatInputCurrencyBR,
  formatInputPercentBR,
  formatCurrencyBR,
  formatPercentBR,
  generateAmortizationSchedule,
  parseIntegerBR,
  parseNumberBR,
  parsePercentBR,
  summarizeSchedule
} from "./lib/financial";
import { AmortizationContributionEvent, FinancingInputs, StoredSimulation } from "./types/amortization";
import { SimulationResult } from "./types/simulation";
import { FgtsAmortizationPrefill } from "./types/fgts";
import {
  calculateAmortizationImpact,
  contributionEventsToMap,
  contributionMapToEvents,
  hasActiveContributions,
  upsertContributionEvent
} from "./lib/amortization/impact";

const STORAGE_KEY = "goodcredit-hub-amortization-v1";

const VIEW_PATHS: Record<HubView, string> = {
  home: "/",
  amortization: "/amortizacao",
  simulation: "/simulacao-financiamento",
  "pro-soluto": "/pro-soluto",
  checklist: "/checklist-documental",
  fgts: "/uso-fgts",
  "income-analysis": "/apuracao-renda"
};

function viewFromPath(pathname: string): HubView {
  const match = (Object.entries(VIEW_PATHS) as Array<[HubView, string]>).find(([, path]) => path === pathname);
  return match?.[0] ?? "home";
}

const defaultInputs: FinancingInputs = {
  nomeCliente: "",
  valorFinanciado: 250000,
  prazoMeses: 420,
  taxaAnual: 0.1,
  sistema: "SAC"
};

function readStoredSimulation(): StoredSimulation {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { inputs: defaultInputs, manualEvents: [], fgtsEvents: [], version: 2 };
    }

    const parsed = JSON.parse(stored) as Partial<StoredSimulation>;
    return {
      inputs: {
        ...defaultInputs,
        ...parsed.inputs,
        prazoMeses: Math.min(420, Math.max(1, Math.floor(parsed.inputs?.prazoMeses || defaultInputs.prazoMeses))),
        valorFinanciado: Math.max(0, parsed.inputs?.valorFinanciado || defaultInputs.valorFinanciado),
        taxaAnual: Math.max(0, parsed.inputs?.taxaAnual ?? defaultInputs.taxaAnual),
        sistema: parsed.inputs?.sistema === "PRICE" ? "PRICE" : "SAC"
      },
      manualEvents: parsed.manualEvents ?? contributionMapToEvents(parsed.manualContributions ?? {}, "MANUAL"),
      fgtsEvents: parsed.fgtsEvents ?? contributionMapToEvents(parsed.fgtsContributions ?? {}, "FGTS"),
      version: 2
    };
  } catch {
    return { inputs: defaultInputs, manualEvents: [], fgtsEvents: [], version: 2 };
  }
}

function getLogoDataUrl(): Promise<string | null> {
  return fetch("/logo-goodcredit-hub.png")
    .then((response) => {
      if (!response.ok) return null;
      return response.blob();
    })
    .then(
      (blob) =>
        new Promise<string | null>((resolve) => {
          if (!blob) {
            resolve(null);
            return;
          }
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        })
    )
    .catch(() => null);
}

function buildValidation(inputs: FinancingInputs): string[] {
  const errors: string[] = [];
  if (inputs.valorFinanciado <= 0) errors.push("Valor financiado deve ser maior que zero.");
  if (!Number.isInteger(inputs.prazoMeses) || inputs.prazoMeses <= 0) {
    errors.push("Prazo deve ser inteiro e maior que zero.");
  }
  if (inputs.prazoMeses > 420) errors.push("Prazo máximo inicial é 420 meses.");
  if (inputs.taxaAnual < 0) errors.push("Taxa anual deve ser maior ou igual a zero.");
  return errors;
}

export default function App() {
  const stored = useMemo(readStoredSimulation, []);
  const [activeView, setActiveView] = useState<HubView>(() => viewFromPath(window.location.pathname));
  const [inputs, setInputs] = useState<FinancingInputs>(stored.inputs);
  const [valorFinanciadoInput, setValorFinanciadoInput] = useState(() =>
    formatInputCurrencyBR(stored.inputs.valorFinanciado)
  );
  const [prazoMesesInput, setPrazoMesesInput] = useState(() => String(stored.inputs.prazoMeses));
  const [taxaAnualInput, setTaxaAnualInput] = useState(() => formatInputPercentBR(stored.inputs.taxaAnual));
  const [manualEvents, setManualEvents] = useState<AmortizationContributionEvent[]>(stored.manualEvents);
  const [fgtsEvents, setFgtsEvents] = useState<AmortizationContributionEvent[]>(stored.fgtsEvents);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [fgtsModalOpen, setFgtsModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  function navigateTo(view: HubView) {
    setActiveView(view);
    const path = VIEW_PATHS[view];
    if (window.location.pathname !== path) window.history.pushState({ view }, "", path);
  }

  useEffect(() => {
    const handlePopState = () => setActiveView(viewFromPath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const manualContributions = useMemo(
    () => contributionEventsToMap(manualEvents, "MANUAL", inputs.prazoMeses),
    [inputs.prazoMeses, manualEvents]
  );
  const fgtsContributions = useMemo(
    () => contributionEventsToMap(fgtsEvents, "FGTS", inputs.prazoMeses),
    [fgtsEvents, inputs.prazoMeses]
  );
  const rows = useMemo(
    () => generateAmortizationSchedule(inputs, manualContributions, fgtsContributions),
    [fgtsContributions, inputs, manualContributions]
  );
  const summary = useMemo(() => summarizeSchedule(inputs, rows), [inputs, rows]);
  const impact = useMemo(
    () => calculateAmortizationImpact(rows, [...manualEvents, ...fgtsEvents]),
    [fgtsEvents, manualEvents, rows]
  );
  const hasActiveManualContributions = useMemo(
    () => hasActiveContributions(manualEvents, "MANUAL", inputs.prazoMeses),
    [inputs.prazoMeses, manualEvents]
  );
  const hasActiveFgts = useMemo(
    () => hasActiveContributions(fgtsEvents, "FGTS", inputs.prazoMeses),
    [fgtsEvents, inputs.prazoMeses]
  );
  const validation = useMemo(() => buildValidation(inputs), [inputs]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        inputs,
        manualEvents,
        fgtsEvents
      })
    );
  }, [fgtsEvents, inputs, manualEvents]);

  function resetSimulation() {
    setInputs(defaultInputs);
    setValorFinanciadoInput(formatInputCurrencyBR(defaultInputs.valorFinanciado));
    setPrazoMesesInput(String(defaultInputs.prazoMeses));
    setTaxaAnualInput(formatInputPercentBR(defaultInputs.taxaAnual));
    setManualEvents([]);
    setFgtsEvents([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  function handleValorFinanciadoInputChange(value: string) {
    const sanitized = value.replace(/[^\d.,R$\s]/g, "");
    setValorFinanciadoInput(sanitized);
    setInputs((current) => ({
      ...current,
      valorFinanciado: Math.max(0, parseNumberBR(sanitized))
    }));
  }

  function handleValorFinanciadoBlur() {
    setValorFinanciadoInput(formatInputCurrencyBR(inputs.valorFinanciado));
  }

  function handlePrazoMesesInputChange(value: string) {
    const sanitized = value.replace(/\D/g, "");
    setPrazoMesesInput(sanitized);
    const parsed = parseIntegerBR(sanitized);
    const prazoMeses = Math.min(420, Math.max(1, parsed || 1));
    setInputs((current) => ({ ...current, prazoMeses }));
  }

  function handlePrazoMesesBlur() {
    const prazoMeses = Math.min(420, Math.max(1, parseIntegerBR(prazoMesesInput) || 1));
    setInputs((current) => ({ ...current, prazoMeses }));
    setPrazoMesesInput(String(prazoMeses));
  }

  function handleTaxaAnualInputChange(value: string) {
    const sanitized = value.replace(/[^\d.,]/g, "");
    setTaxaAnualInput(sanitized);
    setInputs((current) => ({
      ...current,
      taxaAnual: Math.max(0, parsePercentBR(sanitized))
    }));
  }

  function handleTaxaAnualBlur() {
    setTaxaAnualInput(formatInputPercentBR(inputs.taxaAnual));
  }

  function handleSendToAmortization(result: SimulationResult) {
    const hasCurrentSimulation =
      inputs.nomeCliente.trim() ||
      inputs.valorFinanciado !== defaultInputs.valorFinanciado ||
      inputs.prazoMeses !== defaultInputs.prazoMeses ||
      inputs.taxaAnual !== defaultInputs.taxaAnual ||
      inputs.sistema !== defaultInputs.sistema ||
      hasActiveManualContributions ||
      hasActiveFgts;

    if (
      hasCurrentSimulation &&
      !window.confirm("Deseja substituir os dados atuais da planilha de amortização pelos dados desta simulação?")
    ) {
      return;
    }

    const nextInputs: FinancingInputs = {
      nomeCliente: result.nomeCompleto,
      valorFinanciado: result.valorFinanciado,
      prazoMeses: result.nParcelas,
      taxaAnual: result.taxaAno,
      sistema: result.sistemaAmortizadorAplicado
    };

    localStorage.setItem(
      "goodcredit_amortization_prefill",
      JSON.stringify({
        nomeCliente: nextInputs.nomeCliente,
        valorFinanciado: nextInputs.valorFinanciado,
        prazoMeses: nextInputs.prazoMeses,
        taxaAnual: nextInputs.taxaAnual,
        sistema: nextInputs.sistema
      })
    );
    setInputs(nextInputs);
    setValorFinanciadoInput(formatInputCurrencyBR(nextInputs.valorFinanciado));
    setPrazoMesesInput(String(nextInputs.prazoMeses));
    setTaxaAnualInput(formatInputPercentBR(nextInputs.taxaAnual));
    navigateTo("amortization");
  }

  function importFgtsProjection() {
    const raw = localStorage.getItem("goodcredit_fgts_amortization_prefill");
    if (!raw) {
      navigateTo("amortization");
      return;
    }

    try {
      const prefill = JSON.parse(raw) as FgtsAmortizationPrefill;
      const incoming = prefill.events.filter(
        (event) => event.month >= 1 && event.month <= inputs.prazoMeses && event.amount > 0
      );
      if (!incoming.length) {
        window.alert("Nenhum aporte válido foi encontrado dentro do prazo atual da planilha.");
        return;
      }

      let mode: "replace" | "sum" = "replace";
      if (hasActiveFgts) {
        const choice = window.prompt(
          "Já existem aportes de FGTS nesta simulação. Digite SUBSTITUIR, SOMAR ou CANCELAR.",
          "CANCELAR"
        )?.trim().toUpperCase();
        if (!choice || choice === "CANCELAR") return;
        if (choice !== "SUBSTITUIR" && choice !== "SOMAR") {
          window.alert("Opção não reconhecida. A importação foi cancelada.");
          return;
        }
        mode = choice === "SOMAR" ? "sum" : "replace";
      }

      const next = mode === "sum" ? { ...fgtsContributions } : {};
      incoming.forEach((event) => {
        next[event.month] = mode === "sum" ? (next[event.month] || 0) + event.amount : event.amount;
      });
      setFgtsEvents(contributionMapToEvents(next, "FGTS"));
      if (prefill.clientName && (!inputs.nomeCliente || mode === "replace")) {
        setInputs((current) => ({ ...current, nomeCliente: prefill.clientName }));
      }
      localStorage.removeItem("goodcredit_fgts_amortization_prefill");
      navigateTo("amortization");
    } catch {
      localStorage.removeItem("goodcredit_fgts_amortization_prefill");
      window.alert("Não foi possível importar o cronograma de FGTS.");
    }
  }

  function clearManualContributions() {
    if (!window.confirm("Deseja remover todos os aportes manuais desta simulação?")) return;
    setManualEvents([]);
  }

  function clearFgtsContributions() {
    if (!window.confirm("Deseja remover todos os aportes de FGTS desta simulação?")) return;
    setFgtsEvents([]);
  }

  function clearAllContributions() {
    if (!window.confirm("Deseja remover todos os aportes manuais e de FGTS desta simulação?")) return;
    setManualEvents([]);
    setFgtsEvents([]);
  }

  async function generatePdf() {
    if (validation.length > 0 || isGeneratingPdf) return;
    setIsGeneratingPdf(true);

    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 14;
      let y = 14;

      const logoDataUrl = await getLogoDataUrl();
      if (logoDataUrl) {
        pdf.addImage(logoDataUrl, "PNG", margin, y, 34, 22);
      } else {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        pdf.setTextColor(84, 163, 76);
        pdf.text("GoodCredit", margin, y + 10);
      }

      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.text("Simulação de Amortização", margin, y + 32);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Cliente: ${inputs.nomeCliente || "Não informado"}`, margin, y + 40);
      pdf.text(`Data da geração: ${new Date().toLocaleDateString("pt-BR")}`, margin, y + 46);

      y += 58;
      const monthlyRate = calcMonthlyRate(inputs.taxaAnual);
      const leftFacts = [
        ["Sistema", inputs.sistema],
        ["Valor financiado", formatCurrencyBR(inputs.valorFinanciado)],
        ["Prazo", `${inputs.prazoMeses} meses`],
        ["Taxa anual", formatPercentBR(inputs.taxaAnual)],
        ["Taxa mensal", formatPercentBR(monthlyRate)],
        ["Total original", formatCurrencyBR(impact.originalProjectedTotal)]
      ];
      const rightFacts = [
        ["Total amortizado", formatCurrencyBR(impact.totalAmortizationApplied)],
        ["Aportes manuais", formatCurrencyBR(impact.manualAmortizationApplied)],
        ["FGTS utilizado", formatCurrencyBR(impact.fgtsAmortizationApplied)],
        ["Economia de juros", formatCurrencyBR(impact.interestSavings)],
        ["Prazo corrigido", `${impact.correctedTermMonths} meses`],
        ["Parcelas eliminadas", `${impact.eliminatedInstallments} parcelas`]
      ];

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(15, 23, 42);
      pdf.text("Impacto das Amortizações", margin, y);
      y += 5;
      pdf.setDrawColor(226, 232, 240);
      pdf.roundedRect(margin, y, pageWidth - margin * 2, 52, 2, 2, "S");
      pdf.setFontSize(9);
      [...leftFacts, ...rightFacts].forEach(([label, value], index) => {
        const colX = index < leftFacts.length ? margin + 6 : margin + 94;
        const rowY = y + 8 + (index % leftFacts.length) * 7;
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(71, 85, 105);
        pdf.text(`${label}:`, colX, rowY);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(15, 23, 42);
        pdf.text(value, colX + 43, rowY);
      });

      y += 59;
      pdf.setFontSize(9);
      pdf.setTextColor(71, 85, 105);
      pdf.text(`Redução do custo total: ${formatCurrencyBR(impact.totalCostReduction)} (${formatPercentBR(impact.totalCostReductionPercent)})`, margin, y);
      pdf.text(`Novo total projetado: ${formatCurrencyBR(impact.correctedProjectedTotal)}`, margin + 100, y);
      y += 7;
      if (impact.payoffMonth) {
        pdf.setTextColor(21, 128, 61);
        pdf.text(`Financiamento quitado na parcela ${impact.payoffMonth}.`, margin, y);
        y += 7;
      }
      const chartElement = document.getElementById("chart-section");
      if (chartElement) {
        const canvas = await html2canvas(chartElement, { scale: 2, backgroundColor: "#ffffff" });
        const image = canvas.toDataURL("image/png");
        const imageWidth = pageWidth - margin * 2;
        const imageHeight = Math.min(70, (canvas.height * imageWidth) / canvas.width);
        pdf.addImage(image, "PNG", margin, y, imageWidth, imageHeight);
        y += imageHeight + 10;
      }

      if (y > 180) {
        pdf.addPage();
        y = 18;
      }

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.setTextColor(15, 23, 42);
      pdf.text("Parcelas principais", margin, y);
      y += 7;

      const keyMonths = Array.from(
        new Set([
          1,
          Math.ceil(inputs.prazoMeses * 0.25),
          Math.ceil(inputs.prazoMeses * 0.5),
          impact.correctedTermMonths,
          inputs.prazoMeses
        ])
      )
        .filter((month) => month >= 1 && month <= impact.correctedTermMonths)
        .sort((a, b) => a - b);
      const tableRows = keyMonths.map((month) => rows[month - 1]);
      const columns = ["Parcela", "Original", "Com amort.", "Juros sim.", "Saldo sim."];
      const widths = [22, 40, 42, 38, 42];
      let x = margin;

      pdf.setFillColor(35, 119, 164);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      columns.forEach((column, index) => {
        pdf.rect(x, y, widths[index], 7, "F");
        pdf.text(column, x + 2, y + 5);
        x += widths[index];
      });
      y += 7;

      pdf.setTextColor(15, 23, 42);
      pdf.setFont("helvetica", "normal");
      tableRows.forEach((row) => {
        x = margin;
        const values = [
          String(row.month),
          formatCurrencyBR(row.contractInstallment),
          formatCurrencyBR(row.simulatedInstallment),
          formatCurrencyBR(row.simulatedInterest),
          formatCurrencyBR(row.simulatedFinalBalance)
        ];
        values.forEach((value, index) => {
          pdf.rect(x, y, widths[index], 8);
          pdf.text(value, x + 2, y + 5.5);
          x += widths[index];
        });
        y += 8;
      });

      y += 5;
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(15, 23, 42);
      pdf.text("Metodologia e aportes não utilizados", margin, y);
      y += 5;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(71, 85, 105);
      const methodology = `As parcelas corrigidas já incluem os aportes efetivamente aplicados, sem dupla contagem. Manual é aplicado antes do FGTS. Não utilizado: manual ${formatCurrencyBR(impact.unusedManualAmount)}; FGTS ${formatCurrencyBR(impact.unusedFgtsAmount)}.`;
      pdf.text(pdf.splitTextToSize(methodology, pageWidth - margin * 2), margin, y);
      y += 9;
      pdf.text(pdf.splitTextToSize("Valores configurados acima do saldo necessário para quitação ou após o encerramento do financiamento não foram considerados como efetivamente utilizados.", pageWidth - margin * 2), margin, y);

      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text("Relatório gerado localmente no GoodCredit Hub. Simulação meramente informativa.", margin, 288);
      pdf.save(`goodcredit-simulacao-${inputs.nomeCliente || "cliente"}.pdf`);
    } finally {
      setIsGeneratingPdf(false);
    }
  }

  const summaryCards = [
    { label: "Prazo e sistema", value: `${summary.prazoAtual}/${summary.prazoOriginal} meses`, detail: summary.sistema, tone: "blue" as const },
    { label: "Valor financiado", value: formatCurrencyBR(summary.valorFinanciado), tone: "slate" as const },
    { label: "Juros do contrato", value: formatCurrencyBR(summary.jurosContrato), tone: "slate" as const },
    { label: "Total original", value: formatCurrencyBR(summary.totalOriginal), tone: "slate" as const },
    { label: "Juros com amortizações", value: formatCurrencyBR(summary.jurosPago), tone: "green" as const },
    { label: "Total com amortizações", value: formatCurrencyBR(summary.totalPago), tone: "green" as const },
    { label: "Economia de juros", value: formatCurrencyBR(summary.economiaJuros), tone: "green" as const },
    { label: "Redução de parcelas", value: `${summary.reducaoParcelas} parcelas`, tone: "blue" as const },
    { label: "Redução de juros", value: formatPercentBR(summary.percentualReducaoJuros), tone: "green" as const },
    { label: "Redução de parcelas", value: formatPercentBR(summary.percentualReducaoParcelas), tone: "blue" as const }
  ];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Sidebar activeView={activeView} onNavigate={navigateTo} />

      <div className="lg:pl-72">
        <div className="border-b border-slate-200 bg-white px-4 py-4 lg:hidden">
          <div className="text-xl font-bold text-goodgreen-600">GoodCredit</div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Hub</div>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => navigateTo("home")}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${activeView === "home" ? "bg-goodgreen-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              Início
            </button>
            <button
              type="button"
              onClick={() => navigateTo("amortization")}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${activeView === "amortization" ? "bg-goodgreen-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              Amortização
            </button>
            <button
              type="button"
              onClick={() => navigateTo("simulation")}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${activeView === "simulation" ? "bg-goodgreen-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              Simulação
            </button>
            <button
              type="button"
              onClick={() => navigateTo("pro-soluto")}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-bold ${activeView === "pro-soluto" ? "bg-goodgreen-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              Pró-Soluto
            </button>
            <button
              type="button"
              onClick={() => navigateTo("checklist")}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${activeView === "checklist" ? "bg-goodgreen-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              Checklist
            </button>
            <button
              type="button"
              onClick={() => navigateTo("fgts")}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${activeView === "fgts" ? "bg-goodgreen-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              FGTS
            </button>
            <button
              type="button"
              onClick={() => navigateTo("income-analysis")}
              className={`rounded-lg px-3 py-2 text-sm font-bold ${activeView === "income-analysis" ? "bg-goodgreen-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              Renda
            </button>
          </div>
        </div>

        {activeView === "home" ? (
          <HomePage onNavigate={navigateTo} />
        ) : activeView === "checklist" ? (
          <ChecklistPage />
        ) : activeView === "simulation" ? (
          <SimulationPage onSendToAmortization={handleSendToAmortization} />
        ) : activeView === "pro-soluto" ? (
          <ProSolutoPage />
        ) : activeView === "fgts" ? (
          <FgtsPage onSendToAmortization={importFgtsProjection} />
        ) : activeView === "income-analysis" ? (
          <IncomeAnalysisPage onSendToSimulation={() => navigateTo("simulation")} />
        ) : (
          <>
            <Header
              nomeCliente={inputs.nomeCliente}
              sistema={inputs.sistema}
              onClientNameChange={(nomeCliente) => setInputs({ ...inputs, nomeCliente })}
              onSystemChange={(sistema) => setInputs({ ...inputs, sistema })}
              onManualConfig={() => setManualModalOpen(true)}
              onFgtsConfig={() => setFgtsModalOpen(true)}
              onGeneratePdf={generatePdf}
              onReset={resetSimulation}
              hasActiveManualContributions={hasActiveManualContributions}
              hasActiveFgts={hasActiveFgts}
            />

            <main className="mx-auto flex max-w-[1700px] flex-col gap-6 px-4 py-6 sm:px-6 xl:px-8">
              <InputCard
                inputs={inputs}
                valorFinanciadoInput={valorFinanciadoInput}
                prazoMesesInput={prazoMesesInput}
                taxaAnualInput={taxaAnualInput}
                onValorFinanciadoInputChange={handleValorFinanciadoInputChange}
                onValorFinanciadoBlur={handleValorFinanciadoBlur}
                onPrazoMesesInputChange={handlePrazoMesesInputChange}
                onPrazoMesesBlur={handlePrazoMesesBlur}
                onTaxaAnualInputChange={handleTaxaAnualInputChange}
                onTaxaAnualBlur={handleTaxaAnualBlur}
                errors={validation}
              />

              {(hasActiveManualContributions || hasActiveFgts) && (
                <AmortizationImpact
                  impact={impact}
                  hasManual={hasActiveManualContributions}
                  hasFgts={hasActiveFgts}
                  onClearManual={clearManualContributions}
                  onClearFgts={clearFgtsContributions}
                  onClearAll={clearAllContributions}
                />
              )}

              <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {summaryCards.map((card) => (
                  <SummaryCard key={`${card.label}-${card.value}`} {...card} />
                ))}
              </section>

              <EvolutionChart rows={rows} />

              <AmortizationTable
                rows={rows}
                onManualContributionChange={(month, value) =>
                  setManualEvents((current) => upsertContributionEvent(current, "MANUAL", month, value))
                }
                onFgtsContributionChange={(month, value) =>
                  setFgtsEvents((current) => upsertContributionEvent(current, "FGTS", month, value))
                }
              />
            </main>
          </>
        )}
      </div>

      <ManualContributionModal
        isOpen={manualModalOpen}
        prazoMeses={inputs.prazoMeses}
        events={manualEvents}
        effectiveUsed={impact.manualAmortizationApplied}
        onClose={() => setManualModalOpen(false)}
        onApply={setManualEvents}
        onClear={() => setManualEvents([])}
      />
      <FgtsContributionModal
        isOpen={fgtsModalOpen}
        prazoMeses={inputs.prazoMeses}
        events={fgtsEvents}
        effectiveUsed={impact.fgtsAmortizationApplied}
        onClose={() => setFgtsModalOpen(false)}
        onApply={setFgtsEvents}
        onClear={() => setFgtsEvents([])}
      />
    </div>
  );
}
