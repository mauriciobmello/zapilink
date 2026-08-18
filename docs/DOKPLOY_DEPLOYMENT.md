# Dokploy Deployment Guide - Zapilink

Este guia mostra como publicar o projeto Zapilink na plataforma Dokploy.

## 📋 O que é Dokploy?

Dokploy é uma plataforma PaaS auto-hospedável que simplifica o deployment e gerenciamento de aplicações Docker. Ele oferece:

- Deployment automático via Git
- Suporte a Docker Compose
- Integração com Traefik para routing
- Monitoramento em tempo real
- Multi-server deployment
- Suporte a bancos de dados

## 🚀 Pré-requisitos

### Servidor

- VPS com pelo menos 2GB RAM e 30GB disco
- Sistema Linux (Ubuntu, Debian, etc.)
- Portas disponíveis: 80, 443, 3000
- Acesso SSH

### Dokploy Instalado

Se você ainda não tem Dokploy instalado:

```bash
# Instalação automática
curl -sSL https://dokploy.com/install.sh | sh
```

Após instalação, acesse: `http://seu-servidor:3000`

## 📦 Preparação do Projeto

### 1. Verificar Arquivos Docker

O projeto já está configurado com Docker:

- ✅ `Dockerfile` - Multi-stage build otimizado
- ✅ `docker-compose.yml` - Configuração completa
- ✅ `.dockerignore` - Otimização de build
- ✅ `.env.docker.example` - Template de variáveis

### 2. Configurar Variáveis de Ambiente no Dokploy

No painel do Dokploy:

1. Vá em **Settings** → **Environment Variables**
2. Adicione as seguintes variáveis:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Calendar
GOOGLE_CALENDAR_CLIENT_ID=your-client-id
GOOGLE_CALENDAR_CLIENT_SECRET=your-client-secret

# Encryption
SCHEDULE_TOKEN_ENCRYPTION_KEY=your-32-byte-encryption-key

# Email
RESEND_API_KEY=your-resend-api-key
SCHEDULE_EMAIL_FROM=noreply@yourdomain.com

# Site
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

`SUPABASE_SERVICE_ROLE_KEY` é usada apenas no servidor — nunca a prefixe com `NEXT_PUBLIC_`.

### 3. Aplicar as migrações do banco

Antes do primeiro deploy (e sempre que novos scripts entrarem), rode os SQLs de `supabase/` e `scripts/` no SQL Editor do Supabase, na ordem descrita no [Checklist de Publicação](PUBLICACAO_CHECKLIST.md#2-migrações-do-banco-sql-editor-do-supabase). O programa de fidelidade depende de `scripts/migrate-loyalty.sql`.

## 🔗 Conectar Repositório GitHub

### Método 1: Via Interface Dokploy

1. No painel Dokploy, clique em **New Application**
2. Selecione **Git** como fonte
3. Conecte sua conta GitHub
4. Selecione o repositório `mauriciobmello/zapilink`
5. Configure branch (recomendado: `main`)

### Método 2: Via Webhook

1. No GitHub, vá em Settings → Webhooks
2. Adicione novo webhook com URL do Dokploy
3. Configure para disparar em push para branch `main`

## 🎮 Deploy no Dokploy

### Opção 1: Docker Compose (Recomendado)

1. **Criar Aplicação:**
   - Clique em **New Application**
   - Nome: `zapilink`
   - Tipo: **Docker Compose**
   - Repositório: Seu repositório GitHub

2. **Configurar Build:**
   - Branch: `main`
   - Docker Compose Path: `docker-compose.yml`
   - Context: `/`

3. **Configurar Ambiente:**
   - Adicione as variáveis de ambiente
   - Configure domínio (se aplicável)

4. **Deploy:**
   - Clique em **Deploy**
   - Dokploy fará o build e deployment automaticamente

### Opção 2: Dockerfile

1. **Criar Aplicação:**
   - Clique em **New Application**
   - Nome: `zapilink`
   - Tipo: **Dockerfile**
   - Repositório: Seu repositório GitHub

2. **Configurar Build:**
   - Branch: `main`
   - Dockerfile Path: `Dockerfile`
   - Context: `/`
   - Build Args: `NODE_ENV=production`

3. **Configurar Ambiente:**
   - Porta: `3000`
   - Variáveis de ambiente

4. **Deploy:**
   - Clique em **Deploy**

1. **Criar Aplicação:**
   - Clique em **New Application**
   - Nome: `zapilink`
   - Tipo: **Dockerfile**
   - Repositório: Seu repositório GitHub

2. **Configurar Build:**
   - Branch: `main`
   - Dockerfile Path: `Dockerfile`
   - Context: `/`
   - Build Args: (nenhum necessário)

3. **Configurar Ambiente:**
   - Porta: `3000`
   - Variáveis de ambiente

4. **Deploy:**
   - Clique em **Deploy**

## 🌐 Configurar Domínio

### Via Dokploy (Traefik)

1. Na aplicação, vá em **Domains**
2. Adicione seu domínio: `seudominio.com`
3. Dokploy configurará automaticamente:
   - Certificado SSL (Let's Encrypt)
   - Proxy reverso via Traefik
   - Redirecionamento HTTP → HTTPS

### Manual (Nginx)

Se preferir configurar manualmente:

```nginx
server {
    listen 80;
    server_name seudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔄 Deploy Automático

### Configurar Webhook

1. No Dokploy, copie a URL do webhook
2. No GitHub:
   - Settings → Webhooks → Add webhook
   - Cole a URL do Dokploy
   - Selecione eventos: `push` para branch `main`
   - Clique em Add webhook

### Deploy Automático

Agora, cada push para o branch `main` no GitHub irá:

1. Disparar o webhook
2. Dokploy receberá a notificação
3. Build automático da imagem
4. Deployment automático
5. Zero downtime (se configurado)

## 📊 Monitoramento

### Via Dokploy Dashboard

- **CPU/Memory**: Gráficos em tempo real
- **Logs**: Logs da aplicação
- **Health Checks**: Status da aplicação
- **Uso de Disco**: Monitoramento de armazenamento

### Acessar Logs

1. Na aplicação, clique em **Logs**
2. Selecione o container
3. Veja logs em tempo real ou históricos

## 🔧 Troubleshooting

### Deploy Falhando

**Causa provável:** Variáveis de ambiente não configuradas

**Solução:**
1. Verifique se todas as variáveis estão configuradas
2. Verifique se as chaves API estão corretas
3. Veja os logs de build para identificar o erro

### Aplicação Não Inicia

**Causa provável:** Porta 3000 já em uso

**Solução:**
```bash
# No servidor
docker ps
docker stop <container-id>
```

Ou configure Dokploy para usar outra porta.

### Erro de Conexão com Supabase

**Causa provável:** Variáveis de ambiente incorretas

**Solução:**
1. Verifique `NEXT_PUBLIC_SUPABASE_URL`
2. Verifique `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Confirme que o projeto Supabase está ativo

### SSL Não Funciona

**Causa provável:** Domínio não configurado corretamente

**Solução:**
1. Verifique DNS do domínio
2. Confirme que o domínio aponta para o servidor
3. Aguarde propagação DNS (até 24h)
4. Force renovação do certificado no Dokploy

## 🚀 Deploy Inicial

### Checklist

> Checklist completo (env vars, ordem das migrações e verificação pós-deploy): [Checklist de Publicação](PUBLICACAO_CHECKLIST.md).

- [ ] Dokploy instalado no servidor
- [ ] Repositório GitHub conectado
- [ ] Variáveis de ambiente configuradas
- [ ] Migrações SQL aplicadas no Supabase, incluindo `scripts/migrate-loyalty.sql`
- [ ] Dockerfile/docker-compose.yml testado localmente
- [ ] Domínio configurado (DNS apontando para servidor)
- [ ] Build bem-sucedido no Dokploy
- [ ] Aplicação rodando em porta 3000
- [ ] SSL configurado
- [ ] Health checks funcionando
- [ ] Logs sem erros críticos

### Passo a Passo

1. **No Dokploy:**
   ```bash
   # Criar aplicação
   New Application → Git → Selecionar repositório
   ```

2. **Configurar:**
   ```bash
   # Tipo: Docker Compose
   # Branch: main
   # Path: docker-compose.yml
   ```

3. **Variáveis:**
   ```bash
   # Adicionar todas as variáveis do .env.docker.example
   ```

4. **Deploy:**
   ```bash
   # Clicar em Deploy
   # Aguardar build (primeiro pode demorar)
   ```

5. **Verificar:**
   ```bash
   # Logs → Verificar se iniciou corretamente
   # Domains → Configurar domínio
   # Health Check → Verificar status
   ```

## 📱 Deploy Contínuo

### Workflow de Desenvolvimento

```bash
# 1. Fazer alterações localmente
git add .
git commit -m "Nova feature"
git push origin main

# 2. Dokploy detecta automaticamente
# 3. Build automático
# 4. Deployment automático
# 5. Zero downtime
```

### Branch Protection

Configure branch protection no GitHub:

1. Settings → Branches → Add rule
2. Branch: `main`
3. Requerir:
   - Pull request reviews
   - Status checks pass
   - No deletions

## 🔒 Segurança no Dokploy

### Boas Práticas

1. **Variáveis de Ambiente:**
   - Nunca commitar `.env`
   - Usar secrets do Dokploy
   - Rotacionar chaves periodicamente

2. **Acesso:**
   - Usar autenticação forte
   - Limitar acessos ao painel
   - Monitorar logs de acesso

3. **Atualizações:**
   - Manter Dokploy atualizado
   - Atualizar dependências regularmente
   - Monitorar vulnerabilidades

## 📚 Recursos Adicionais

- [Dokploy Documentation](https://docs.dokploy.com)
- [Dokploy GitHub](https://github.com/Dokploy/dokploy)
- [Dokploy Discord](https://discord.gg/dokploy)
- [Docker Documentation](https://docs.docker.com)

## 🎯 Vantagens do Dokploy

- ✅ Interface web intuitiva
- ✅ Deploy automático via Git
- ✅ SSL automático (Let's Encrypt)
- ✅ Monitoramento em tempo real
- ✅ Suporte a Docker Compose
- ✅ Multi-server deployment
- ✅ Backup automático
- ✅ Gratuito e auto-hospedável

## 📞 Suporte

Para problemas específicos do Dokploy:
- [Dokploy Discord](https://discord.gg/dokploy)
- [Dokploy GitHub Issues](https://github.com/Dokploy/dokploy/issues)
- [Documentação Oficial](https://docs.dokploy.com)

Para problemas do projeto:
- [Documentação do Projeto](docs/)
- [GitHub Issues](https://github.com/mauriciobmello/zapilink/issues)
