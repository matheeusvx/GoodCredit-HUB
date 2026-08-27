import { createClient } from "@supabase/supabase-js";
import {
  createSupabaseProvisionRepository,
  printReport,
  provisionCrmHubUsers,
  sanitizeErrorMessage,
} from "./lib/crm-hub-user-provisioning.mjs";

async function main() {
  const unexpectedArguments = process.argv.slice(2).filter((argument) => argument !== "--apply");
  const apply = process.argv.includes("--apply");

  console.log("\nCRM Hub User Provisioning");
  console.log(`Mode: ${apply ? "APPLY" : "DRY RUN"}\n`);

  if (unexpectedArguments.length) {
    throw new Error(`Argumento não reconhecido: ${unexpectedArguments.join(", ")}`);
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
  const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
  if (!supabaseUrl) throw new Error("Missing SUPABASE_URL");
  if (!serviceRoleKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const report = await provisionCrmHubUsers({
    repository: createSupabaseProvisionRepository(supabase),
    apply,
  });
  printReport(report);
  if (report.summary.conflicts || report.summary.failures) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  console.error(`Provisionamento CRM falhou: ${sanitizeErrorMessage(error)}`);
  process.exitCode = 1;
}
