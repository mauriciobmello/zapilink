# ZAPILINK Fase 2b — Blocos e Botões Editáveis

**Data:** 2026-08-10
**Fase:** 2b — Gerenciamento de blocos e botões
**Status:** Aprovado

---

## Visão Geral

A Fase 2b dá ao usuário controle sobre o corpo da sua página. Hoje `/[username]` renderiza apenas cabeçalho, descrição e links sociais. Os componentes de blocos da Fase 1 — `SmartButtonGrid`, `ServiceBlock`, `FAQBlock` — existem no repositório mas estão órfãos: só são usados por `/profile`, a demo com dados fixos do "João Influenciador".

Esta fase entrega três coisas ao mesmo tempo:

1. Um modelo de dados para blocos
2. Um editor de blocos no dashboard
3. A renderização desses blocos na página pública real, pela primeira vez

**Objetivo:** o usuário monta a própria página — escolhe quais blocos aparecem, em que ordem, com que conteúdo.

---

## Escopo

Três tipos de bloco, exatamente os que a Fase 1 já desenhou:

| Tipo | Descrição |
|------|-----------|
| `buttons` | Grade de botões inteligentes: WhatsApp, Agendar, Comprar, Pagar |
| `services` | Cartões de serviço com nome, descrição e preço opcional |
| `faq` | Acordeão de pergunta e resposta |

A página é uma **lista ordenada de blocos**. O usuário reordena livremente, pode ter dois blocos do mesmo tipo ou nenhum, e pode esconder um bloco sem excluí-lo. A grade de botões é um tipo de bloco como os outros — não um campo à parte — para que uma única lista ordenada descreva a página inteira.

### Fora de escopo

- Rastreamento de cliques por botão/bloco (Fase 2c, junto com analytics)
- Novos tipos de bloco (texto livre, vídeo, galeria)
- Arrastar-e-soltar para reordenar
- Edição de `username`

---

## Decisões de Arquitetura

### Blocos em tabela própria, não em coluna `jsonb`

Foram consideradas duas opções: uma coluna `jsonb blocks` em `profiles` (seguindo o precedente de `social_links`) ou uma tabela `blocks` separada.

**Escolhida: tabela separada.** Cada bloco é uma linha, o que torna o autosave barato — digitar em um bloco escreve uma linha pequena, não o documento inteiro da página — e deixa o caminho aberto para o rastreamento de cliques da Fase 2c referenciar blocos por chave estrangeira real.

O custo assumido: um conjunto novo de políticas RLS, e reordenação como múltiplos UPDATEs em vez de um splice de array.

### Itens continuam em JSON

Os itens *dentro* de um bloco — cada botão, cada serviço, cada par pergunta/resposta — ficam em `content jsonb`. Dois níveis de linhas transformariam cada edição em transação multi-linha sem benefício.

**A regra:** a lista ordenada em nível de página são linhas; conteúdo folha é JSON.

### Reordenação por setas ↑/↓

O projeto não tem nenhuma dependência de UI — só React e Tailwind. Setas não custam dependência nova, funcionam bem no toque e são acessíveis por padrão. Arrastar-e-soltar pode substituí-las depois sem mudar o modelo de dados.

---

## Modelo de Dados

### Tabela `blocks`

```sql
CREATE TABLE blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type varchar(20) NOT NULL CHECK (type IN ('buttons', 'services', 'faq')),
  position integer NOT NULL,
  is_visible boolean NOT NULL DEFAULT true,
  title varchar(255),
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX blocks_profile_position_idx ON blocks(profile_id, position);
```

`ON DELETE CASCADE` importa agora que um usuário tem vários perfis: excluir um perfil leva os blocos dele junto.

`title` é coluna, e não campo dentro de `content`, porque é o único campo que todo tipo pode renderizar como cabeçalho — os "Meus Serviços" e "Dúvidas Frequentes" da Fase 1. É anulável; um bloco `buttons` normalmente não tem título.

### Formato de `content` por tipo

```jsonc
// type: 'buttons'
{
  "items": [
    { "id": "btn-1", "type": "whatsapp", "label": "Fale Comigo", "phone": "5511999999999" },
    { "id": "btn-2", "type": "schedule", "label": "Agendar", "link": "https://calendly.com/..." }
  ]
}

// type: 'services'
{
  "items": [
    { "id": "srv-1", "name": "Consultoria 1:1", "description": "Sessão de 60 minutos.", "price": "R$ 297" }
  ]
}

// type: 'faq'
{
  "items": [
    { "id": "faq-1", "question": "Como funciona?", "answer": "Uma sessão via Zoom." }
  ]
}
```

Os quatro tipos de botão e seus campos:

| `type` | Campo de destino | Ação |
|--------|------------------|------|
| `whatsapp` | `phone` | Abre `https://wa.me/{phone}?text=...` |
| `schedule` | `link` | Abre o link |
| `buy` | `link` | Abre o link |
| `pay` | `link` | Abre o link |

### Sobre `position`

**Deliberadamente sem constraint UNIQUE** em `(profile_id, position)`. Com reordenação por setas, uma troca são dois UPDATEs, e a constraint rejeitaria o estado intermediário. As leituras ordenam por `position, created_at`, então uma duplicata transitória degrada para ordenação estável-porém-arbitrária em vez de erro.

Blocos novos entram com `position = max(position) + 1`.

### Identificadores e `updated_at`

O `id` do bloco vem do banco (`gen_random_uuid()`). Os `id` dos itens dentro de `content` são gerados no cliente com `crypto.randomUUID()` no momento em que o item é criado, e nunca mudam — é o que permite ao React manter `key` estável durante a reordenação, e o que a Fase 2c vai usar para atribuir cliques a um botão específico.

`updated_at` é escrito pela aplicação a cada UPDATE (`updated_at: new Date().toISOString()`), como `ProfileForm` já faz para `profiles`. Sem trigger no banco.

### RLS

Leitura pública, escrita só do dono, com a posse derivada de `profiles`:

```sql
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blocks" ON blocks
  FOR SELECT USING (true);

CREATE POLICY "Users can insert blocks on their own profiles" ON blocks
  FOR INSERT WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update blocks on their own profiles" ON blocks
  FOR UPDATE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  ) WITH CHECK (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete blocks on their own profiles" ON blocks
  FOR DELETE USING (
    profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())
  );
```

A migração vai em `scripts/migrate-blocks.sql`, seguindo o padrão de `scripts/migrate-multiple-profiles.sql`, e é executada à mão no SQL Editor do Supabase.

### Tipos TypeScript

Arquivo novo `types/block.ts`, separado de `types/profile.ts` para que nenhum dos dois vire um saco de gatos:

```typescript
export type BlockType = 'buttons' | 'services' | 'faq';
export type ButtonType = 'whatsapp' | 'schedule' | 'buy' | 'pay';

export interface ButtonItem {
  id: string;
  type: ButtonType;
  label: string;
  link?: string;
  phone?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

export interface BlockBase {
  id: string;
  profile_id: string;
  position: number;
  is_visible: boolean;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export type Block =
  | (BlockBase & { type: 'buttons'; content: { items: ButtonItem[] } })
  | (BlockBase & { type: 'services'; content: { items: ServiceItem[] } })
  | (BlockBase & { type: 'faq'; content: { items: FAQItem[] } });
```

---

## Página Pública

### Consulta única

A página mantém uma só ida ao servidor, embutindo os blocos pela chave estrangeira:

```typescript
const { data } = await supabase
  .from('profiles')
  .select('*, blocks(*)')
  .eq('username', username)
  .eq('blocks.is_visible', true)
  .order('position', { referencedTable: 'blocks' })
  .single();
```

Filtrar o recurso embutido, em vez de buscar tudo e esconder no React, mantém os blocos ocultos fora da resposta — o bloco inacabado de um usuário não deve estar visível na aba de rede da própria página pública.

O embed é simples, **sem `!inner`**: assim o filtro `is_visible` esvazia o array de blocos quando nenhum é visível, em vez de fazer o próprio perfil sumir do resultado. Um perfil com todos os blocos ocultos continua carregando normalmente, só sem blocos.

### Componentes novos em `components/blocks/`

| Componente | Responsabilidade |
|-----------|------------------|
| `BlockRenderer.tsx` | Despacha por `block.type`; devolve `null` para tipo desconhecido |
| `ButtonsBlock.tsx` | Grade responsiva 2/3/4 colunas; monta o link `wa.me` |
| `ServicesBlock.tsx` | Cartões com nome, descrição e preço opcional |
| `FAQBlock.tsx` | Acordeão, um item aberto por vez |

Cada um recebe `{ block, theme }`. A página pública mapeia `profile.blocks` renderizando um `<BlockRenderer />` por item, entre o cartão de links sociais e o rodapé "Criado com ZAPILINK".

### Extração do tema

`app/[username]/page.tsx` hoje calcula o gradiente de fundo e a cor de texto clara/escura em linha, no corpo do componente. Os blocos precisam desses mesmos valores, e o preview do editor também.

Essa lógica passa para `lib/profileTheme.ts`:

```typescript
export function getProfileTheme(profile: Profile): {
  background: React.CSSProperties;
  textColor: string;
  primary: string;   // profile.theme_color
  accent: string;    // profile.theme_accent
  isLight: boolean;
}
```

É o único refatoramento incluído nesta fase — está no caminho direto do trabalho, não é uma limpeza oportunista.

### Por que não reaproveitar os componentes da Fase 1

Eles estão sobre outra fundação: importam tipos de `data/profileData.ts` e se estilizam com classes Tailwind `from-primary` / `from-accent`, enquanto a página real aplica tema por estilo inline a partir de `theme_color` / `theme_accent` / `theme_style`. Adaptá-los dá mais trabalho do que escrever versões cientes do tema, e a estrutura visual (grades, acordeão) se aproveita por cópia.

### Limpeza

Com os blocos reais no ar, a demo com dados fixos vira duplicata da mesma funcionalidade e é removida:

- `app/profile/page.tsx`
- `data/profileData.ts`
- `components/SmartButton.tsx`
- `components/SmartButtonGrid.tsx`
- `components/ServiceBlock.tsx`
- `components/FAQBlock.tsx`
- `components/PageLayout.tsx`
- `components/ProfileHeader.tsx`

Dois `FAQBlock` divergentes no mesmo repositório são uma armadilha — a próxima pessoa edita o errado. O histórico do git preserva tudo isso caso um dia faça falta.

---

## Editor no Dashboard

### Navegação

`app/dashboard/edit/page.tsx` mantém a função atual — checar autenticação, carregar o perfil por `profileId` ou o principal — e ganha duas abas. A aba ativa vai na URL, `?profileId=X&tab=blocos`, para sobreviver a um refresh e ser linkável a partir do dashboard.

```
┌─ Perfil ─┬─ Blocos ─────────────────────────────┐
│                                                  │
│  [ + Adicionar bloco ▾ ]                         │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │ ↑ ↓   Botões · 4 itens        👁  ▸  🗑  │   │
│  ├──────────────────────────────────────────┤   │
│  │ ↑ ↓   Meus Serviços · 3 itens  👁  ▾  🗑 │   │
│  │   ┌────────────────────────────────────┐ │   │
│  │   │ Título do bloco: [Meus Serviços  ] │ │   │
│  │   │ ↑↓ Consultoria 1:1   R$ 297    🗑 │ │   │
│  │   │ ↑↓ Programa 3 Meses  R$ 1.997  🗑 │ │   │
│  │   │ [ + Adicionar serviço ]            │ │   │
│  │   └────────────────────────────────────┘ │   │
│  ├──────────────────────────────────────────┤   │
│  │ ↑ ↓   Dúvidas Frequentes · 4    👁  ▸  🗑│   │
│  └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

Um card expandido por vez, em acordeão, para a página seguir navegável com uma dúzia de blocos. O `👁` controla `is_visible`: blocos ocultos continuam no editor e somem da página pública.

### Componentes em `components/dashboard/blocks/`

| Componente | Responsabilidade |
|-----------|------------------|
| `BlockListEditor.tsx` | Dono da lista ordenada: adicionar, excluir, reordenar, visibilidade. Único componente que fala com o Supabase sobre blocos. |
| `BlockCard.tsx` | Moldura do card: controles de mover, tipo, contagem de itens, alternadores. Renderiza o editor certo quando expandido. |
| `ButtonsBlockEditor.tsx` | Edita `content.items` de botões |
| `ServicesBlockEditor.tsx` | Edita `content.items` de serviços |
| `FAQBlockEditor.tsx` | Edita `content.items` de FAQ |

A divisão é proposital: os três editores de conteúdo são inputs controlados puros, recebendo `{ content, onChange }` e sem nenhum conhecimento de persistência. Toda a lógica de salvar mora num lugar só.

### Salvamento

Dois comportamentos, porque são dois tipos de mudança:

- **Edições de conteúdo** (digitar rótulo, preço, resposta) salvam sozinhas 1,5 s depois que o usuário para, atualizando só a linha daquele bloco.
- **Mudanças estruturais** (adicionar, excluir, reordenar, esconder) persistem na hora. São cliques deliberados e únicos; adiá-los deixa ambíguo se a ação pegou.

O status aparece por card — "Salvando…" / "Salvo" ao lado do bloco editado — em vez da faixa verde global que `ProfileForm` usa hoje, já que com vários blocos uma faixa global não diz *o que* foi salvo.

### Reordenação

Troca local no estado, renumeração do par afetado, dois UPDATEs. Se qualquer um falhar, o estado local reverte e o erro aparece no card. A lista nunca mostra uma ordem que o banco não tem.

### Preview ao vivo

A aba Blocos renderiza o `BlockRenderer` e o `getProfileTheme` reais contra a lista em memória. O preview não pode divergir da página pública porque é o mesmo código.

---

## Erros e Casos Limite

**Perfil sem blocos.** A página pública não renderiza nada entre os links sociais e o rodapé. O editor mostra estado vazio: "Nenhum bloco ainda", com o botão de adicionar em destaque.

**Conteúdo inesperado.** `BlockRenderer` devolve `null` para `type` desconhecido, e cada renderer lê `content.items` por um acessor que devolve `[]` quando o campo falta ou não é array. Um `jsonb` editado à mão no console do Supabase deixa a página incompleta, nunca em tela branca.

**Falha ao salvar.** O estado local é preservado e o erro aparece no próprio card, com botão "Tentar novamente". O autosave não fica tentando em laço: uma falha o desliga para aquele bloco até a próxima edição ou clique de retry.

**Botões incompletos.** Botão WhatsApp sem telefone, ou botão de link sem URL, é omitido da página pública e marcado no editor com aviso "Faltando telefone/link". Melhor esconder do que publicar um botão que leva a `#`.

**Concorrência.** Duas abas editando o mesmo bloco resolvem por último-a-escrever-vence. Versionamento não se justifica num editor de um usuário só — fica registrado como decisão consciente.

**Exclusão.** Confirmação antes de excluir um bloco. O `ON DELETE CASCADE` cobre a exclusão de perfil.

### Validações

| Campo | Regra |
|-------|-------|
| Rótulo de botão | Obrigatório, máx. 60 caracteres |
| `link` | Precisa começar com `http://` ou `https://` |
| `phone` | Só dígitos, 10 a 15 (formato `wa.me`) |
| Título do bloco | Opcional, máx. 255 caracteres |
| Nome de serviço | Obrigatório, máx. 100 caracteres |
| Preço | Texto livre — "R$ 297", "a partir de R$ 50" e "sob consulta" são todos válidos |
| Pergunta / Resposta | Ambas obrigatórias |

### Limites

20 blocos por perfil, 10 itens por bloco. Não é regra de negócio, é proteção contra página desgovernada.

A checagem é no editor: ao atingir o limite, o botão de adicionar fica desabilitado com a explicação do porquê. Não há constraint no banco — o limite existe para guiar o usuário, não para defender a integridade dos dados.

---

## Testes

O projeto não tem framework de teste, e esta fase não introduz um — mantém o padrão de checklist manual das Fases 1 e 2a.

### Funcional

- [ ] Adicionar um bloco de cada tipo; todos aparecem na página pública
- [ ] Reordenar blocos com ↑/↓; a ordem persiste após refresh
- [ ] Ocultar um bloco; ele some da página pública e continua no editor
- [ ] Excluir um bloco; some dos dois lados, com confirmação antes
- [ ] Editar conteúdo; salva sozinho ~1,5 s depois e mostra "Salvo"
- [ ] Adicionar, remover e reordenar itens dentro de um bloco
- [ ] Botão WhatsApp abre `wa.me` com o telefone certo
- [ ] Botões Agendar / Comprar / Pagar abrem seus links em nova aba
- [ ] Botão sem telefone/link não aparece na página pública
- [ ] Acordeão do FAQ abre e fecha, um item por vez
- [ ] Preview da aba Blocos bate com a página pública
- [ ] Perfil sem blocos renderiza sem erro
- [ ] Blocos seguem o tema do perfil (todos os `theme_style`)
- [ ] Trocar de perfil pelo `profileId` carrega os blocos daquele perfil
- [ ] Excluir um perfil apaga os blocos dele

### Segurança

- [ ] Usuário A não consegue criar bloco no perfil de B
- [ ] Usuário A não consegue editar nem excluir bloco de B
- [ ] Visitante anônimo lê blocos visíveis e não consegue escrever
- [ ] Blocos ocultos não aparecem na resposta da API da página pública

### Limites

- [ ] Com 20 blocos, "Adicionar bloco" fica desabilitado e explica o motivo
- [ ] Com 10 itens, "Adicionar item" fica desabilitado e explica o motivo

---

## Próximas Fases

**Fase 2c — Analytics:** cliques por bloco e por botão (referenciando `blocks.id`), visitantes por dia/semana/mês, referrers, gráficos no dashboard.

**Fase 3 — Autenticação social:** login com Google, GitHub, Discord.

**Fase 4 — Integrações:** WhatsApp API, Stripe, Google Calendar, Typeform.