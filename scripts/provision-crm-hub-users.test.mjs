import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  CRM_PROVISION_EXCLUDED_USERS,
  createProvisionPlan,
  printReport,
  provisionCrmHubUsers,
} from "./lib/crm-hub-user-provisioning.mjs";

const USER = {
  name: "Cliente Teste",
  email: "cliente@goodcredit.com.br",
  blessUserId: "11111111-1111-4111-8111-111111111111",
};

function mapping(overrides = {}) {
  return {
    id: "mapping-1",
    bless_user_id: USER.blessUserId,
    hub_user_id: null,
    agent_name: null,
    agent_email: null,
    ...overrides,
  };
}

function fakeRepository(initialMappings, initialAuthUsers = []) {
  const mappings = initialMappings.map((item) => ({ ...item }));
  const authUsers = initialAuthUsers.map((item) => ({ ...item }));
  const calls = { invite: 0, link: 0 };
  const invitePayloads = [];
  return {
    mappings,
    authUsers,
    calls,
    invitePayloads,
    async listMappings() {
      return mappings.map((item) => ({ ...item }));
    },
    async listAuthUsers() {
      return authUsers.map((item) => ({ ...item }));
    },
    async inviteUser({ email, metadata }) {
      calls.invite += 1;
      invitePayloads.push({ email, metadata });
      const created = { id: `hub-created-${calls.invite}`, email, user_metadata: metadata };
      authUsers.push(created);
      return created;
    },
    async linkMapping({ blessUserId, hubUserId, agentName, agentEmail }) {
      calls.link += 1;
      const conflict = mappings.find(
        (item) => item.hub_user_id === hubUserId && item.bless_user_id !== blessUserId,
      );
      if (conflict) return "CONFLICT";
      const current = mappings.find((item) => item.bless_user_id === blessUserId);
      if (!current || (current.hub_user_id && current.hub_user_id !== hubUserId)) return "CONFLICT";
      if (current.hub_user_id === hubUserId) return "SKIP";
      current.hub_user_id = hubUserId;
      current.agent_name = agentName;
      current.agent_email = agentEmail;
      return "LINKED";
    },
  };
}

describe("provisionamento de usuários CRM no Hub", () => {
  it("executa o entrypoint em DRY RUN e falha claramente sem SUPABASE_URL", () => {
    const execution = spawnSync(process.execPath, [resolve("scripts/provision-crm-hub-users.mjs")], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        SUPABASE_URL: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
      },
    });

    expect(execution.status).toBe(1);
    expect(execution.stdout).toContain("CRM Hub User Provisioning");
    expect(execution.stdout).toContain("Mode: DRY RUN");
    expect(execution.stderr).toContain("Missing SUPABASE_URL");
  });

  it("valida SUPABASE_SERVICE_ROLE_KEY sem imprimir segredo", () => {
    const execution = spawnSync(process.execPath, [resolve("scripts/provision-crm-hub-users.mjs")], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "",
      },
    });

    expect(execution.status).toBe(1);
    expect(execution.stdout).toContain("Mode: DRY RUN");
    expect(execution.stderr).toContain("Missing SUPABASE_SERVICE_ROLE_KEY");
  });

  it("imprime colunas completas e resumo do dry-run", () => {
    const table = vi.spyOn(console, "table").mockImplementation(() => undefined);
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    printReport({
      mode: "DRY_RUN",
      results: [{ ...USER, status: "CREATE", reason: "Usuário Auth ainda não existe." }],
      summary: {
        alreadyLinked: 0,
        existingUsersLinked: 0,
        usersCreated: 1,
        excluded: 3,
        conflicts: 0,
        failures: 0,
      },
    });

    expect(table).toHaveBeenCalledWith([expect.objectContaining({
      Nome: USER.name,
      Email: USER.email,
      "Bless User ID": USER.blessUserId,
      Status: "CREATE",
    })]);
    expect(log.mock.calls.map(([message]) => message)).toContain("Users to create: 1");
    expect(log.mock.calls.map(([message]) => message)).toContain("Excluded: 3");
    table.mockRestore();
    log.mockRestore();
  });

  it("retorna SKIP e não sobrescreve mapping que já possui hub_user_id", async () => {
    const repository = fakeRepository([mapping({
      hub_user_id: "hub-existente",
      agent_name: "Nome preservado",
      agent_email: "preservado@example.com",
    })]);
    const report = await provisionCrmHubUsers({
      repository,
      apply: true,
      users: [USER],
      excludedUsers: [],
    });

    expect(report.results[0].status).toBe("SKIP");
    expect(repository.calls).toEqual({ invite: 0, link: 0 });
    expect(repository.mappings[0]).toMatchObject({
      hub_user_id: "hub-existente",
      agent_name: "Nome preservado",
      agent_email: "preservado@example.com",
    });
  });

  it("retorna LINK para Auth existente e vincula usando blessUserId", async () => {
    const repository = fakeRepository(
      [mapping()],
      [{ id: "hub-1", email: USER.email }],
    );
    const report = await provisionCrmHubUsers({
      repository,
      apply: true,
      users: [USER],
      excludedUsers: [],
    });

    expect(report.results[0]).toMatchObject({ status: "LINK", applied: true });
    expect(repository.calls).toEqual({ invite: 0, link: 1 });
    expect(repository.mappings[0]).toMatchObject({
      bless_user_id: USER.blessUserId,
      hub_user_id: "hub-1",
      agent_name: USER.name,
      agent_email: USER.email,
    });
  });

  it("retorna CREATE, envia convite sem senha e vincula o ID retornado", async () => {
    const repository = fakeRepository([mapping()]);
    const report = await provisionCrmHubUsers({
      repository,
      apply: true,
      users: [USER],
      excludedUsers: [],
    });

    expect(report.results[0]).toMatchObject({ status: "CREATE", applied: true });
    expect(repository.calls).toEqual({ invite: 1, link: 1 });
    expect(repository.authUsers[0]).toMatchObject({
      email: USER.email,
      user_metadata: { name: USER.name, full_name: USER.name },
    });
    expect(repository.invitePayloads[0]).toEqual({
      email: USER.email,
      metadata: { name: USER.name, full_name: USER.name },
    });
    expect(repository.invitePayloads[0]).not.toHaveProperty("password");
    expect(repository.mappings[0].hub_user_id).toBe(repository.authUsers[0].id);
  });

  it("classifica Julia, Administrador/Henrique e AUTOMAÇÃO como EXCLUDED", () => {
    const plan = createProvisionPlan({
      users: [],
      excludedUsers: CRM_PROVISION_EXCLUDED_USERS,
      mappings: CRM_PROVISION_EXCLUDED_USERS.map((user) => mapping({ bless_user_id: user.blessUserId })),
      authUsers: [],
    });

    expect(plan).toHaveLength(3);
    expect(plan.map((item) => item.status)).toEqual(["EXCLUDED", "EXCLUDED", "EXCLUDED"]);
    expect(plan.map((item) => item.blessUserId)).toEqual([
      "1835f012-6f18-4942-a7e6-2d6e1a7eb6af",
      "8c8e167b-ba43-41f0-bcb3-660cb11d87a3",
      "2b12587e-37b4-4b11-8192-8a5da8f4ef35",
    ]);
  });

  it("retorna CONFLICT quando o Auth user já está ligado a outro Bless user", () => {
    const plan = createProvisionPlan({
      users: [USER],
      excludedUsers: [],
      mappings: [
        mapping(),
        mapping({ id: "mapping-2", bless_user_id: "22222222-2222-4222-8222-222222222222", hub_user_id: "hub-1" }),
      ],
      authUsers: [{ id: "hub-1", email: USER.email }],
    });

    expect(plan[0]).toMatchObject({
      status: "CONFLICT",
      reason: "Usuário Hub já está vinculado a outro Bless user.",
    });
  });

  it("compara e-mails sem diferenciar maiúsculas de minúsculas", () => {
    const plan = createProvisionPlan({
      users: [USER],
      excludedUsers: [],
      mappings: [mapping()],
      authUsers: [{ id: "hub-1", email: "CLIENTE@GOODCREDIT.COM.BR" }],
    });

    expect(plan[0]).toMatchObject({ status: "LINK", hubUserId: "hub-1" });
  });

  it("é idempotente: a segunda execução não convida nem vincula novamente", async () => {
    const repository = fakeRepository([mapping()]);
    const first = await provisionCrmHubUsers({
      repository,
      apply: true,
      users: [USER],
      excludedUsers: [],
    });
    const second = await provisionCrmHubUsers({
      repository,
      apply: true,
      users: [USER],
      excludedUsers: [],
    });

    expect(first.results[0].status).toBe("CREATE");
    expect(second.results[0].status).toBe("SKIP");
    expect(repository.calls).toEqual({ invite: 1, link: 1 });
  });

  it("dry-run não envia convite nem altera mappings", async () => {
    const repository = fakeRepository([mapping()]);
    const before = structuredClone(repository.mappings);
    const report = await provisionCrmHubUsers({
      repository,
      users: [USER],
      excludedUsers: [],
    });

    expect(report.mode).toBe("DRY_RUN");
    expect(report.results[0].status).toBe("CREATE");
    expect(repository.calls).toEqual({ invite: 0, link: 0 });
    expect(repository.mappings).toEqual(before);
  });
});
