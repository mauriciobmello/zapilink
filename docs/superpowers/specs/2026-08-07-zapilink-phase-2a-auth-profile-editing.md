# ZAPILINK Phase 2a - Authentication & Profile Editing Design Spec

**Date:** 2026-08-07
**Phase:** 2a - Authentication + Perfil Editável
**Status:** Approved

---

## Overview

ZAPILINK Phase 2a adiciona autenticação de usuários e um sistema de dashboard para que cada usuário possa criar e editar seu próprio perfil. Ao invés do perfil hardcoded da Phase 1, usuários agora fazem signup, definem seu @username único, e customizam sua página com informações pessoais e cores do tema.

**Objetivo:** Transformar ZAPILINK de um exemplo estático em uma plataforma multi-usuário onde cada pessoa tem sua própria página em `/[username]`.

---

## Escopo da Fase 2a

Esta fase entrega:

- **Autenticação:** Sistema completo de signup/login com email/senha via Supabase
- **Perfil Personalizável:** Formulário para editar nome, descrição, foto, links sociais
- **Tema Customizável:** Cores primary + accent personalizáveis por usuário
- **Dashboard:** Painel privado para gerenciar perfil com preview live
- **Database:** Estrutura Supabase com tabelas users, profiles, page_views
- **Segurança:** Row-Level Security (RLS) e middleware de autenticação

---

## Stack Técnico

- **Frontend:** Next.js 14+, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth)
- **Autenticação:** Supabase Auth (email/password)
- **Banco de Dados:** PostgreSQL (via Supabase)
- **Deployment:** Pronto para Vercel + Supabase Cloud

---

## Database Schema

### Tabela: `users`
Gerenciada automaticamente pelo Supabase Auth.

```sql
-- Supabase cria automaticamente
id (uuid, primary key)
email (string, unique)
created_at (timestamp)
```

### Tabela: `profiles`
Armazena informações customizáveis de cada usuário.

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username varchar(30) UNIQUE NOT NULL,
  name varchar(255),
  description text,
  photo_url text,
  theme_color varchar(7) DEFAULT '#7C3AED', -- hex color
  theme_accent varchar(7) DEFAULT '#F97316', -- hex color
  social_links jsonb DEFAULT '[]'::jsonb, -- JSON array
  updated_at timestamp DEFAULT now(),
  UNIQUE(user_id)
);
```

**social_links structure:**
```json
[
  { "platform": "instagram", "url": "https://instagram.com/..." },
  { "platform": "tiktok", "url": "https://tiktok.com/@..." },
  { "platform": "youtube", "url": "https://youtube.com/..." },
  { "platform": "linkedin", "url": "https://linkedin.com/in/..." }
]
```

### Tabela: `page_views`
Rastreia visualizações para analytics (Phase 2c).

```sql
CREATE TABLE page_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at timestamp DEFAULT now()
);
```

### Row-Level Security (RLS)

```sql
-- Profiles: usuário só vê/edita sua própria profile
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles (public)"
ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can only update their own profile"
ON profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own profile"
ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
```

---

## Arquitetura e Fluxo

### Estrutura de Diretórios

```
zapilink/
├── app/
│   ├── page.tsx                 # Home (login/signup)
│   ├── auth/
│   │   ├── login/page.tsx       # Página de login
│   │   └── signup/page.tsx      # Página de signup
│   ├── dashboard/
│   │   ├── page.tsx             # Overview do dashboard
│   │   ├── edit/page.tsx        # Editar perfil
│   │   └── preview/page.tsx     # Preview da página
│   ├── [username]/
│   │   └── page.tsx             # Página pública do usuário
│   └── layout.tsx               # Root layout com provider
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx        # Formulário de login
│   │   └── SignupForm.tsx       # Formulário de signup
│   ├── dashboard/
│   │   ├── ProfileForm.tsx      # Formulário de edição
│   │   ├── ColorPicker.tsx      # Seletor de cores
│   │   ├── SocialLinksInput.tsx # Gerenciar links sociais
│   │   └── PreviewPane.tsx      # Preview live
│   ├── shared/
│   │   └── AuthGuard.tsx        # Proteção de rotas privadas
│   └── [Phase 1 components]     # Reutiliza ProfileHeader, etc.
├── lib/
│   ├── supabase.ts              # Cliente Supabase
│   ├── auth.ts                  # Funções de autenticação
│   └── theme.ts                 # Aplicação de temas
├── middleware.ts                # Middleware de autenticação
└── [configurações existentes]
```

---

## Páginas e Componentes

### Páginas Públicas

#### `/` - Home
- Barra de navegação com "Login" / "Signup"
- Call-to-action explicando ZAPILINK
- Link para exemplos/demo (se mantiver Phase 1 em `/demo`)

#### `/auth/signup` - Signup
- Formulário: email + senha + confirmar senha
- Validação de email único
- Link "Já tem conta? Faça login"
- Após submit: Supabase envia email de confirmação
- Após confirmar email: usuário é criado e redireciona para `/dashboard/edit`

#### `/auth/login` - Login
- Formulário: email + senha
- "Esqueci a senha?" link (Phase 2b)
- Link "Novo por aqui? Crie sua conta"
- Após login bem-sucedido: redireciona para `/dashboard`

#### `/[username]` - Página Pública do Usuário
- Renderiza perfil com dados da tabela `profiles`
- Aplica cores do tema (theme_color + theme_accent)
- Reutiliza componentes Phase 1: ProfileHeader, SmartButtonGrid, ServiceBlock, FAQBlock
- Incrementa `page_views` quando acessado
- Se username não existe: mostra 404

### Páginas Privadas (requer autenticação)

#### `/dashboard` - Overview
- Bem-vindo, [nome do usuário]!
- Mostra URL pública: `zapilink.com/[seu-username]`
- Botão "Editar Perfil"
- Estatísticas básicas: "Visitantes hoje" (Phase 2c)
- Botão "Logout"

#### `/dashboard/edit` - Editar Perfil
- Seção 1: Informações básicas
  - Campo: nome (max 100 chars)
  - Campo: @username (max 30 chars, único, validação)
  - Campo: descrição (max 500 chars, textarea)
  - Input: foto (upload ou URL)

- Seção 2: Links Sociais
  - Inputs dinâmicos para Instagram, TikTok, YouTube, LinkedIn
  - Botões + / - para adicionar/remover

- Seção 3: Tema
  - Color picker para primary color
  - Color picker para accent color
  - Preview ao lado mostrando como fica

- Botão "Salvar" (saves na tabela profiles)
- Botão "Preview" (vai para `/dashboard/preview`)
- Auto-save após 2 segundos de inatividade

#### `/dashboard/preview` - Preview Completo
- Renderiza `/[username]` mas dentro do dashboard
- Usuário vê exatamente como a página pública vai ficar
- Botão "Voltar" para continuar editando
- Botão "Publicar" (confirma as mudanças)

---

## Componentes Novos

### `components/auth/LoginForm.tsx`
```typescript
interface LoginFormProps {
  onSuccess?: () => void;
}

// Formulário com campos email e password
// Chama signIn do Supabase
// Mostra erros (email não encontrado, senha incorreta)
// Redireciona para /dashboard após sucesso
```

### `components/auth/SignupForm.tsx`
```typescript
interface SignupFormProps {
  onSuccess?: () => void;
}

// Formulário com campos email, password, confirm password
// Validação de senha forte (min 8 chars)
// Chama signUp do Supabase
// Supabase envia email de confirmação
// Após confirmar, redireciona para /dashboard/edit
```

### `components/dashboard/ProfileForm.tsx`
```typescript
interface ProfileFormProps {
  initialData: Profile;
  onSave: (data: Profile) => Promise<void>;
}

// Renderiza os 3 campos de edição (básico, sociais, tema)
// Validação de @username único
// Auto-save a cada 2 segundos
// Mostra loading/success feedback
```

### `components/dashboard/ColorPicker.tsx`
```typescript
interface ColorPickerProps {
  value: string; // hex color
  onChange: (color: string) => void;
  label: string;
}

// Input color HTML5 ou biblioteca (react-color)
// Mostra preview das cores escolhidas
```

### `components/dashboard/SocialLinksInput.tsx`
```typescript
interface SocialLinksInputProps {
  value: SocialLink[];
  onChange: (links: SocialLink[]) => void;
}

// Renderiza inputs dinâmicos para cada plataforma
// Botões + / - para gerenciar
// Validação de URLs
```

### `components/dashboard/PreviewPane.tsx`
```typescript
interface PreviewPaneProps {
  profileData: Profile;
  isDarkMode?: boolean;
}

// Renderiza lado-a-lado com o formulário
// Mostra como a página vai ficar com tema escolhido
// Atualiza em tempo real enquanto edita
```

### `components/shared/AuthGuard.tsx`
```typescript
interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// Componente wrapper para rotas privadas
// Verifica sessão Supabase
// Se não autenticado, redireciona para /auth/login
// Se autenticado, renderiza children
```

---

## Fluxo de Autenticação Detalhado

### Signup Flow
1. Usuário acessa `/` → clica "Criar Conta" → vai para `/auth/signup`
2. Preenche email + senha
3. Clica "Criar Conta"
4. Sistema valida (email único, senha forte)
5. Chama `supabase.auth.signUp(email, password)`
6. Supabase retorna usuário com `confirmed_at = null` (email não confirmado)
7. Supabase envia email de confirmação
8. Usuário clica link do email (volta ao app)
9. Sistema detecta email confirmado
10. Cria `profile` vazia com `user_id` do novo usuário
11. Redireciona para `/dashboard/edit`
12. Usuário define @username, nome, foto, cores
13. Clica "Salvar"
14. Redireciona para `/dashboard` ou `/[username]` (preview)

### Login Flow
1. Usuário acessa `/` → clica "Entrar" → vai para `/auth/login`
2. Preenche email + senha
3. Clica "Entrar"
4. Chama `supabase.auth.signInWithPassword(email, password)`
5. Supabase verifica credenciais
6. Se válido: retorna sessão + usuário
7. App armazena sessão no cookie/localStorage
8. Redireciona para `/dashboard`

### Logout Flow
1. Usuário no dashboard clica "Logout"
2. Chama `supabase.auth.signOut()`
3. Supabase limpa sessão
4. App remove cookie/localStorage
5. Redireciona para `/`

---

## Middleware de Autenticação

**`middleware.ts`** - Protege rotas privadas:

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  const { data: { session } } = await supabase.auth.getSession()

  // Se acessa /dashboard/* sem sessão → redireciona para /auth/login
  if (req.nextUrl.pathname.startsWith('/dashboard') && !session) {
    return NextResponse.redirect(new URL('/auth/login', req.url))
  }

  // Se acessa /auth/* com sessão → redireciona para /dashboard
  if (req.nextUrl.pathname.startsWith('/auth') && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*']
}
```

---

## Sistema de Temas

### Aplicação de Tema

Ao renderizar `/[username]`, o sistema:

1. Busca `profiles` do username
2. Extrai `theme_color` (primary) e `theme_accent`
3. Passa para componentes via Context/Props
4. Componentes usam as cores em `className` Tailwind

### Exemplo
```typescript
// Usuário escolhe primary: #9333EA (roxo custom), accent: #ec4899 (rosa)
// Ao renderizar ProfileHeader:
<div className="bg-gradient-to-b from-[#a855f7] to-white">
  {/* Gradiente usa cor customizada */}
</div>

// SmartButton usa accent:
<a className="bg-gradient-to-br from-[#ec4899] to-[#ec4899]">
  {/* Botão em rosa */}
</a>
```

### Fallback
Se usuário não escolher cores, usa defaults:
- Primary: #7C3AED (roxo)
- Accent: #F97316 (laranja)

---

## Segurança

### Row-Level Security (RLS)
- Usuário só consegue ler/editar sua própria `profile`
- Não consegue acessar dados de outro usuário
- `page_views` é append-only (apenas insertion)

### Autenticação
- Email confirmado antes de ativar conta
- Senhas hasheadas pelo Supabase (bcrypt)
- Sessão via JWT token (seguro)
- Middleware protege rotas privadas

### Validações
- @username: 3-30 caracteres, alphanumeric + underscore, único
- Email: formato válido, único
- Senha: mínimo 8 caracteres
- Cores: formato hex válido (#RRGGBB)
- URLs sociais: validação básica de URL

---

## Testes (Phase 2a)

### Funcional
- [ ] Signup com email válido e inválido
- [ ] Login com credenciais corretas e incorretas
- [ ] Email confirmation flow
- [ ] Editar perfil (atualiza dados)
- [ ] Validação de @username único
- [ ] Color picker funciona
- [ ] Preview atualiza em tempo real
- [ ] Logout limpa sessão
- [ ] Rotas privadas protegidas
- [ ] Página pública mostra tema correto

### Segurança
- [ ] Usuário A não consegue editar perfil de usuário B
- [ ] Session expira após inatividade
- [ ] CSRF tokens em forms
- [ ] SQL injection não funciona (Supabase parametrizado)

---

## Próximas Fases (Fora do Escopo)

**Phase 2b - Gerenciar Botões e Blocos:**
- Editar/criar SmartButtons (WhatsApp, Agendar, etc.)
- Adicionar/remover/editar ServiceBlock, FAQBlock
- Criar novos tipos de blocos customizados

**Phase 2c - Analytics:**
- Dashboard com gráficos de visitantes
- Visualizações por dia/semana/mês
- Referrer tracking
- Exportar dados

**Phase 3 - Autenticação Social:**
- Login com Google, GitHub, Discord
- Autenticação OAuth

**Phase 4 - Integrações:**
- WhatsApp API
- Stripe payments
- Google Calendar
- Typeform forms

---

## Notas

- Phase 2a é o foundation para tudo que vem depois
- Supabase é escolha excelente (auth + DB + RLS built-in)
- Preview live ajuda UX - usuário não se perde editando
- Tema customizável desde início = diferencial
- Validação de @username único é crítico (precisa ser rápido no form)