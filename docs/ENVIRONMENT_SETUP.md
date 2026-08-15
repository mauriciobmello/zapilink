# Configuração de Variáveis de Ambiente - Zapilink

## ⚠️ Erro: "Forbidden use of secret API key in browser"

Este erro ocorre quando a **service role key** do Supabase é acidentalmente exposta no navegador em vez da **anon key**.

## 🔧 Solução

### 1. Verifique seu arquivo `.env.local`

Certifique-se de que as variáveis estão configuradas corretamente:

```bash
# ✅ CORRETO - Chave pública (pode começar com NEXT_PUBLIC_)
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ✅ CORRETO - Chave privada (NÃO pode começar com NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. NÃO faça isso:

```bash
# ❌ ERRADO - Service role key exposta no navegador
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Como obter as chaves corretas

1. Acesse seu projeto no [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **Settings** → **API**
3. Copie as chaves:

   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` (sem NEXT_PUBLIC_)

### 4. Diferença entre as chaves

| Chave | Prefixo | Uso | Segurança |
|-------|---------|-----|----------|
| **anon key** | `NEXT_PUBLIC_` | Browser/client | Pública, uso limitado |
| **service role key** | Sem prefixo | Server-side API | Privada, acesso total |

### 5. Verificação de segurança

O código agora inclui verificações para evitar esse erro:

```typescript
// lib/supabase/client.ts
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Variáveis de ambiente do Supabase não encontradas:", {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
    });
    throw new Error(
      "Faltam NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY. Verifique o arquivo .env.local"
    );
  }

  return createSupabaseBrowserClient(supabaseUrl, supabaseAnonKey);
}
```

## 🔍 Troubleshooting

### Se o erro persistir:

1. **Reinicie o servidor de desenvolvimento:**
   ```bash
   # Pare o servidor (Ctrl+C)
   npm run dev
   ```

2. **Verifique se o arquivo `.env.local` existe:**
   ```bash
   ls -la .env.local
   ```

3. **Verifique se há espaços extras nas variáveis:**
   ```bash
   # ❌ ERRADO (espaço depois do =)
   NEXT_PUBLIC_SUPABASE_URL= https://seu-projeto.supabase.co
   
   # ✅ CORRETO
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   ```

4. **Verifique se o `.env.local` está no `.gitignore`:**
   ```bash
   cat .gitignore | grep .env.local
   ```

## 🚀 Após configurar

1. Reinicie o servidor de desenvolvimento
2. Limpe o cache do navegador
3. Tente criar a conta novamente

## 📝 Notas Importantes

- **Nunca** commit o arquivo `.env.local` no Git
- **Nunca** exponha a `SUPABASE_SERVICE_ROLE_KEY` no navegador
- **Sempre** use a `NEXT_PUBLIC_SUPABASE_ANON_KEY` para operações no browser
- A `SUPABASE_SERVICE_ROLE_KEY` deve ser usada apenas em rotas de API server-side
