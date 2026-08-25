import { assertSyncConfig } from "../_lib/config.js";
import {
  bearerToken,
  headerValue,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "../_lib/http.js";
import { runCrmSync } from "../_lib/sync.js";

async function secureEqual(left: string, right: string): Promise<boolean> {
  if (!left || !right) return false;
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(left)),
    crypto.subtle.digest("SHA-256", encoder.encode(right)),
  ]);
  const leftBytes = new Uint8Array(leftHash);
  const rightBytes = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Método não permitido." });
    return;
  }
  let config;
  try {
    config = assertSyncConfig();
  } catch {
    sendJson(response, 503, { error: "Integração CRM não configurada." });
    return;
  }
  const suppliedSecret = headerValue(request, "x-crm-sync-secret")
    || bearerToken(request)
    || "";
  if (!(await secureEqual(suppliedSecret, config.crmSyncSecret))) {
    sendJson(response, 401, { error: "Não autorizado." });
    return;
  }
  const mode = request.query?.mode === "bootstrap" ? "bootstrap" : "incremental";
  try {
    const result = await runCrmSync({ mode });
    sendJson(response, 200, result);
  } catch {
    sendJson(response, 503, { error: "Falha na sincronização do CRM." });
  }
}
