# ZAPILINK - Landing Page Design Spec

**Date:** 2026-08-07  
**Phase:** 1 - Landing Page MVP  
**Status:** Approved

---

## Overview

ZAPILINK é uma plataforma inspirada no Linktree que vai além de uma simples página de links. Esta fase 1 entrega uma landing page de exemplo que demonstra a estrutura visual e funcional da plataforma, com foco em navegação e UI.

**Slogan:** Todos os seus links, vendas, agendamentos e automações em um único lugar.

---

## Escopo da Fase 1

Esta fase entrega **apenas a página de landing** (o que o visitante vê), sem autenticação ou banco de dados. É um exemplo hardcoded com:

- Página de perfil de exemplo: "João Influenciador"
- Cabeçalho com informações do perfil
- 4-5 botões inteligentes (WhatsApp, Agendar, Comprar, Pagar)
- 2 blocos de exemplo: Serviços e FAQ
- Design moderno e colorido
- Totalmente responsivo (mobile-first)

---

## Stack Técnico

- **Framework:** Next.js 14+
- **Linguagem:** TypeScript
- **Styling:** Tailwind CSS
- **Design System:** Moderno, colorido, gradientes e cards

---

## Estrutura de Componentes

### 1. ProfileHeader
Exibe as informações do perfil do usuário:
- Foto de perfil
- Nome completo
- Username (@usuario)
- Descrição/Bio
- Botões de redes sociais (links para Instagram, TikTok, LinkedIn, etc.)

**Props:**
```typescript
{
  photo: string;
  name: string;
  username: string;
  description: string;
  socialLinks: Array<{ platform: string; url: string }>;
}
```

### 2. SmartButton
Componente individual para cada botão inteligente.

**Tipos suportados:**
- `whatsapp` — Conversar no WhatsApp
- `schedule` — Agendar
- `buy` — Comprar Agora
- `pay` — Pagar
- (Extensível para outros tipos no futuro)

**Props:**
```typescript
{
  type: 'whatsapp' | 'schedule' | 'buy' | 'pay';
  label: string;
  link?: string;
  phone?: string;
  icon?: string;
}
```

Cada botão tem:
- Ícone visual
- Label customizável
- Ação ao clicar (link externo, phone URI, etc.)
- Hover/active states

### 3. SmartButtonGrid
Container responsivo que organiza os SmartButtons em grid.

**Comportamento:**
- 2 colunas em mobile (< 640px)
- 4 colunas em tablet (640px - 1024px)
- 5 colunas em desktop (> 1024px)
- Espaçamento generoso entre botões

### 4. ServiceBlock
Exibe lista de serviços com informações e preços.

**Estrutura:**
```typescript
{
  title: string;
  items: Array<{
    id: string;
    name: string;
    description: string;
    price?: string | number;
  }>;
}
```

**Comportamento:**
- Lista com cards para cada serviço
- Design limpo com preço destacado (se houver)
- Responsive grid

### 5. FAQBlock
Seção de perguntas frequentes com accordion/expandível.

**Estrutura:**
```typescript
{
  title: string;
  items: Array<{
    id: string;
    question: string;
    answer: string;
  }>;
}
```

**Comportamento:**
- Accordion: apenas uma FAQ aberta por vez
- Smooth animation ao expandir/colapsar
- Ícone de chevron indicando estado

### 6. PageLayout
Componente pai que orquestra a página completa.

Combina:
1. ProfileHeader
2. SmartButtonGrid
3. ServiceBlock
4. FAQBlock

Com espaçamento e padding consistentes.

---

## Estrutura de Dados

**Arquivo:** `data/profileData.ts`

```typescript
export const profileData = {
  header: {
    photo: "https://...",
    name: "João Influenciador",
    username: "@joaoinfluencer",
    description: "Criador de conteúdo | Coach | Empreendedor",
    socialLinks: [
      { platform: "instagram", url: "https://instagram.com/..." },
      { platform: "tiktok", url: "https://tiktok.com/@..." },
      { platform: "youtube", url: "https://youtube.com/..." },
    ]
  },
  smartButtons: [
    {
      type: "whatsapp",
      label: "Conversar no WhatsApp",
      phone: "5511999999999"
    },
    {
      type: "schedule",
      label: "Agendar Consulta",
      link: "https://calendly.com/..."
    },
    {
      type: "buy",
      label: "Comprar Agora",
      link: "https://shop.example.com"
    },
    {
      type: "pay",
      label: "Pagar com PIX",
      link: "https://payment.example.com"
    }
  ],
  blocks: [
    {
      type: "services",
      title: "Serviços",
      items: [
        {
          id: "1",
          name: "Consultoria 1:1",
          description: "Sessão de 1 hora de consultoria personalizada",
          price: "R$ 297"
        },
        {
          id: "2",
          name: "Programa 3 Meses",
          description: "Programa completo com 12 aulas ao vivo",
          price: "R$ 1.997"
        }
      ]
    },
    {
      type: "faq",
      title: "Perguntas Frequentes",
      items: [
        {
          id: "1",
          question: "Como funciona a consultoria?",
          answer: "Você marca um horário, e fazemos uma chamada de vídeo privada..."
        },
        {
          id: "2",
          question: "Qual é a política de reembolso?",
          answer: "Oferecemos garantia de 7 dias de satisfação..."
        }
      ]
    }
  ]
};
```

---

## Layout e Flow Visual

A página segue um layout linear de cima para baixo:

```
┌─────────────────────────────┐
│   ProfileHeader             │
│ (foto, nome, descrição)     │
└─────────────────────────────┘
            ↓
┌─────────────────────────────┐
│   SmartButtonGrid           │
│ (4 botões inteligentes)     │
└─────────────────────────────┘
            ↓
┌─────────────────────────────┐
│   ServiceBlock              │
│ (lista de serviços)         │
└─────────────────────────────┘
            ↓
┌─────────────────────────────┐
│   FAQBlock                  │
│ (accordion de perguntas)    │
└─────────────────────────────┘
```

---

## Design Visual

### Paleta de Cores
- **Primária:** Roxo vibrante (#7C3AED ou similar)
- **Complementar:** Laranja (#F97316 ou similar)
- **Neutro:** Branco (#FFFFFF) e Cinza escuro (#1F2937)
- **Gradientes:** Roxo → Laranja para cards e CTAs

### Tipografia
- **Headlines:** Font weight 700, tamanho 32px+ (mobile: 24px)
- **Body:** Font weight 400, tamanho 16px

### Componentes
- **Cards:** Com sombra suave, border-radius 12px
- **Botões:** Altura 48px+, padding horizontal generoso, hover com lightening
- **Espaçamento:** Margin/padding em múltiplos de 8px (8, 16, 24, 32, 48)

### Responsividade
- **Mobile:** < 640px — 1 coluna, botões empilhados
- **Tablet:** 640px - 1024px — 2 colunas
- **Desktop:** > 1024px — Layout completo com 5 colunas de botões

---

## Estrutura de Arquivos

```
zapilink/
├── .gitignore
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
│
├── app/
│   ├── layout.tsx (layout raiz)
│   ├── page.tsx (redirect para /profile)
│   └── profile/
│       └── page.tsx (página principal)
│
├── components/
│   ├── ProfileHeader.tsx
│   ├── SmartButton.tsx
│   ├── SmartButtonGrid.tsx
│   ├── ServiceBlock.tsx
│   ├── FAQBlock.tsx
│   └── PageLayout.tsx
│
├── data/
│   └── profileData.ts
│
├── styles/
│   └── globals.css
│
└── docs/
    └── superpowers/
        └── specs/
            └── 2026-08-07-zapilink-landing-page-design.md
```

---

## Fluxo de Desenvolvimento

1. **Configuração do projeto:** Next.js + Tailwind + TypeScript
2. **Criação de componentes:** Do ProfileHeader até FAQBlock
3. **Integração:** Montar PageLayout com dados de profileData
4. **Estilização:** Aplicar paleta de cores e design moderno
5. **Testes:** Responsividade mobile/tablet/desktop
6. **Deploy:** (Fase futura)

---

## Testing Strategy (Fase 1)

### Testes Visuais
- Verificar renderização correta de cada componente
- Validar aplicação de cores e tipografia

### Responsividade
- Testar em dispositivos/breakpoints:
  - Mobile: 375px (iPhone SE)
  - Tablet: 768px (iPad)
  - Desktop: 1024px+ (MacBook)

### Acessibilidade
- Contraste de cores (WCAG AA mínimo)
- Navegação por teclado nos componentes interativos (accordion)
- Alt text em imagens

### Performance
- Lazy load de imagens
- Code splitting (Next.js padrão)

---

## Próximas Fases (Fora do Escopo)

1. **Fase 2:** Dashboard/Admin para criar e editar páginas
2. **Fase 3:** Sistema de autenticação (login/signup)
3. **Fase 4:** Banco de dados e persistência
4. **Fase 5:** Integrações (WhatsApp API, pagamentos, calendário)
5. **Fase 6:** Sistema de módulos/blocos extensível

---

## Notas

- Este é um MVP visual — nenhuma ação de botão será funcional beyond links externos
- O exemplo é hardcoded; será data-driven via CMS/Dashboard nas fases futuras
- Toda estrutura é preparada para crescimento modular
