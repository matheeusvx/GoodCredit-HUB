import { useState } from "react";
import { KeyRound } from "lucide-react";

export function PdfPasswordModal({ error, onSubmit, onCancel }: { error?: string; onSubmit: (password: string) => void; onCancel: () => void }) {
  const [password, setPassword] = useState("");
  return <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-slate-950/45 p-4">
    <form className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onSubmit={(event) => { event.preventDefault(); if (password) onSubmit(password); }}>
      <KeyRound className="h-7 w-7 text-emerald-600" />
      <h3 className="mt-3 text-lg font-bold text-slate-900">PDF protegido por senha</h3>
      <p className="mt-1 text-sm text-slate-500">A senha é usada somente em memória para abrir este arquivo.</p>
      <label className="mt-5 block text-sm font-semibold text-slate-700">Senha<input autoFocus type="password" className="input-field mt-2" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {error && <p className="mt-3 text-sm font-semibold text-rose-700">{error}</p>}
      <div className="mt-5 flex justify-end gap-3"><button type="button" className="btn-muted" onClick={onCancel}>Cancelar</button><button type="submit" className="btn-primary" disabled={!password}>Abrir PDF</button></div>
    </form>
  </div>;
}
