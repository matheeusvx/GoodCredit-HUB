import { Banknote, Home, Landmark, ReceiptText } from "lucide-react";
import { FGTS_INSTITUTIONAL_NOTICE } from "../../lib/fgts/fgtsRules";

const cards = [
  { title: "Aquisição", text: "O saldo do FGTS pode compor os recursos utilizados na aquisição da moradia própria, desde que o trabalhador, o imóvel e a operação atendam às regras vigentes.", icon: Home },
  { title: "Amortização", text: "O saldo disponível pode ser utilizado para reduzir o saldo devedor do financiamento, observando o intervalo mínimo aplicável.", icon: Banknote },
  { title: "Liquidação", text: "O FGTS pode ser utilizado para quitar integralmente o saldo devedor, conforme o enquadramento do contrato.", icon: Landmark },
  { title: "Parte das prestações", text: "O FGTS pode pagar parte das prestações dentro dos limites e do período permitidos pelas regras da modalidade.", icon: ReceiptText }
];

export function FgtsOverview() {
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{cards.map(({ title, text, icon: Icon }) => <article key={title} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-goodgreen-50 text-goodgreen-700"><Icon className="h-5 w-5" /></div><h3 className="mt-4 font-bold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></article>)}</div><div className="rounded-lg border border-goodblue-100 bg-goodblue-50 p-4 text-sm leading-6 text-goodblue-800">{FGTS_INSTITUTIONAL_NOTICE}</div></div>;
}
