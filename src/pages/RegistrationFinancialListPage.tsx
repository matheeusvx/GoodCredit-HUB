import { useCallback, useEffect, useState } from "react";
import { CashFlowTab } from "../components/registration-financial/CashFlowTab";
import { ControlProcessesTab } from "../components/registration-financial/ControlProcessesTab";
import { FinancialReportTab } from "../components/registration-financial/FinancialReportTab";
import { OperationalPaymentDialog, type OperationalPaymentRequest } from "../components/registration-financial/OperationalPaymentDialog";
import { RegistrationFinancialTabs, type RegistrationFinancialTab } from "../components/registration-financial/RegistrationFinancialTabs";
import { navigateRegistration, registrationFinancialEditorPath } from "../lib/registration/financial/navigation";
import {
  createFinancialTransaction, listMyFinancialWorkspaceData, registerOperationalPayment,
  updateFinancialCaseFields, updateFinancialTransaction, type RegistrationOperationalCasePatch
} from "../services/registrationFinancialService";
import type { RegistrationFinancialCaseWithMetrics, RegistrationFinancialTransaction, RegistrationFinancialTransactionInput } from "../types/registrationFinancial";

function tabFromUrl(): RegistrationFinancialTab {
  const value = new URLSearchParams(window.location.search).get("aba");
  return value === "movimentacoes" ? "CASH_FLOW" : value === "relatorio" ? "REPORT" : "PROCESSES";
}

export function RegistrationFinancialListPage() {
  const [tab,setTab]=useState<RegistrationFinancialTab>(tabFromUrl);const [records,setRecords]=useState<RegistrationFinancialCaseWithMetrics[]>([]);const [transactions,setTransactions]=useState<RegistrationFinancialTransaction[]>([]);const [loading,setLoading]=useState(true);const [message,setMessage]=useState("");const [paymentRequest,setPaymentRequest]=useState<OperationalPaymentRequest|null>(null);
  const load=useCallback(async()=>{setLoading(true);try{const data=await listMyFinancialWorkspaceData();setRecords(data.records);setTransactions(data.transactions);setMessage("");}catch(error){setMessage(error instanceof Error?error.message:"Não foi possível carregar o Balancete Cartorial.");}finally{setLoading(false)}},[]);
  useEffect(()=>{void load()},[load]);
  function changeTab(next:RegistrationFinancialTab){setTab(next);const url=new URL(window.location.href);url.searchParams.set("aba",next==="PROCESSES"?"processos":next==="CASH_FLOW"?"movimentacoes":"relatorio");window.history.replaceState(window.history.state,"",`${url.pathname}${url.search}`)}
  async function quickUpdate(id:string,patch:RegistrationOperationalCasePatch){
    const current=records.find(record=>record.financialCase.id===id);if(!current)return;
    if(patch.paymentStatus){const expected=patch.paymentStatus==="FULL_PAYMENT"?"FULL_PAYMENT_TO_GOODCREDIT":patch.paymentStatus==="ADVISORY_ONLY"?"ADVISORY_ONLY":null;if(expected&&expected!==current.financialCase.operationMode&&window.confirm("O status de pagamento selecionado não corresponde à modalidade atual do balancete. Deseja atualizar a modalidade?"))patch={...patch,operationMode:expected};}
    const previous=records;setRecords(items=>items.map(record=>record.financialCase.id===id?{...record,financialCase:{...record.financialCase,...patch}}:record));
    try{await updateFinancialCaseFields(id,patch);await load()}catch(error){setRecords(previous);setMessage(error instanceof Error?error.message:"Não foi possível salvar a alteração.");throw error}
  }
  async function createTransaction(caseId:string,input:RegistrationFinancialTransactionInput){await createFinancialTransaction(caseId,input);await load()}
  async function updateTransaction(id:string,input:RegistrationFinancialTransactionInput){await updateFinancialTransaction(id,input);await load()}
  async function confirmPayment(value:{amountCents:number;date:string;paymentMethod:string;reference:string;notes:string}){if(!paymentRequest)return;await registerOperationalPayment({...paymentRequest,...value});await load()}
  return <div className="space-y-5"><RegistrationFinancialTabs value={tab} onChange={changeTab}/>{message&&<div role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{message}</div>}{loading?<div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Carregando processos...</div>:tab==="PROCESSES"?<ControlProcessesTab records={records} onNew={()=>navigateRegistration("/registro/balancete/novo")} onOpen={id=>navigateRegistration(registrationFinancialEditorPath(id))} onQuickUpdate={quickUpdate} onPaymentRequest={setPaymentRequest}/>:tab==="CASH_FLOW"?<CashFlowTab records={records} transactions={transactions} onCreate={createTransaction} onUpdate={updateTransaction}/>:<FinancialReportTab records={records} transactions={transactions}/>} {paymentRequest&&<OperationalPaymentDialog request={paymentRequest} onClose={()=>setPaymentRequest(null)} onConfirm={confirmPayment}/>}</div>;
}
