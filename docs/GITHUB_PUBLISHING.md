# Como Publicar o Projeto Zapilink no GitHub

## 📋 Pré-requisitos

- Conta no GitHub
- Git instalado no computador
- Projeto Zapilink já inicializado com Git

## 🚀 Passo a Passo

### 1. Criar Repositório no GitHub

1. Acesse [GitHub](https://github.com) e faça login
2. Clique no botão **+** no canto superior direito
3. Selecione **New repository**
4. Preencha as informações:
   - **Repository name**: `zapilink` (ou o nome que preferir)
   - **Description**: `Next.js application with Supabase backend for profile management and scheduling`
   - **Visibility**: Private (recomendado para projeto com chaves API)
   - **Não marque** "Initialize this repository with a README"
   - **Não marque** "Add .gitignore"
   - **Não marque** "Choose a license"
5. Clique em **Create repository**

### 2. Conectar Repositório Local ao GitHub

Após criar o repositório, o GitHub mostrará as instruções. Execute:

```bash
# Substitua SEU_USUARIO pelo seu username do GitHub
git remote add origin https://github.com/SEU_USUARIO/zapilink.git
```

### 3. Verificar Arquivos Sensíveis

**IMPORTANTE:** Verifique se o arquivo `.env.local` está no `.gitignore`:

```bash
# Verificar se .env.local está no .gitignore
cat .gitignore | grep .env.local
```

Se não estiver, adicione ao `.gitignore`:

```bash
echo ".env.local" >> .gitignore
```

### 4. Commit Inicial (Já Feito)

O projeto já foi inicializado com commit inicial. Verifique:

```bash
git log
```

### 5. Push para o GitHub

```bash
git push -u origin main
```

### 6. Verificar no GitHub

Acesse seu repositório no GitHub e confirme que os arquivos foram enviados.

## 🔒 Considerações de Segurança

### Arquivos que NÃO devem ser commitados

O `.gitignore` já está configurado para ignorar:
- `.env.local` (contém chaves API sensíveis)
- `node_modules/` (dependências)
- `.next/` (build do Next.js)
- Arquivos de log

### Variáveis de Ambiente

O arquivo `.env.example` está incluído no repositório como template. Ele contém:
- Estrutura das variáveis necessárias
- Valores de exemplo (sem chaves reais)
- Instruções de configuração

**Para outros desenvolvedores:**
1. Clonar o repositório
2. Copiar `.env.example` para `.env.local`
3. Preencher com suas próprias chaves

## 📝 Documentação Recomendada

### Criar README.md

Crie um arquivo `README.md` na raiz do projeto:

```markdown
# Zapilink

Next.js application with Supabase backend for profile management and scheduling.

## 🚀 Features

- Multi-profile management system
- Rich text editor for profile descriptions
- Schedule/agenda functionality with calendar view
- Google Calendar integration
- Security hardening with structured logging

## 🛠️ Tech Stack

- Next.js 16.3.1
- React 18.3.1
- TypeScript
- Supabase (Auth, Database, Storage)
- Tailwind CSS
- Google Calendar API

## 📋 Prerequisites

- Node.js 18+
- Supabase project
- Google Cloud project (para Google Calendar)

## 🔧 Setup

1. Clone o repositório
2. Instale dependências:
   ```bash
   npm install
   ```
3. Configure variáveis de ambiente:
   ```bash
   cp .env.example .env.local
   ```
4. Preencha as variáveis no `.env.local`
5. Execute as migrações do Supabase (veja `scripts/`)
6. Inicie o servidor:
   ```bash
   npm run dev
   ```

## 📚 Documentação

- [Configuração de Ambiente](docs/ENVIRONMENT_SETUP.md)
- [Scripts de Migração](scripts/)

## 🎨 Personalização

- [Especificações do Projeto](docs/superpowers/specs/)

## 📄 License

MIT
```

### Adicionar License

1. No GitHub, vá ao repositório
2. Clique em **Add file** → **Create new file**
3. Nome: `LICENSE`
4. Escolha a licença (MIT é comum para projetos open source)
5. Clique em **Review changes** → **Commit new file**

## 🔄 Atualizações Futuras

### Workflow de Desenvolvimento

```bash
# Criar branch para nova feature
git checkout -b feature/nova-funcionalidade

# Fazer alterações
git add .
git commit -m "Add nova funcionalidade"

# Push para o branch
git push origin feature/nova-funcionalidade

# Criar Pull Request no GitHub
```

### Branch Protection

No GitHub:
1. Settings → Branches
2. Add rule
3. Configure proteção para branch `main`
4. Requerir reviews, tests, etc.

## 🐛 Troubleshooting

### Erro de Autenticação

Se receber erro de autenticação ao fazer push:

```bash
# Usar SSH em vez de HTTPS
git remote set-url origin git@github.com:SEU_USUARIO/zapilink.git
```

### Arquivos Sensíveis Commitados

Se acidentalmente comitou arquivos sensíveis:

```bash
# Remover do histórico (cuidado!)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (só se necessário)
git push origin --force
```

## 🎯 Próximos Passos

1. ✅ Criar repositório no GitHub
2. ✅ Conectar e fazer push
3. ✅ Adicionar README.md
4. ✅ Configurar branch protection
5. ✅ Adicionar CI/CD (opcional)
6. ✅ Deploy para Vercel (opcional)

## 📞 Suporte

Para dúvidas sobre o projeto, consulte a documentação em `docs/`.
