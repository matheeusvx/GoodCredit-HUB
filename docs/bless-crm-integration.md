# Integração Bless CRM — operação V1

## Arquitetura

O navegador consulta somente `GET /api/crm/dashboard` usando o access token da sessão Supabase. A função serverless valida o JWT, resolve o vínculo do próprio usuário e consulta os snapshots internos com `service_role`.

Somente o backend chama `https://api.wts.chat`. O token Bless e a chave `service_role` nunca usam prefixo `VITE_` e não são enviados ao navegador.

As tabelas `crm_sessions`, `crm_assignment_events`, `crm_message_activity`, `crm_response_events`, `crm_sync_state` e `crm_user_mappings` possuem RLS habilitada e não concedem acesso direto a `anon` ou `authenticated`.

## Variáveis no Vercel

Configure como variáveis de ambiente do servidor:

```text
BLESS_API_BASE_URL=https://api.wts.chat
BLESS_API_TOKEN=<credencial da API Bless>
SUPABASE_URL=<URL do projeto Supabase>
SUPABASE_SERVICE_ROLE_KEY=<service_role do projeto>
CRM_SYNC_SECRET=<segredo aleatório forte>
CRM_METRICS_START_AT=2026-08-01T03:00:00Z
BLESS_EXCLUDED_USER_IDS=74c069d0-2286-427b-a3a0-dbf89e228984
```

As variáveis públicas existentes continuam sendo:

```text
VITE_SUPABASE_URL=<URL do projeto Supabase>
VITE_SUPABASE_ANON_KEY=<chave pública anon>
```

## Aplicar a migration

Após revisar o ambiente Supabase vinculado, execute manualmente na raiz do projeto:

```powershell
npx supabase db push
```

## Bootstrap inicial

Após publicar as funções e aplicar a migration, execute uma vez:

```powershell
$headers = @{ "x-crm-sync-secret" = $env:CRM_SYNC_SECRET }
Invoke-RestMethod -Method Post -Uri "https://SEU-DOMINIO/api/crm/sync?mode=bootstrap" -Headers $headers
```

O bootstrap une e deduplica:

1. todas as sessões atualmente abertas (`STARTED`, `PENDING`, `IN_PROGRESS`), sem filtro `CreatedAt`;
2. sessões com interação desde `2026-08-01T03:00:00Z`.

O primeiro snapshot é tratado como baseline e não gera eventos falsos de recebimento.

## Sincronização manual e periódica

Sincronização incremental manual:

```powershell
$headers = @{ "x-crm-sync-secret" = $env:CRM_SYNC_SECRET }
Invoke-RestMethod -Method Post -Uri "https://SEU-DOMINIO/api/crm/sync" -Headers $headers
```

Configure posteriormente um scheduler externo ou compatível com o plano Vercel para executar `POST /api/crm/sync` aproximadamente a cada cinco minutos. Envie o segredo em um destes headers:

```text
x-crm-sync-secret: <CRM_SYNC_SECRET>
```

ou:

```text
Authorization: Bearer <CRM_SYNC_SECRET>
```

Nenhuma configuração de cron foi adicionada ao `vercel.json`, evitando incompatibilidade com o plano atual. Como fallback, a Home solicita uma sincronização incremental quando carregada ou atualizada, limitada no backend a snapshots com mais de quatro minutos.

## Regras temporais

Os KPIs históricos consideram atividades a partir de `01/08/2026 00:00 America/Sao_Paulo`, equivalente a `2026-08-01T03:00:00Z`.

A carteira atual não possui corte por criação: uma sessão criada antes de agosto continua aparecendo enquanto estiver aberta e atribuída ao funcionário.

Movimentações de carteira (recebidos/transferidos) são monitoradas com precisão a partir da ativação do sincronizador.

## Operação e diagnóstico

- `401`: segredo/JWT ausente ou inválido.
- `503` no sync: variáveis ausentes ou Bless/Supabase indisponível.
- `ALREADY_RUNNING`: outra execução mantém o lock; não é necessário repetir imediatamente.
- A Home continua exibindo as ferramentas do Hub e, quando possível, o último snapshot mesmo se a sincronização falhar.
- Erros persistidos são limitados e sanitizados; tokens e headers de autorização não são registrados.
