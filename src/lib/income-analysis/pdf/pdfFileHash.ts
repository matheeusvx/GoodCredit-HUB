import { PdfImportFileRecord } from "../../../types/pdfImport";
import { PDF_IMPORT_HISTORY_KEY } from "./pdfConfig";

export async function hashPdfFile(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function readPdfImportHistory(): PdfImportFileRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PDF_IMPORT_HISTORY_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 30) : [];
  } catch {
    return [];
  }
}

export function rememberPdfImport(record: PdfImportFileRecord): void {
  const history = readPdfImportHistory().filter((item) => item.hash !== record.hash);
  localStorage.setItem(PDF_IMPORT_HISTORY_KEY, JSON.stringify([record, ...history].slice(0, 30)));
}
