import { parseNumberBR } from "../simulation/formatters";
import { ProSolutoForm } from "../../types/proSoluto";
import { SimulationFormData } from "../../types/simulation";
import { INITIAL_PRO_SOLUTO_FORM } from "./proSolutoStorage";

export function buildProSolutoFormFromSimulation(
  simulation: Partial<SimulationFormData>
): ProSolutoForm {
  const sellerReceivableAmount = parseNumberBR(simulation.valorImovelInput || "");
  const approvedCreditAmount = parseNumberBR(simulation.valorFinanciamentoInput || "");
  const fgtsAmount =
    simulation.possuiFgts === "SIM" ? parseNumberBR(simulation.saldoFgtsInput || "") : 0;
  const paidEntryAmount =
    simulation.pretendeEntrada === "SIM" ? parseNumberBR(simulation.valorEntradaInput || "") : 0;

  return {
    ...INITIAL_PRO_SOLUTO_FORM,
    clientName: simulation.nomeCompleto || "",
    sellerReceivableAmount,
    approvedCreditAmount: approvedCreditAmount > 0 ? approvedCreditAmount : null,
    fgtsAmount,
    paidEntryAmount
  };
}
