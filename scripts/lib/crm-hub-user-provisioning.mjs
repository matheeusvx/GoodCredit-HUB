export const CRM_HUB_USERS = Object.freeze([
  { name: "Maria Eduarda Marques da Paixão", email: "credito@goodcredit.com.br", blessUserId: "c8036995-4ec5-4862-b6ec-2dc5df34509e" },
  { name: "Ana", email: "ana@goodcredit.com.br", blessUserId: "d5d6c2bd-0edd-4faf-a3ca-f52f767b35f9" },
  { name: "Maria Elisa", email: "mariaelisa@goodcredit.com.br", blessUserId: "0d85c949-23bc-423f-95ce-d9640e1889aa" },
  { name: "Larissa Oliveira", email: "larissaoliveira.99m@gmail.com", blessUserId: "aaf9ceae-7f10-4f84-991d-48c3a5f9f5d9" },
  { name: "Augusto", email: "augustogoodcredit@gmail.com", blessUserId: "2c4a0355-f621-4bc2-a11e-d8f29d40e52d" },
  { name: "Kelly Queiroz", email: "kellygoodcredit@gmail.com", blessUserId: "f2bbf75c-ecac-417d-8209-ccdf5b0d4f76" },
  { name: "Tailainy", email: "financeiro@goodcredit.com.br", blessUserId: "138f52f6-97a9-470a-9b6b-8b7f8058a58a" },
  { name: "Matheus", email: "matheusmorelli84@gmail.com", blessUserId: "cb105c1e-95f9-43dc-a086-bf9004983ee5" },
  { name: "Juliana Marques", email: "registro@goodcredit.com.br", blessUserId: "61516f0a-2c4b-4007-8e92-c57a29fd2542" },
]);

export const CRM_PROVISION_EXCLUDED_USERS = Object.freeze([
  { name: "Julia Domingos", email: null, blessUserId: "1835f012-6f18-4942-a7e6-2d6e1a7eb6af" },
  { name: "Administrador / Henrique", email: null, blessUserId: "8c8e167b-ba43-41f0-bcb3-660cb11d87a3" },
  { name: "AUTOMAÇÃO", email: null, blessUserId: "2b12587e-37b4-4b11-8192-8a5da8f4ef35" },
]);

function normalizeEmail(value) {
  return String(value || "").trim().toLocaleLowerCase("en-US");
}

function normalizeId(value) {
  return String(value || "").trim().toLowerCase();
}

export function createProvisionPlan({
  users = CRM_HUB_USERS,
  excludedUsers = CRM_PROVISION_EXCLUDED_USERS,
  mappings,
  authUsers,
}) {
  const excludedIds = new Set(excludedUsers.map((user) => normalizeId(user.blessUserId)));
  const mappingByBlessId = new Map(
    mappings.map((mapping) => [normalizeId(mapping.bless_user_id), mapping]),
  );
  const mappingByHubId = new Map(
    mappings
      .filter((mapping) => mapping.hub_user_id)
      .map((mapping) => [normalizeId(mapping.hub_user_id), mapping]),
  );
  const authByEmail = new Map();
  authUsers.forEach((authUser) => {
    const email = normalizeEmail(authUser.email);
    if (!email) return;
    authByEmail.set(email, [...(authByEmail.get(email) || []), authUser]);
  });

  const excludedResults = excludedUsers.map((user) => ({
    ...user,
    status: "EXCLUDED",
    reason: "Excluído explicitamente do provisionamento.",
  }));
  const userResults = users.map((user) => {
    const blessUserId = normalizeId(user.blessUserId);
    if (excludedIds.has(blessUserId)) {
      return { ...user, status: "EXCLUDED", reason: "Excluído explicitamente do provisionamento." };
    }

    const mapping = mappingByBlessId.get(blessUserId);
    if (!mapping) {
      return { ...user, status: "CONFLICT", reason: "Mapping CRM não encontrado." };
    }
    if (mapping.hub_user_id) {
      return {
        ...user,
        status: "SKIP",
        hubUserId: mapping.hub_user_id,
        reason: "Bless user já possui vínculo Hub.",
      };
    }

    const matches = authByEmail.get(normalizeEmail(user.email)) || [];
    if (matches.length > 1) {
      return { ...user, status: "CONFLICT", reason: "Mais de um usuário Auth possui este e-mail." };
    }
    if (matches.length === 1) {
      const authUser = matches[0];
      const existingMapping = mappingByHubId.get(normalizeId(authUser.id));
      if (existingMapping && normalizeId(existingMapping.bless_user_id) !== blessUserId) {
        return {
          ...user,
          status: "CONFLICT",
          hubUserId: authUser.id,
          reason: "Usuário Hub já está vinculado a outro Bless user.",
        };
      }
      return {
        ...user,
        status: "LINK",
        hubUserId: authUser.id,
        reason: "Usuário Auth existente encontrado pelo e-mail.",
      };
    }

    return { ...user, status: "CREATE", reason: "Usuário Auth ainda não existe." };
  });

  return [...userResults, ...excludedResults];
}

export function summarizeProvisionResults(results) {
  return {
    alreadyLinked: results.filter((result) => result.status === "SKIP").length,
    existingUsersLinked: results.filter((result) => result.status === "LINK").length,
    usersCreated: results.filter((result) => result.status === "CREATE").length,
    excluded: results.filter((result) => result.status === "EXCLUDED").length,
    conflicts: results.filter((result) => result.status === "CONFLICT").length,
    failures: results.filter((result) => result.status === "FAILURE").length,
  };
}

export async function provisionCrmHubUsers({
  repository,
  apply = false,
  users = CRM_HUB_USERS,
  excludedUsers = CRM_PROVISION_EXCLUDED_USERS,
}) {
  const [mappings, authUsers] = await Promise.all([
    repository.listMappings(),
    repository.listAuthUsers(),
  ]);
  const plan = createProvisionPlan({ users, excludedUsers, mappings, authUsers });
  if (!apply) return { mode: "DRY_RUN", results: plan, summary: summarizeProvisionResults(plan) };

  const results = [];
  for (const item of plan) {
    if (!item || !["LINK", "CREATE"].includes(item.status)) {
      results.push(item);
      continue;
    }
    try {
      let hubUserId = item.hubUserId;
      if (item.status === "CREATE") {
        const invitedUser = await repository.inviteUser({
          email: item.email,
          metadata: { name: item.name, full_name: item.name },
        });
        hubUserId = invitedUser.id;
      }
      const linkResult = await repository.linkMapping({
        blessUserId: item.blessUserId,
        hubUserId,
        agentName: item.name,
        agentEmail: item.email,
      });
      if (linkResult === "CONFLICT") {
        results.push({ ...item, status: "CONFLICT", reason: "O vínculo mudou durante o provisionamento." });
      } else if (linkResult === "SKIP") {
        results.push({ ...item, status: "SKIP", hubUserId, reason: "Vínculo já aplicado por outra execução." });
      } else {
        results.push({ ...item, hubUserId, applied: true });
      }
    } catch (error) {
      results.push({
        ...item,
        status: "FAILURE",
        reason: sanitizeErrorMessage(error),
      });
    }
  }
  return { mode: "APPLY", results, summary: summarizeProvisionResults(results) };
}

export function sanitizeErrorMessage(error) {
  const message = error instanceof Error ? error.message : "Falha não identificada.";
  return message
    .replace(/authorization\s*[:=]\s*(?:bearer\s+)?[^\s,;]+/gi, "Authorization=[redacted]")
    .replace(/bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/(?:service[_-]?role[_-]?key|access[_-]?token|api[_-]?token|token)\s*[:=]\s*[^\s,;]+/gi, "credential=[redacted]")
    .slice(0, 300);
}

async function listAllAuthUsers(supabase) {
  const users = [];
  const perPage = 1000;
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`Não foi possível listar usuários Auth: ${error.message}`);
    users.push(...data.users);
    if (data.users.length < perPage) break;
  }
  return users;
}

export function createSupabaseProvisionRepository(supabase) {
  return {
    async listMappings() {
      const { data, error } = await supabase
        .from("crm_user_mappings")
        .select("id,hub_user_id,bless_user_id,agent_name,agent_email");
      if (error) throw new Error(`Não foi possível consultar crm_user_mappings: ${error.message}`);
      return data || [];
    },

    async listAuthUsers() {
      return listAllAuthUsers(supabase);
    },

    async inviteUser({ email, metadata }) {
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: metadata,
      });
      if (error || !data.user?.id) {
        throw new Error(`Não foi possível convidar o usuário: ${error?.message || "ID ausente"}`);
      }
      return data.user;
    },

    async linkMapping({ blessUserId, hubUserId, agentName, agentEmail }) {
      const { data: conflicting, error: conflictError } = await supabase
        .from("crm_user_mappings")
        .select("bless_user_id")
        .eq("hub_user_id", hubUserId)
        .maybeSingle();
      if (conflictError) throw new Error(`Não foi possível validar vínculo Hub: ${conflictError.message}`);
      if (conflicting && normalizeId(conflicting.bless_user_id) !== normalizeId(blessUserId)) {
        return "CONFLICT";
      }

      const { data, error } = await supabase
        .from("crm_user_mappings")
        .update({
          hub_user_id: hubUserId,
          agent_name: agentName,
          agent_email: agentEmail,
        })
        .eq("bless_user_id", blessUserId)
        .is("hub_user_id", null)
        .select("bless_user_id,hub_user_id")
        .maybeSingle();
      if (error) throw new Error(`Não foi possível vincular crm_user_mappings: ${error.message}`);
      if (data) return "LINKED";

      const { data: current, error: currentError } = await supabase
        .from("crm_user_mappings")
        .select("hub_user_id")
        .eq("bless_user_id", blessUserId)
        .maybeSingle();
      if (currentError) throw new Error(`Não foi possível confirmar vínculo CRM: ${currentError.message}`);
      return current?.hub_user_id === hubUserId ? "SKIP" : "CONFLICT";
    },
  };
}

export function printReport(report) {
  console.table(report.results.map((result) => ({
    Nome: result.name,
    Email: result.email || "—",
    "Bless User ID": result.blessUserId,
    Status: report.mode === "APPLY" && result.applied
      ? result.status === "CREATE" ? "CREATED" : "LINKED"
      : result.status,
    Detalhe: result.reason,
  })));
  console.log(`Already linked: ${report.summary.alreadyLinked}`);
  console.log(`Existing users linked: ${report.summary.existingUsersLinked}`);
  console.log(`${report.mode === "DRY_RUN" ? "Users to create" : "Users created"}: ${report.summary.usersCreated}`);
  console.log(`Excluded: ${report.summary.excluded}`);
  console.log(`Conflicts: ${report.summary.conflicts}`);
  console.log(`Failures: ${report.summary.failures}`);
}
