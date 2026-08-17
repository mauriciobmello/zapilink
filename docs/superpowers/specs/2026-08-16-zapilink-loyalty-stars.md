# ZAPILINK — Programa de Fidelidade (cadastro de clientes + acúmulo de estrelas)

**Data:** 2026-08-16
**Status:** Implementado

> Nota de reconciliação: as permissões `loyalty.*` entram no mesmo union
> `Permission` de `types/access.ts` e são resolvidas por `canAccessProfile`
> (`lib/access/authorization.ts`), então valem tanto para o proprietário quanto
> para usuários com delegação ativa em `profile_access`.

## Objetivo

Cada perfil pode ativar um programa de fidelidade em que clientes se cadastram
pela página pública, acumulam estrelas (uma por atendimento, sempre lançada pelo
administrador) e resgatam um benefício ao atingir a meta.

## Fluxos

1. **Configuração (dono)** — `/dashboard/loyalty/settings?profileId=X`: nome,
   descrição, regras, meta de estrelas, benefício, reinício de ciclo e ativação.
2. **Cadastro público** — `/[username]/loyalty` → `/loyalty/register`: nome,
   e-mail, telefone e consentimento. A resposta é sempre neutra, mesmo quando o
   cliente já participa.
3. **Consulta pública** — `/[username]/loyalty/progress`: exige e-mail **e**
   telefone; devolve apenas primeiro nome, saldo do ciclo, meta e benefício.
4. **Operação (dono)** — `/dashboard/loyalty/customers`: busca, cadastro manual,
   ficha do cliente, `+1` estrela, estorno com motivo e registro de resgate.

## Decisões de design

- Cliente do programa é entidade própria (`loyalty_customers`), sempre no
  contexto de um perfil — não se confunde com `auth.users`. O mesmo e-mail pode
  existir em perfis diferentes; dentro do perfil é único (índice em
  `lower(email)` e em `phone`).
- Saldo é derivado (`SUM(stars)` do ciclo atual). Nada é apagado: estorno é uma
  transação `-1` apontando para a original (`reverses_transaction_id`).
- A quantidade de estrelas nunca vem do navegador: `add_loyalty_star` insere
  exatamente `+1`.
- Resgate é operação separada de atingir a meta. Com `reset_on_redeem`, o ciclo
  é incrementado (progresso zera, histórico permanece); sem ele a participação
  fica `completed`.
- Concorrência resolvida nos RPCs (`advisory lock` + validação + insert em uma
  transação): `add_loyalty_star`, `reverse_loyalty_star`,
  `redeem_loyalty_benefit`.
- RLS: só `loyalty_programs` tem políticas (leitura pública quando
  `is_active`, gestão pelo dono). Clientes, participações, estrelas, resgates e
  auditoria não têm políticas: acesso exclusivo via service role, depois da
  validação de propriedade/permissão no servidor.
- `profileId`, `memberId` e `transactionId` recebidos do cliente são sempre
  revalidados no servidor (`requireLoyaltyAdmin`, `requireMemberInProgram`);
  `granted_by` / `redeemed_by` vêm da sessão.
- Eventos relevantes são gravados em `loyalty_audit_events`.

## Arquivos

- Migração: `scripts/migrate-loyalty.sql` (6 tabelas, índices, RLS, 4 funções).
- Tipos: `types/loyalty.ts`.
- Libs: `lib/loyalty/{permissions,customer,progress,server,http,publicPage}.ts`.
- Rotas: `app/api/loyalty/[username]/{register,progress}`,
  `app/api/loyalty/{customers,program,redemptions,stars,stars/reverse}`.
- Páginas públicas: `app/[username]/loyalty/{page,register,progress}.tsx` +
  `components/loyalty/*`.
- Dashboard: `app/dashboard/loyalty/{page,settings,customers,customers/new,customers/[id]}` +
  `components/dashboard/loyalty/*`.
- Integração: botão do programa em `components/profile/ProfilePage.tsx` e item
  "Fidelidade" na nav do dashboard.

## Pendências

- Rodar `scripts/migrate-loyalty.sql` no SQL Editor do Supabase.
- Múltiplos programas por perfil (hoje o índice único permite um por perfil).
- Rate limit nas rotas públicas de cadastro/consulta.
