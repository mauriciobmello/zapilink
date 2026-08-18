# Checklist de Publicação — Zapilink

Passos obrigatórios para colocar o Zapilink em produção (ou atualizar uma instância existente). O guia detalhado da plataforma está em [Dokploy Deployment Guide](DOKPLOY_DEPLOYMENT.md).

## 1. Variáveis de ambiente

Configure no painel do host (Dokploy → Environment Variables, ou equivalente). A referência completa é o [`.env.example`](../.env.example).

| Variável | Obrigatória | Observação |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | sim | URL do projeto Supabase (`https://<ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | sim | chave pública (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | **somente servidor** — nunca prefixar com `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | sim | domínio final com `https://`, sem barra no fim |
| `GOOGLE_CALENDAR_CLIENT_ID` | agenda | credencial OAuth do Google Cloud |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | agenda | idem |
| `SCHEDULE_TOKEN_ENCRYPTION_KEY` | agenda | 32 bytes em hex (`openssl rand -hex 32`) |
| `RESEND_API_KEY` | e-mails | notificações de agendamento |
| `SCHEDULE_EMAIL_FROM` | e-mails | remetente com domínio verificado no Resend |

- Sem as variáveis de agenda/e-mail o app sobe, mas os fluxos de agendamento e as notificações ficam indisponíveis.
- Nunca faça commit de `.env`, `.env.local` ou de chaves.

## 2. Migrações do banco (SQL Editor do Supabase)

Aplique **nesta ordem**; os scripts são idempotentes (`create table if not exists` / `create or replace`):

1. `supabase/schema.sql`
2. `scripts/migrate-multi-profile.sql`
3. `scripts/migrate-social-links.sql`
4. `scripts/migrate-blocks.sql`
5. `scripts/migrate-schedule.sql`
6. `scripts/setup-storage.sql`
7. `scripts/migrate-access-delegation.sql`
8. `scripts/migrate-loyalty.sql` — **programa de fidelidade** (tabelas `loyalty_*`, RLS e RPCs `add_loyalty_star`, `reverse_loyalty_star`, `redeem_loyalty_benefit`)

Instâncias já existentes precisam apenas dos scripts ainda não aplicados — na prática, `scripts/migrate-loyalty.sql`.

## 3. OAuth e Supabase Auth

- Google Cloud → OAuth client → Authorized redirect URI: `https://SEU_DOMINIO/api/schedule/google/callback`
- Supabase → Authentication → URL Configuration: Site URL = `https://SEU_DOMINIO`; Redirect URLs incluindo `https://SEU_DOMINIO/**`
- Supabase → Storage: bucket de avatares criado por `scripts/setup-storage.sql`

## 4. Deploy

- [ ] CI verde no PR (typecheck + lint + build) — ver [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
- [ ] Variáveis de ambiente configuradas no host
- [ ] Migrações aplicadas (seção 2)
- [ ] Build via `Dockerfile` concluído
- [ ] DNS apontando para o servidor e SSL emitido (Traefik/Dokploy)
- [ ] Aplicação respondendo na porta 3000 atrás do proxy

## 5. Verificação pós-deploy

- [ ] `https://SEU_DOMINIO/` carrega a landing
- [ ] `/auth/signup` e `/auth/login` funcionam (confirmação de e-mail conforme configuração do Supabase)
- [ ] `/dashboard` abre e permite editar o perfil
- [ ] `/<username>` público renderiza links, blocos e tema
- [ ] `/dashboard/loyalty/settings` salva meta + benefício e ativa o programa
- [ ] `/<username>/loyalty` aparece público; cadastro e consulta de estrelas funcionam
- [ ] `/dashboard/loyalty/customers` registra estrela, estorno e resgate
- [ ] Agenda: `/<username>/agenda` cria pedido e o e-mail de notificação chega
- [ ] Logs sem erros críticos
