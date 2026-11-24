import type React from "react";
import { ChecklistFormData, ChecklistProfile } from "../../types/checklist";

interface Props {
  form: ChecklistFormData;
  onChange: (patch: Partial<ChecklistFormData>) => void;
  errors: string[];
}

const profileOptions: Array<{ value: ChecklistProfile; label: string; participant: "COMPRADOR" | "VENDEDOR" }> = [
  { value: "COMPRADOR_CLT", label: "Empregado CLT", participant: "COMPRADOR" },
  { value: "COMPRADOR_AUTONOMO", label: "Profissional Autônomo", participant: "COMPRADOR" },
  { value: "VENDEDOR_PJ", label: "Pessoa Jurídica", participant: "VENDEDOR" }
];

export function ChecklistConfigForm({ form, onChange, errors }: Props) {
  const availableProfiles = profileOptions.filter((option) => !form.participantType || option.participant === form.participantType);

  return (
    <section className="space-y-5">
      {errors.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errors.join(" ")}
        </div>
      )}

      <div className="surface p-5 sm:p-6">
        <h2 className="text-base font-bold text-ink">Dados básicos</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="field">
            <span>Nome do cliente ou processo</span>
            <input value={form.nome} onChange={(event) => onChange({ nome: event.target.value })} />
          </label>
          <label className="field">
            <span>Tipo de participante</span>
            <select
              value={form.participantType}
              onChange={(event) => {
                const participantType = event.target.value as ChecklistFormData["participantType"];
                onChange({
                  participantType,
                  profile: participantType === "VENDEDOR" && form.personType === "PJ" ? "VENDEDOR_PJ" : ""
                });
              }}
              className="select-field"
            >
              <option value="">Selecione</option>
              <option value="COMPRADOR">Comprador</option>
              <option value="VENDEDOR">Vendedor</option>
            </select>
          </label>
          <label className="field">
            <span>Tipo de pessoa</span>
            <select
              value={form.personType}
              onChange={(event) => {
                const personType = event.target.value as ChecklistFormData["personType"];
                onChange({
                  personType,
                  profile: form.participantType === "VENDEDOR" && personType === "PJ" ? "VENDEDOR_PJ" : form.profile
                });
              }}
              className="select-field"
            >
              <option value="">Selecione</option>
              <option value="PF">Pessoa Física</option>
              <option value="PJ">Pessoa Jurídica</option>
            </select>
          </label>
        </div>
      </div>

      <div className="surface p-5 sm:p-6">
        <h2 className="text-base font-bold text-ink">Perfil documental</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {availableProfiles.map((option) => (
            <label
              key={option.value}
              className="flex h-12 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-ink-soft shadow-sm transition hover:border-slate-300 has-[:checked]:border-goodgreen-500 has-[:checked]:bg-goodgreen-50/60 has-[:checked]:text-goodgreen-800 has-[:checked]:ring-4 has-[:checked]:ring-goodgreen-100"
            >
              <input
                type="radio"
                checked={form.profile === option.value}
                onChange={() => onChange({ profile: option.value })}
                className="h-4 w-4 accent-goodgreen-600"
              />
              {option.label}
            </label>
          ))}
          <div className="flex h-12 items-center rounded-lg border border-dashed border-slate-200 px-4 text-sm text-slate-400">
            Outros perfis em breve
          </div>
        </div>
      </div>

      <ComplementaryRulesSection form={form} onChange={onChange} />
    </section>
  );
}

function ComplementaryRulesSection({
  form,
  onChange
}: {
  form: ChecklistFormData;
  onChange: (patch: Partial<ChecklistFormData>) => void;
}) {
  return (
    <div className="gc-rules-card">
      <div className="gc-rules-header">
        <h2 className="gc-rules-title">Regras complementares</h2>
        <p className="gc-rules-description">Ajustes adicionais que alteram alertas e documentos do checklist.</p>
      </div>

      <div className="gc-rules-grid">
        <FormFieldSelect
          label="Banco pretendido"
          value={form.banco}
          onChange={(banco) => onChange({ banco: banco as ChecklistFormData["banco"] })}
          className="gc-rule-bank"
        >
          <option value="NAO_INFORMADO">Não informado</option>
          <option value="CAIXA">Caixa</option>
          <option value="INTER">Inter</option>
          <option value="BRADESCO">Bradesco</option>
          <option value="ITAU">Itaú</option>
          <option value="SANTANDER">Santander</option>
        </FormFieldSelect>

        <FormFieldSelect
          label="Tipo de operação"
          value={form.tipoOperacao}
          onChange={(tipoOperacao) => onChange({ tipoOperacao: tipoOperacao as ChecklistFormData["tipoOperacao"] })}
          className="gc-rule-operation"
        >
          <option value="NAO_INFORMADO">Não informado</option>
          <option value="NOVO">Aquisição de Imóvel Novo</option>
          <option value="USADO">Aquisição de Imóvel Usado</option>
          <option value="TERRENO">Aquisição de Terreno</option>
        </FormFieldSelect>

        <FormFieldSelect
          label="Usa FGTS?"
          value={form.usaFgts}
          onChange={(usaFgts) => onChange({ usaFgts: usaFgts as ChecklistFormData["usaFgts"] })}
          className="gc-rule-fgts"
        >
          <option value="NAO">Não</option>
          <option value="SIM">Sim</option>
        </FormFieldSelect>

        <FormFieldSelect
          label="Possui procurador?"
          value={form.possuiProcurador}
          onChange={(possuiProcurador) =>
            onChange({ possuiProcurador: possuiProcurador as ChecklistFormData["possuiProcurador"] })
          }
          className="gc-rule-proxy"
        >
          <option value="NAO">Não</option>
          <option value="SIM">Sim</option>
        </FormFieldSelect>

        <FormFieldSelect
          label="Matrícula atualizada?"
          value={form.precisaMatriculaAtualizada}
          onChange={(precisaMatriculaAtualizada) =>
            onChange({
              precisaMatriculaAtualizada: precisaMatriculaAtualizada as ChecklistFormData["precisaMatriculaAtualizada"]
            })
          }
          className="gc-rule-registration"
        >
          <option value="NAO">Não</option>
          <option value="SIM">Sim</option>
        </FormFieldSelect>
      </div>
    </div>
  );
}

function FormFieldSelect({
  label,
  value,
  onChange,
  children,
  className = ""
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`gc-rule-field ${className}`}>
      <span className="gc-rule-label">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="gc-select"
      >
        {children}
      </select>
    </label>
  );
}
