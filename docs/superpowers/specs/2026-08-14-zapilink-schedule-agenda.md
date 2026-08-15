# ZAPILINK — Fase 3: Agenda (Agendamento Nativo + Google Calendar)

**Data:** 2026-08-14
**Status:** Implementado (adaptado ao código real da Fase 2b)

> Nota de reconciliação: o spec original assumia que a Fase 2b (blocos/editores) não
> existia no código. Ela está implementada. Por isso: o botão `schedule` vive nos
> blocos `buttons` (ButtonItem), e aponta para `/[username]/agenda` quando o evento
> `schedule_events.is_active = true`; caso contrário usa o `link` do próprio botão.
> Não existe coluna `schedule_link` em `profiles`.

## Objetivo

Permitir que cada perfil tenha uma agenda de agendamentos vinculada ao Google
Calendar, com aprovação manual, e-mail transacional e RLS adequado.

## Fluxos

1. **Configuração (dono)** — `app/dashboard/schedule/page.tsx?profileId=X`:
   configurações do evento (título, descrição, duração, vagas, local, fuso),
   regras de disponibilidade (dias + horários), exceções (bloqueio/capacidade) e
   conexão com o Google Calendar (OAuth).
2. **Agendamento (visitante)** — `/[username]/agenda`: escolhe dia/horário e
   envia nome/e-mail/telefone. O booking nasce `pending`. E-mail de aviso vai ao
   dono com links de Aprovar/Recusar (token de aprovação, sem login).
3. **Decisão (dono)** — dashboard (botões) ou link do e-mail:
   - Aprovar → booking `approved`, e-mail de confirmação ao cliente e evento
     criado no Google Calendar (falha do Google não bloqueia a aprovação).
   - Recusar → booking `declined`, e-mail de recusa ao cliente.

## Decisões de design

- Horários calculados em tempo de leitura (sem pré-gerar slots).
- Evento no Google só é criado na aprovação.
- Fuso fixo do dono (`schedule_events.timezone`, default `America/Sao_Paulo`).
- Aprovação manual obrigatória; pendentes contam para a capacidade.
- Janela de disponibilidade de 60 dias.
- Conflito com o Google é checado por `freeBusy`; falha não bloqueia a
  disponibilidade.
- Concorrência de capacidade resolvida na função RPC `book_slot`
  (advisory lock + contagem + insert numa transação única). PostgREST não faz
  transações multi-statement, por isso o RPC.
- `bookings` e `google_calendar_connections` não têm políticas RLS: acesso
  exclusivo via service role (`lib/supabase/admin.ts`). `schedule_events`,
  `availability_rules` e `availability_exceptions` têm políticas de owner.
- Tokens do Google criptografados com AES-256-GCM
  (`SCHEDULE_TOKEN_ENCRYPTION_KEY`, hex de 32 bytes).
- E-mail via adapter plugável (`lib/email.ts`) — hoje console; provedor
  transacional a ser provisionado no Vercel Marketplace.

## Arquivos

- Migração: `scripts/migrate-schedule.sql` (5 tabelas, índices, RLS, RPC).
- Tipos: `types/schedule.ts`.
- Libs: `lib/schedule/availability.ts` (cálculo de slots + fuso),
  `lib/google-calendar.ts` (OAuth/freeBusy/events via fetch),
  `lib/crypto.ts`, `lib/email.ts`, `lib/supabase/admin.ts`.
- Rotas: `app/api/schedule/google/{connect,callback,disconnect}`,
  `app/api/schedule/[username]/{availability,book}`,
  `app/api/schedule/respond/[token]` (POST + GET para os links do e-mail).
- Páginas: `app/[username]/agenda/page.tsx` + `components/schedule/BookingForm.tsx`;
  `app/dashboard/schedule/page.tsx` + `components/dashboard/schedule/{ScheduleConfig,RequestsList}.tsx`.
- Integração: botão `schedule` dos blocos → agenda nativa
  (`components/blocks/ButtonsBlock.tsx`, `BlockRenderer`, `ProfilePage`,
  `app/[username]/page.tsx`); nav do dashboard.

## Pendências de infraestrutura (env)

- `GOOGLE_CALENDAR_CLIENT_ID` / `GOOGLE_CALENDAR_CLIENT_SECRET` (Google Cloud).
- `SCHEDULE_TOKEN_ENCRYPTION_KEY` (gerar com `openssl rand -hex 32`).
- Provedor de e-mail transacional no Vercel Marketplace.
- Rodar `scripts/migrate-schedule.sql` no SQL Editor do Supabase.
