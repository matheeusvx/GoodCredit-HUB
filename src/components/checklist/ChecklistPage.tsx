import { useEffect, useMemo, useState } from "react";
import { generateChecklist } from "../../lib/checklist/generateChecklist";
import { ChecklistFormData, GeneratedChecklist } from "../../types/checklist";
import { ChecklistActions } from "./ChecklistActions";
import { ChecklistConfigForm } from "./ChecklistConfigForm";
import { ChecklistResult } from "./ChecklistResult";

const FORM_STORAGE_KEY = "goodcredit-hub-checklist-form-v1";
const CHECKED_STORAGE_KEY = "goodcredit-hub-checklist-checked-v1";

const defaultForm: ChecklistFormData = {
  nome: "",
  participantType: "",
  personType: "",
  profile: "",
  banco: "NAO_INFORMADO",
  usaFgts: "NAO",
  tipoOperacao: "NAO_INFORMADO",
  possuiProcurador: "NAO",
  precisaMatriculaAtualizada: "NAO"
};

function readStoredForm(): ChecklistFormData {
  try {
    const stored = localStorage.getItem(FORM_STORAGE_KEY);
    return stored ? { ...defaultForm, ...JSON.parse(stored) } : defaultForm;
  } catch {
    return defaultForm;
  }
}

function readCheckedItems(): Record<string, boolean> {
  try {
    const stored = localStorage.getItem(CHECKED_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

export function ChecklistPage() {
  const [form, setForm] = useState<ChecklistFormData>(() => readStoredForm());
  const [checklist, setChecklist] = useState<GeneratedChecklist | null>(null);
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => readCheckedItems());
  const [submitted, setSubmitted] = useState(false);
  const errors = useMemo(() => validateForm(form), [form]);

  useEffect(() => {
    localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  useEffect(() => {
    localStorage.setItem(CHECKED_STORAGE_KEY, JSON.stringify(checkedItems));
  }, [checkedItems]);

  function patchForm(patch: Partial<ChecklistFormData>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function handleGenerate() {
    setSubmitted(true);
    if (errors.length > 0) return;
    setChecklist(generateChecklist(form));
    setCheckedItems({});
  }

  function handleClear() {
    setForm(defaultForm);
    setChecklist(null);
    setCheckedItems({});
    setSubmitted(false);
    localStorage.removeItem(FORM_STORAGE_KEY);
    localStorage.removeItem(CHECKED_STORAGE_KEY);
  }

  function toggleItem(itemKey: string) {
    setCheckedItems((current) => ({ ...current, [itemKey]: !current[itemKey] }));
  }

  return (
    <div>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1700px] flex-col gap-5 px-4 py-5 sm:px-6 xl:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-goodgreen-600">GoodCredit Hub</p>
              <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">Checklist Documental</h1>
              <p className="mt-1 text-sm text-slate-600">Gere a lista de documentos conforme o perfil da operação</p>
            </div>
            <ChecklistActions checklist={checklist} onGenerate={handleGenerate} onClear={handleClear} />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1700px] gap-6 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(360px,0.92fr)_1.08fr] xl:px-8">
        <ChecklistConfigForm form={form} onChange={patchForm} errors={submitted ? errors : []} />
        <div>
          {checklist ? (
            <ChecklistResult checklist={checklist} checkedItems={checkedItems} onToggleItem={toggleItem} />
          ) : (
            <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center shadow-panel">
              <p className="text-lg font-bold text-slate-950">Configure e gere o checklist</p>
              <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
                O resultado aparecerá aqui com documentos agrupados por categoria, alertas aplicáveis e regras de envio.
              </p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

function validateForm(form: ChecklistFormData): string[] {
  const errors: string[] = [];
  if (!form.participantType) errors.push("Tipo de participante obrigatório.");
  if (!form.personType) errors.push("Tipo de pessoa obrigatório.");
  if (!form.profile) errors.push("Perfil obrigatório.");

  if (form.participantType === "COMPRADOR" && form.profile === "VENDEDOR_PJ") {
    errors.push("Para comprador, selecione um perfil de comprador.");
  }

  if (form.participantType === "VENDEDOR" && form.profile !== "VENDEDOR_PJ") {
    errors.push("Para vendedor, selecione o perfil Vendedor Pessoa Jurídica.");
  }

  if (form.profile === "VENDEDOR_PJ" && form.personType !== "PJ") {
    errors.push("Vendedor Pessoa Jurídica exige tipo de pessoa PJ.");
  }

  if ((form.profile === "COMPRADOR_CLT" || form.profile === "COMPRADOR_AUTONOMO") && form.personType !== "PF") {
    errors.push("Perfis de comprador desta versão usam Pessoa Física.");
  }

  return errors;
}
