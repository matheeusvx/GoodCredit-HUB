import { useRef, useState } from "react";
import { FileUp, ShieldCheck } from "lucide-react";

export function PdfFileDropzone({ disabled, onFile }: { disabled: boolean; onFile: (file: File) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return <div
    className={`rounded-xl border-2 border-dashed p-7 text-center transition ${dragging ? "border-emerald-500 bg-emerald-50" : "border-slate-300 bg-slate-50"}`}
    onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
    onDragLeave={() => setDragging(false)}
    onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file && !disabled) onFile(file); }}
  >
    <FileUp className="mx-auto h-9 w-9 text-emerald-600" />
    <p className="mt-3 font-semibold text-slate-900">Arraste um extrato em PDF para esta área</p>
    <p className="mt-1 text-sm text-slate-500">Um arquivo por processamento, com até 20 MB.</p>
    <button type="button" className="btn-primary mt-4" disabled={disabled} onClick={() => inputRef.current?.click()}>Escolher arquivo</button>
    <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file); event.currentTarget.value = ""; }} />
    <p className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500"><ShieldCheck className="h-4 w-4 text-emerald-600" /> O PDF é processado localmente e não é enviado nem armazenado pela plataforma.</p>
  </div>;
}
