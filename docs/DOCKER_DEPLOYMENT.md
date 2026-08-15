# Docker Deployment Guide - Zapilink

Este guia mostra como publicar o projeto Zapilink usando Docker e Docker Compose.

## 📋 Pré-requisitos

- Docker instalado (versão 20.10+)
- Docker Compose instalado (versão 2.0+)
- Conta no Supabase
- Projeto Google Cloud (para Google Calendar)
- Conta Resend (para emails)

## 🚀 Método 1: Docker Compose (Recomendado)

### 1. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.docker.example .env

# Editar com suas credenciais reais
nano .env
```

Preencha as variáveis no arquivo `.env`:

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

### 2. Construir e Executar

```bash
# Construir a imagem
docker-compose build

# Executar em background
docker-compose up -d

# Verificar logs
docker-compose logs -f
```

### 3. Acessar a Aplicação

A aplicação estará disponível em: http://localhost:3000

### 4. Comandos Úteis

```bash
# Parar containers
docker-compose down

# Parar e remover volumes
docker-compose down -v

# Reconstruir após alterações
docker-compose up -d --build

# Verificar status dos containers
docker-compose ps

# Ver logs de um serviço específico
docker-compose logs app
```

## 🐳 Método 2: Docker Puro

### 1. Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env
cp .env.docker.example .env

# Editar com suas credenciais
nano .env
```

### 2. Construir Imagem

```bash
docker build -t zapilink:latest .
```

### 3. Executar Container

```bash
docker run -d \
  --name zapilink \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  zapilink:latest
```

## 🎯 Nota sobre o Dockerfile

O Dockerfile foi simplificado para melhor compatibilidade com Dokploy:
- Single-stage build
- Inclui libc6-compat para Alpine
- Configurado com NODE_ENV=production
- Otimizado para deployment em plataformas PaaS

### 4. Comandos Úteis

```bash
# Ver logs
docker logs -f zapilink

# Parar container
docker stop zapilink

# Iniciar container
docker start zapilink

# Remover container
docker rm zapilink

# Acessar shell do container
docker exec -it zapilink sh
```

## 🌐 Método 3: Deploy em Servidor Cloud

### Usando Docker Compose em VPS

1. **Copiar arquivos para o servidor:**
```bash
scp -r . user@your-server:/var/www/zapilink
```

2. **Configurar variáveis de ambiente no servidor:**
```bash
ssh user@your-server
cd /var/www/zapilink
cp .env.docker.example .env
nano .env
```

3. **Executar com Docker Compose:**
```bash
docker-compose up -d
```

### Usando Nginx como Proxy Reverso

Crie arquivo de configuração do Nginx:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

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

## 🔧 Configuração do Next.js para Docker

O arquivo `next.config.js` já está configurado com `output: 'standalone'`, que:

- Cria uma build otimizada para Docker
- Reduz o tamanho da imagem final
- Melhora o tempo de inicialização
- Melhora a performance em produção

## 📦 Estrutura do Dockerfile

O Dockerfile usa multi-stage build:

1. **Stage deps**: Instala dependências
2. **Stage builder**: Constrói a aplicação
3. **Stage runner**: Cria imagem final leve

Isso garante:
- Imagem final pequena
- Apenas arquivos necessários
- Build otimizado para produção

## 🔒 Segurança em Docker

### Boas Práticas

1. **Não comitar arquivo .env:**
```bash
# .gitignore já está configurado
.env
.env.docker
```

2. **Usar usuário não-root:**
O Dockerfile já cria usuário `nextjs` com UID 1001

3. **Variáveis de ambiente:**
Use Docker secrets ou serviço de gerenciamento de segredos em produção

4. **Atualizações de segurança:**
```bash
# Atualizar imagem base
docker pull node:18-alpine
docker-compose build --no-cache
```

## 🚀 Deploy Automatizado

### GitHub Actions (Opcional)

Crie `.github/workflows/docker.yml`:

```yaml
name: Docker Build and Push

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Login to Docker Hub
        uses: docker/login-action@v1
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and push
        uses: docker/build-push-action@v2
        with:
          context: .
          push: true
          tags: mauriciobmello/zapilink:latest
```

## 🐛 Troubleshooting

### Erro: Porta 3000 já em uso

```bash
# Verificar o que está usando a porta
lsof -i :3000

# Ou usar outra porta
docker-compose up -d
# E depois configurar Nginx para proxy
```

### Erro: Variáveis de ambiente não funcionando

```bash
# Verificar se o arquivo .env existe
ls -la .env

# Verificar formato das variáveis
cat .env

# Reconstruir com .env atualizado
docker-compose down
docker-compose up -d --build
```

### Build falhando

```bash
# Limpar cache do Docker
docker system prune -a

# Reconstruir sem cache
docker-compose build --no-cache
```

### Erro de permissão

```bash
# Verificar permissões do arquivo .env
chmod 600 .env

# Se necessário, ajustar propriedade
sudo chown $USER:$USER .env
```

## 📊 Monitoramento

### Verificar Saúde do Container

```bash
# Verificar status
docker-compose ps

# Verificar health check
docker inspect zapilink_app_1 | grep -A 10 Health
```

### Logs em Tempo Real

```bash
# Todos os logs
docker-compose logs -f

# Apenas logs do app
docker-compose logs -f app

# Últimos 100 linhas
docker-compose logs --tail=100 app
```

## 🔄 Atualizações

### Atualizar Aplicação

```bash
# Pull do Git
git pull origin main

# Reconstruir e reiniciar
docker-compose down
docker-compose up -d --build
```

### Atualizar Dependências

```bash
# No local
npm update
npm install

# Commit e push
git add .
git commit -m "Update dependencies"
git push

# No servidor
git pull
docker-compose up -d --build
```

## 📚 Recursos Adicionais

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Supabase Docker Guide](https://supabase.com/docs/guides/self-hosting/docker)

## 🎯 Checklist de Deploy

- [ ] Configurar variáveis de ambiente
- [ ] Executar migrações do Supabase
- [ ] Testar build localmente
- [ ] Push para GitHub
- [ ] Deploy no servidor
- [ ] Configurar Nginx (se necessário)
- [ ] Configurar SSL (Let's Encrypt)
- [ ] Testar funcionalidades críticas
- [ ] Configurar monitoramento
- [ ] Configurar backups

## 📞 Suporte

Para problemas específicos do Docker, consulte:
- Documentação oficial do Docker
- Logs do container para debugging
- Documentação do projeto em `docs/`
