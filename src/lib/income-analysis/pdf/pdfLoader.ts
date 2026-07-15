import { GlobalWorkerOptions, getDocument, PasswordResponses, type PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { PdfImportError } from "../../../types/pdfImport";

GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export interface LoadedPdf {
  document: PDFDocumentProxy;
  bytes: Uint8Array;
}

export async function loadPdfFile(file: File, password?: string): Promise<LoadedPdf> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const task = getDocument({ data: bytes.slice(), password: password || undefined });
    const document = await task.promise;
    return { document, bytes };
  } catch (error) {
    throw mapPdfLoadError(error);
  }
}

function mapPdfLoadError(error: unknown): PdfImportError {
  const candidate = error as { name?: string; code?: number; message?: string };
  if (candidate.code === PasswordResponses.INCORRECT_PASSWORD) {
    return { code: "WRONG_PASSWORD", message: "Senha incorreta. Tente novamente ou escolha outro arquivo." };
  }
  if (candidate.name === "PasswordException" || candidate.code === PasswordResponses.NEED_PASSWORD) {
    return { code: "PASSWORD_REQUIRED", message: "Este PDF é protegido. Informe a senha para continuar." };
  }
  if (/worker/i.test(candidate.message || "")) return { code: "WORKER_ERROR", message: "Não foi possível iniciar o leitor local de PDF." };
  return { code: "CORRUPTED_PDF", message: "Não foi possível abrir o PDF. Verifique se o arquivo está corrompido ou protegido." };
}
