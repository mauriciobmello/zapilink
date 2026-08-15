# Troubleshooting Dokploy Deployment - Zapilink

## 🚨 Login Congelando/Buscando Informações

Se o login fica travado ou parece estar buscando informações infinitamente, geralmente é um problema de variáveis de ambiente não configuradas corretamente.

### 🔍 Diagnóstico

#### 1. Verificar Logs do Container

No Dokploy:
1. Vá na aplicação `zapilink`
2. Clique em **Logs**
3. Procure por mensagens de erro sobre Supabase

Mensagens típicas de erro:
```
Variáveis de ambiente do Supabase não encontradas
Faltam NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY
```

#### 2. Verificar Variáveis de Ambiente no Dokploy

1. No Dokploy, vá na aplicação `zapilink`
2. Clique em **Environment Variables**
3. Verifique se TODAS as variáveis estão configuradas:

```bash
# OBRIGATÓRIAS para funcionamento básico:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Opcionais (Google Calendar):
GOOGLE_CALENDAR_CLIENT_ID=your-client-id
GOOGLE_CALENDAR_CLIENT_SECRET=your-client-secret

# Opcionais (Email):
RESEND_API_KEY=your-resend-api-key
SCHEDULE_EMAIL_FROM=noreply@yourdomain.com

# Opcionais (Encryption):
SCHEDULE_TOKEN_ENCRYPTION_KEY=your-32-byte-key

# Obrigatório (Site):
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### 🔧 Soluções

#### Solução 1: Configurar Variáveis de Ambiente

1. No Dokploy, vá em **Environment Variables**
2. Adicione cada variável manualmente:

```
Nome: NEXT_PUBLIC_SUPABASE_URL
Valor: https://seu-projeto.supabase.co

Nome: NEXT_PUBLIC_SUPABASE_ANON_KEY  
Valor: sua-chave-anon-aqui

Nome: SUPABASE_SERVICE_ROLE_KEY
Valor: sua-chave-service-role-aqui

Nome: NEXT_PUBLIC_SITE_URL
Valor: https://seudominio.com
```

3. Clique em **Save**
4. Clique em **Redeploy**

#### Solução 2: Verificar Formato das Chaves

As chaves do Supabase devem estar no formato correto:

- ✅ `NEXT_PUBLIC_SUPABASE_URL`: URL completa do projeto
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Chave pública (começa com `eyJ`)
- ✅ `SUPABASE_SERVICE_ROLE_KEY`: Chave privada (começa com `eyJ`)

#### Solução 3: Verificar Projeto Supabase

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard)
2. Selecione seu projeto
3. Vá em **Settings** → **API**
4. Copie as chaves novamente
5. Atualize no Dokploy

### 🧪 Teste de Conexão

Adicione este componente temporário para testar a conexão:

```tsx
// app/test-connection/page.tsx
"use client";

import { useEffect, useState } from "react";

export default function TestConnection() {
  const [status, setStatus] = useState("Carregando...");
  const [details, setDetails] = useState<any>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        const response = await fetch("/api/test-connection");
        const data = await response.json();
        setStatus(data.success ? "Conexão OK" : "Erro");
        setDetails(data);
      } catch (error) {
        setStatus("Erro de requisição");
        setDetails({ error: error.message });
      }
    }
    testConnection();
  }, []);

  return (
    <div className="p-8">
      <h1>Teste de Conexão Supabase</h1>
      <p>Status: {status}</p>
      {details && <pre>{JSON.stringify(details, null, 2)}</pre>}
    </div>
  );
}
```

### 📋 Checklist de Variáveis de Ambiente

Antes de reclamar o container, verifique:

- [ ] `NEXT_PUBLIC_SUPABASE_URL` está configurada
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` está configurada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` está configurada
- [ ] `NEXT_PUBLIC_SITE_URL` está configurada
- [ ] As chaves estão corretas (copiadas do Supabase Dashboard)
- [ ] O projeto Supabase está ativo
- [ ] Não há espaço extra nas variáveis
- [ ] As variáveis começam com `NEXT_PUBLIC_` quando necessário

### 🔒 Erros Comuns

#### Erro: "Variáveis de ambiente não encontradas"

**Causa:** Variáveis não configuradas no Dokploy

**Solução:** Adicione as variáveis em Environment Variables

#### Erro: "Invalid API key"

**Causa:** Chave API incorreta ou mal formatada

**Solução:** Copie novamente do Supabase Dashboard

#### Erro: "Project not found"

**Causa:** URL do Supabase incorreta ou projeto desativado

**Solução:** Verifique a URL e ative o projeto no Supabase

#### Login fica travado

**Causa:** Variáveis de ambiente não configuradas

**Solução:** Configure as variáveis obrigatórias e redeploy

### 🚀 Após Corrigir

1. Configure as variáveis de ambiente
2. Clique em **Redeploy** no Dokploy
3. Aguarde o build e deployment
4. Teste o login novamente
5. Verifique os logs se ainda tiver problemas

### 📞 Se Continuar com Problemas

1. **Verifique logs detalhados** no Dokploy
2. **Teste localmente** com as mesmas variáveis
3. **Verifique o projeto Supabase** está ativo
4. **Contate o suporte** do Dokploy se for erro da plataforma

## 🔄 Outros Problemas Comuns

### Container reinicia constantemente

**Causa:** Erro de inicialização ou variáveis faltando

**Solução:** Verifique logs e variáveis de ambiente

### Build falha

**Causa:** Problema com dependências ou código

**Solução:** Verifique logs de build e o código

### SSL não funciona

**Causa:** DNS não configurado ou firewall

**Solução:** Verifique DNS e portas 80/443
