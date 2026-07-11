import { FgtsEligibilityForm, FgtsEligibilityResult } from "../../types/fgts";
import { FGTS_USAGE_LABELS } from "../../lib/fgts/fgtsRules";

interface Props { form: FgtsEligibilityForm; result: FgtsEligibilityResult; onChange: (form: FgtsEligibilityForm) => void; }
const questions: Array<[keyof FgtsEligibilityForm, string]> = [
  ["employmentThreeYears", "Possui pelo menos 3 anos de trabalho sob o regime do FGTS?"],
  ["activeSfhFinancing", "Possui financiamento imobiliário ativo no SFH?"],
  ["ownsHomeResidenceCity", "Possui imóvel residencial no município em que reside?"],
  ["ownsHomeWorkCity", "Possui imóvel residencial no município em que trabalha?"],
  ["ownsHomeNearbyCity", "Possui imóvel em município limítrofe ou na mesma Região Metropolitana?"],
  ["ownHousingPurpose", "O imóvel será destinado à moradia própria?"],
  ["contractEligible", "O contrato está enquadrado para uso do FGTS?"]
];
const selectClass = "h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none focus:border-goodgreen-500 focus:ring-4 focus:ring-goodgreen-500/10";

export function FgtsEligibilityCard({ form, result, onChange }: Props) {
  const tone = result.status === "POSSIBLE_BARRIER" ? "border-rose-200 bg-rose-50 text-rose-800" : result.status === "ELIGIBLE_INDICATIONS" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800";
  return <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-xl font-bold">Verificação Inicial de Elegibilidade</h2><p className="mt-1 text-sm text-slate-500">Triagem orientativa sujeita à validação do agente financeiro.</p><div className="mt-5 grid gap-4 md:grid-cols-2">{questions.map(([key, label]) => <label key={key} className="flex flex-col gap-2 text-sm font-semibold text-slate-700"><span>{label}</span><select className={selectClass} value={String(form[key])} onChange={(event) => onChange({ ...form, [key]: event.target.value })}><option value="UNKNOWN">Não sei</option><option value="YES">Sim</option><option value="NO">Não</option></select></label>)}<label className="flex flex-col gap-2 text-sm font-semibold text-slate-700"><span>Modalidade pretendida</span><select className={selectClass} value={form.usageMode} onChange={(event) => onChange({ ...form, usageMode: event.target.value as FgtsEligibilityForm["usageMode"] })}><option value="">Selecione</option>{Object.entries(FGTS_USAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>{form.usageMode === "AMORTIZATION" && <label className="flex flex-col gap-2 text-sm font-semibold text-slate-700"><span>As prestações estão em dia?</span><select className={selectClass} value={form.installmentsCurrent} onChange={(event) => onChange({ ...form, installmentsCurrent: event.target.value as FgtsEligibilityForm["installmentsCurrent"] })}><option value="NOT_APPLICABLE">Não se aplica</option><option value="YES">Sim</option><option value="NO">Não</option></select></label>}</div><div className={`mt-5 rounded-lg border p-4 ${tone}`}><p className="font-bold">{result.label}</p><ul className="mt-2 space-y-1 text-sm leading-6">{result.messages.map((message) => <li key={message}>• {message}</li>)}</ul></div></section>;
}
