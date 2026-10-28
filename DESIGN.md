# DESIGN.md — Sistema de design SCREW

Guia completo do visual do sistema **Manutenção Preventiva das Matrizes (SCREW · Matrizaria)**. Escrito para quem vai desenvolver sem ver as telas. Fonte única dos valores: `design/tokens.css` (os mesmos valores estão em `design/tokens.json`). Referência visual de cada componente: `design/componentes.html`.

> **Regra de ouro:** toda cor, fonte, tamanho de texto, espaçamento, raio, sombra e duração vem de um token `var(--...)`. Se faltar um token, ele é criado em `design/tokens.css` (nos dois temas) e documentado aqui — nunca um valor solto no código.

**Clima do visual:** claro, limpo, com muitos dados mas com respiro. A tela de fundo é cinza, os painéis são brancos e arredondados por cima dela, o item ativo fica em tinta escura e há um único azul para a ação principal. O lado industrial vem do azul-marinho e do aço da marca, não de excesso de enfeite.

---

## 1. Marca

### Arquivos (`design/assets/logo/`)
| Arquivo | Uso |
|---|---|
| `screw-logo-transparent.png` | Logo colorido (marinho + aço). Fundo branco ou cinza claro. Sidebar no tema claro. |
| `screw-logo-white.png` | Logo branco. Fundo marinho, tinta escura ou tema escuro. |
| `screw-logo-boxed.png` | Logo original dentro da caixa arredondada (só sobre branco). |
| `screw-mark.png` | Só o símbolo "S" colorido: sidebar recolhida, topo no celular, ícone do app. |
| `screw-mark-white.png` | Símbolo branco: mesmos usos no tema escuro. |
| `../marca/screw-banner.jpg` | Banner original (espirais em arame, moldura aço → marinho). Só em login, apresentação ou splash. |

Os logos são **PNG recortados do banner original (≈370 px)**. Não existe SVG oficial: peça o vetor à SCREW antes de imprimir ou usar em tamanho grande.

### Claro e escuro
- Tema claro: `logo-light` (colorido). Tema escuro: `logo-dark` (branco). No HTML, coloque as duas imagens com as classes `logo-light` e `logo-dark`; o CSS mostra a correta conforme o tema.
- Altura na tela: sidebar 30px · menu do celular 28px · símbolo 28–32px.

### Área de respiro e tamanho mínimo
- Respiro mínimo em volta do logo = **altura da letra "S" do símbolo** (≈ metade da altura do logo). Na sidebar isso equivale a 8px nas laterais e ao bloco de 40px de altura.
- Tamanho mínimo: logo completo 24px de altura; símbolo 20px.

### Não fazer
- Não redesenhar, contornar, distorcer, girar, mudar as cores ou aplicar sombra ou brilho ao logo.
- Não colocar o logo colorido sobre fundo escuro nem o branco sobre fundo claro.
- Não colocar o logo sobre fotos ou gradientes que não sejam `--gradient-brand`.
- Não usar o aço (`--steel-*`) em interface; ele é só da arte de marca.

---

## 2. Cores

Use **somente os aliases semânticos** (seções 2.2 em diante) nas telas. A paleta base existe só para montar os aliases dentro de `tokens.css`. Proporção aproximada numa tela: cinzas 80% · tinta 10% · azul 7% · semânticas 3%.

### 2.1 Paleta base (não usar direto nas telas)
| Grupo | Tokens |
|---|---|
| Marinho | `--navy-950` #0B1B2C · `--navy-900` #0F2439 · `--navy-800` #15304B · **`--navy-700` #1B3D5C (cor da marca)** · `--navy-600` #244E73 · `--navy-500` #2E5F8A |
| Azul de ação | `--blue-700` #1A4F8F · `--blue-600` #1F5CA6 · `--blue-500` #2668BA · `--blue-400` #4F86CC · `--blue-300` #8FB2E0 · `--blue-200` #C4D7F0 · `--blue-100` #E3ECF8 · `--blue-50` #F1F6FC |
| Aço (só marca) | `--steel-700` #46474F · `--steel-600` #585760 · `--steel-500` #7A7E87 · `--steel-400` #A8A9AF · `--steel-300` #C9CACF |
| Neutros frios | `--gray-0` #FFFFFF · `--gray-25` #F9FAFB · `--gray-50` #F2F4F7 · `--gray-100` #E9ECF1 · `--gray-200` #DDE1E8 · `--gray-300` #C5CAD3 · `--gray-400` #9CA3AF · `--gray-500` #747C8A · `--gray-600` #575F6D · `--gray-700` #3C4350 · `--gray-750` #2A3240 · `--gray-800` #262C37 · `--gray-850` #1E2531 · `--gray-875` #181F2A · `--gray-900` #141A24 · `--gray-925` #0F151E · `--gray-950` #0B111A |
| Verde | `--green-600` #1F7A4E · `--green-500` #30A46C · `--green-400` #4CC38A · `--green-100` #E3F5EC |
| Âmbar | `--amber-600` #A96A05 · `--amber-500` #F5A524 · `--amber-400` #F5B94A · `--amber-100` #FEF3DE |
| Vermelho | `--red-600` #C4302F · `--red-500` #E5484D · `--red-400` #F2777B · `--red-100` #FDEBEC |
| Ciano | `--cyan-600` #0E7490 · `--cyan-500` #0891B2 · `--cyan-400` #3FB5D3 · `--cyan-100` #E0F4F8 |

### 2.2 Marca e ação
| Token | Claro | Escuro | Quando usar |
|---|---|---|---|
| `--brand` | #1B3D5C | #1B3D5C | Momentos de marca (logo, gradientes). Não é cor de botão. |
| `--brand-strong` | #0F2439 | #0F2439 | Marca em fundo muito escuro. |
| `--accent` | #1F5CA6 | #2668BA | Botão primário, foco, seleção, checkbox/radio/switch ligados, barra atual do gráfico. |
| `--accent-hover` | #1A4F8F | #1F5CA6 | Hover do primário, hover de link. |
| `--accent-soft` | #E3ECF8 | rgba(79,134,204,.18) | Fundo de botão `soft`, chip selecionado, pílula "Em manutenção". |
| `--accent-soft-hover` | #C4D7F0 | rgba(79,134,204,.28) | Hover do `soft`. |
| `--accent-soft-fg` | #1A4F8F | #8FB2E0 | Texto sobre `--accent-soft`. |
| `--accent-muted` | #8FB2E0 | #2E5F8A | Barras secundárias de gráfico. |
| `--accent-ring` | rgba(38,104,186,.22) | rgba(79,134,204,.35) | Anel de foco (via `--ring-focus`). |
| `--on-accent` | #FFFFFF | #FFFFFF | Texto/ícone sobre azul, sobre vermelho e sobre o gradiente; bolha do botão primário. |
| `--on-accent-muted` | rgba(255,255,255,.72) | rgba(255,255,255,.72) | Texto secundário dentro do cartão em destaque. |
| `--on-accent-subtle` | rgba(255,255,255,.6) | rgba(255,255,255,.6) | Sobretítulo dentro do destaque. |
| `--on-accent-fill` | rgba(255,255,255,.18) | rgba(255,255,255,.18) | Delta e divisórias dentro do destaque. |
| `--on-accent-track` | rgba(255,255,255,.2) | rgba(255,255,255,.2) | Trilho de progresso dentro do destaque. |

### 2.3 Superfícies
| Token | Claro | Escuro | Quando usar |
|---|---|---|---|
| `--bg-app` | #F2F4F7 | #0B111A | Fundo da página inteira. |
| `--bg-app-fade` | rgba(242,244,247,0) | rgba(11,17,26,0) | Ponta transparente do degradê da barra de ação fixa no celular. |
| `--surface-card` | #FFFFFF | #141A24 | Cartões, sidebar, topbar, gaveta, modal, campos. |
| `--surface-sunken` | #F2F4F7 | #0F151E | Áreas rebaixadas dentro do cartão: trilho das abas, caixa de uso, busca preenchida, grupo de menu aberto, rodapé de tabela. |
| `--surface-muted` | #E9ECF1 | #1E2531 | Trilho do segmentado, botão `neutral`, tags, avatar, trilho do medidor. |
| `--surface-muted-hover` | #DDE1E8 | #2A3240 | Hover do `neutral`. |
| `--surface-hover` | #F2F4F7 | #1E2531 | Hover de itens de menu e do `outline`. |
| `--surface-hover-subtle` | #F9FAFB | #181F2A | Hover de linha de tabela, do botão secundário e de chip. |
| `--surface-selected` | #F1F6FC | rgba(79,134,204,.12) | Linha selecionada ou com gaveta aberta. |
| `--surface-inverse` | #141A24 | #F2F4F7 | Item ativo (menu, aba em pílula, página atual), botão `dark`, barra de seleção em massa. |
| `--surface-inverse-hover` | #3C4350 | #DDE1E8 | Hover do `dark`. |
| `--surface-overlay` | rgba(20,26,36,.40) | rgba(0,0,0,.60) | Escurecimento atrás da gaveta, do modal e do menu do celular. |
| `--surface-glass` | rgba(255,255,255,.92) | rgba(20,26,36,.92) | Barra de abas inferior do celular (com desfoque de 12px). |
| `--surface-disabled` | #E9ECF1 | #1E2531 | Fundo de botão desabilitado. |

### 2.4 Texto
| Token | Claro | Escuro | Quando usar |
|---|---|---|---|
| `--text-strong` | #141A24 | #F2F4F7 | Títulos, valores, nomes, KPIs. |
| `--text-body` | #262C37 | #DDE1E8 | Texto corrido e células. |
| `--text-secondary` | #3C4350 | #C5CAD3 | Itens de menu não ativos. |
| `--text-muted` | #747C8A | #9CA3AF | Rótulos, subtítulos, legendas. |
| `--text-subtle` | #9CA3AF | #747C8A | Códigos sob nomes, placeholder, eixos, dicas. |
| `--text-disabled` | #9CA3AF | #747C8A | Texto desabilitado. |
| `--text-inverse` | #FFFFFF | #141A24 | Texto sobre `--surface-inverse`. |
| `--text-inverse-muted` | rgba(255,255,255,.7) | rgba(20,26,36,.6) | Contagem dentro da aba ativa em pílula. |
| `--fill-on-inverse` | rgba(255,255,255,.16) | rgba(20,26,36,.12) | Badge e hover dentro de áreas `inverse`. |
| `--text-link` | #1F5CA6 | #8FB2E0 | Links. |

### 2.5 Bordas e controles
| Token | Claro | Escuro | Quando usar |
|---|---|---|---|
| `--border-subtle` | #E9ECF1 | #1E2531 | Divisórias de linhas de tabela e listas. |
| `--border-default` | #DDE1E8 | #2A3240 | Borda de campos, botão secundário, chip. |
| `--border-strong` | #C5CAD3 | #3C4350 | Borda de checkbox/radio, `outline`, alça da folha inferior. |
| `--border-focus` | #2668BA | #4F86CC | Borda do campo em foco. |
| `--control-track` | #C5CAD3 | #3C4350 | Switch desligado. |
| `--control-knob` | #FFFFFF | #FFFFFF | Bolinha do switch. |

### 2.6 Semânticas (base · texto · fundo suave)
| Token | Claro | Escuro | Quando usar |
|---|---|---|---|
| `--success` | #30A46C | #30A46C | Ponto/barra "ok". |
| `--success-fg` | #1F7A4E | #4CC38A | Texto verde (delta bom, "Em dia"). |
| `--success-soft` | #E3F5EC | rgba(48,164,108,.16) | Fundo da pílula verde. |
| `--warning` | #F5A524 | #F5A524 | Ponto/barra de alerta. |
| `--warning-fg` | #A96A05 | #F5B94A | Texto âmbar ("em 2 dias", "Corretiva"). |
| `--warning-soft` | #FEF3DE | rgba(245,165,36,.16) | Fundo da pílula âmbar. |
| `--danger` | #E5484D | #E5484D | Ponto/barra vencida, botão destrutivo, ponto de notificação. |
| `--danger-fg` | #C4302F | #F2777B | Texto vermelho ("Vencida há 3 dias", erros). |
| `--danger-soft` | #FDEBEC | rgba(229,72,77,.16) | Fundo da pílula vermelha e do badge do menu. |
| `--danger-hover` | #C4302F | #C4302F | Hover do botão destrutivo. |
| `--info` | #0891B2 | #0891B2 | Informativo neutro (ex.: "Aguardando peça" alternativo). |
| `--info-fg` | #0E7490 | #3FB5D3 | Texto informativo. |
| `--info-soft` | #E0F4F8 | rgba(8,145,178,.18) | Fundo informativo. |
| `--neutral` | #9CA3AF | #747C8A | Ponto "Inativa"/"Aberta". |
| `--neutral-fg` | #575F6D | #9CA3AF | Texto neutro. |
| `--neutral-soft` | #E9ECF1 | #1E2531 | Fundo neutro. |

### 2.7 Status de manutenção (domínio)
| Token | Aponta para | Palavra fixa | Regra |
|---|---|---|---|
| `--status-ok` | `--success` | **Em dia** | abaixo do alerta antecipado |
| `--status-due` | `--warning` | **Próxima** | ≥ 70% do limite de golpes ou ≤ 7 dias |
| `--status-overdue` | `--danger` | **Vencida** | limite de golpes ou data atingidos |
| `--status-progress` | `--accent` | **Em manutenção** | existe OS aberta/em andamento |
| `--status-inactive` | `--neutral` | **Inativa** | matriz fora de uso |

Status de OS: **Aberta** (neutral) · **Em andamento** (brand/accent) · **Aguardando peça** (warning) · **Concluída** (success) · **Cancelada** (neutral).

### 2.8 Gráficos e gradientes
| Token | Claro | Escuro | Quando usar |
|---|---|---|---|
| `--chart-track` | #F9FAFB | #181F2A | Fundo de cada coluna. |
| `--chart-bar` | #DDE1E8 | #2A3240 | Barras históricas. |
| `--chart-bar-hover` | #C5CAD3 | #3C4350 | Hover da barra, borda tracejada da prevista. |
| `--chart-line` | #262C37 | #DDE1E8 | Linha do planejado. |
| `--chart-current` | = `--accent` | = `--accent` | Semana/item atual, 1ª barra do ranking. |
| `--chart-secondary` | #8FB2E0 | #2E5F8A | Demais barras do ranking. |

Gradientes (os únicos permitidos): `--gradient-brand` = aço #7A7E87 → marinho #1B3D5C (90°), só em arte de marca · `--gradient-highlight` = azul #2668BA → marinho #1B3D5C (135°), só no **um** indicador em destaque por linha e no cartão "Em andamento" do celular.

---

## 3. Tipografia

- **Geist** (variável 100–900) para toda a interface. **Geist Mono** para códigos (MTZ-0142, OS 2026-0381), sobretítulos e IDs. Arquivos em `design/assets/fontes/`.
- Algarismos tabulares sempre (`font-feature-settings:"tnum"` no `body`).
- A hierarquia vem do peso e do tom de cinza, não de saltos grandes de tamanho.
- Caixa de frase (só a primeira letra maiúscula) em tudo. MAIÚSCULAS só no sobretítulo mono.

| Nível (token) | Tamanho / peso / altura | Espaçamento | Uso |
|---|---|---|---|
| `--type-page-title` | 28px / 600 / 1.15 | -0.02em | Título da página (admin) |
| `--type-page-title-mobile` | 24px / 600 / 1.15 | -0.02em | Título da página no admin em celular |
| `--type-app-title` | 26px / 600 / 1.15 | -0.02em | Título de tela no App do Técnico |
| `--type-modal-title` | 20px / 600 / 1.25 | -0.01em | Título de modal |
| `--type-section-title` | 18px / 600 / 1.3 | — | Seção dentro de cartão/tela |
| `--type-drawer-title` | 17px / 600 / 1.3 | — | Título da gaveta |
| `--type-card-title` | 15px / 600 / 1.3 | — | Título de cartão |
| `--type-body` | 14px / 400 / 1.45 | — | Texto padrão |
| `--type-body-strong` | 14px / 500 / 1.45 | — | Nome da matriz em listas |
| `--type-button` | 14px / 500 / 1 | -0.005em | Botões (sm 13px, lg 15px) |
| `--type-small` | 13px / 400 / 1.45 | — | Subtítulos, células, rótulos de KPI |
| `--type-label` | 12px / 500 / 1.3 | — | Rótulo de campo |
| `--type-caption` | 12px / 400 / 1.45 | — | Legendas, dicas |
| `--type-code` | Mono 12px / 400 / 1.3 | — | Códigos sob nomes |
| `--type-overline` | Mono 10px / 500 / 1 | +0.06em, MAIÚSCULAS | "HOJE", "MATRIZ · MTZ-0142" |
| `--type-kpi` | 28px / 600 / 1.1 | -0.02em | Valor de KPI |
| `--type-kpi-sm` | 20px / 600 / 1.1 | -0.02em | KPI em faixa de resumo |

Escala disponível: `--fs-10` 10px · `--fs-11` 11px · `--fs-12` 12px · `--fs-13` 13px · `--fs-14` 14px · `--fs-15` 15px · `--fs-16` 16px · `--fs-17` 17px · `--fs-18` 18px · `--fs-20` 20px · `--fs-24` 24px · `--fs-26` 26px · `--fs-28` 28px · `--fs-32` 32px · `--fs-40` 40px. Pesos `--fw-regular` 400 · `--fw-medium` 500 · `--fw-semibold` 600 · `--fw-bold` 700 (quase não usado).

Números em pt-BR: `182.000 golpes`, `94,2%`, `4,82 mi`, `21/10/2026`, `14:32`, "há 3 dias", "em 2 dias".

---

## 4. Espaçamento

Base de 4px com meios-passos. O número do token × 2 = pixels.

| Token | Valor | | Token | Valor |
|---|---|---|---|---|
| `--space-1` | 2px | | `--space-9` | 18px |
| `--space-2` | 4px | | `--space-10` | 20px |
| `--space-3` | 6px | | `--space-12` | 24px |
| `--space-4` | 8px | | `--space-14` | 28px |
| `--space-5` | 10px | | `--space-16` | 32px |
| `--space-6` | 12px | | `--space-20` | 40px |
| `--space-7` | 14px | | `--space-24` | 48px |
| `--space-8` | 16px | | `--space-32` | 64px |

Uso típico: gap entre cartões 16px (`--space-8`) · padding de cartão 20px (`--space-10`), formulário 24px, celular 16px · gap entre campos 16px · padding da tabela nas pontas 20px · entre ícone e texto 8px.
Exceções permitidas como literal: bordas de 1–1,5px e ajustes ópticos ≤ 3px (trilho do segmentado, barra do stepper).

## 5. Grid e layout

| Faixa | Largura | Estrutura |
|---|---|---|
| **Desktop** | ≥ 1200px | Sidebar de 272px (`--layout-sidebar`) fixa à esquerda + coluna principal. Margem externa 16px, gap 16px. Conteúdo com respiro de 16px nas laterais. Referência 1440: 12 colunas de 70px, gutter 24px, área segura 32px. Máximo 1600px. |
| **Tablet** | 900–1199px | Sidebar vira trilho de ícones de 76px (`--layout-sidebar-collapsed`), logo vira símbolo, grupos recolhem. KPIs em 2 colunas; grades de 2 colunas viram 1; colunas "Responsável" e "Abertura" somem da tabela; cartão "Resumo" do cadastro some. |
| **Celular** | < 900px | Sem sidebar: botão de menu abre painel lateral (300px, 86% da tela). Margem 12px. Tabelas viram listas de cartões. Gaveta vira folha inferior (raio 24px no topo, alça, até 88% da altura). Botões do cabeçalho ficam `sm`; botões da gaveta ficam `lg`. Busca ocupa a largura toda. |
| **App do Técnico** | até 480px | Coluna única centralizada (`--layout-app-max`). Margens 16px. Barra de abas inferior fixa de 72px (`--layout-tabbar`) + área segura do iPhone. |

Topbar: 64px (`--layout-topbar`), também é um cartão branco arredondado (não é uma faixa de ponta a ponta). Sidebar e topbar ficam fixas; cabeçalho da tabela, rodapé da gaveta e barra de ação do celular são fixos (sticky).

## 6. Raios
| Token | Valor | Uso |
|---|---|---|
| `--radius-xs` | 6px | Tags |
| `--radius-sm` | 8px | Subitens de menu, barras de gráfico |
| `--radius-md` | 10px | Campos (`--radius-control`), itens de menu, ícone em bloco |
| `--radius-lg` | 14px | Grupo de menu aberto, caixas rebaixadas, KPIs do celular |
| `--radius-xl` | 20px | Cartões, sidebar, topbar, gaveta (`--radius-card`) |
| `--radius-2xl` | 24px | Modais (`--radius-modal`), folha inferior |
| `--radius-pill` | 999px | Botões, chips, pílulas, abas, segmentado, badges, avatares |

## 7. Elevação
Plano por padrão: **cartões não têm sombra nem borda**, se separam do fundo só pela cor.
| Token | Uso |
|---|---|
| `--shadow-sm` | Aba ativa, opção ativa do segmentado, bolinha do switch |
| `--shadow-md` | Tooltip do gráfico, modal mostrado em documentação |
| `--shadow-lg` | Gaveta, modal, menu do celular |
| `--shadow-accent` | Brilho azul sob o botão primário e o indicador em destaque |
| `--ring-focus` | Anel de foco 3px (`--accent-ring`) |
| `--ring-danger` | Anel de foco em campo com erro |

Transparência e desfoque: escurecimento do modal = `--surface-overlay` + desfoque de 6px (`--blur-overlay`); gaveta e menu sem desfoque; barra de abas do celular com `--surface-glass` + 12px (`--blur-glass`). Nada mais é translúcido.

## 8. Alturas de controle
| Token | Valor | Uso |
|---|---|---|
| `--h-control-sm` | 32px | Barras de ferramentas, ações em linha de tabela |
| `--h-control-md` | 40px | Padrão (botões, campos) |
| `--h-control-lg` | 48px | Ações principais no celular |
| `--h-nav-item` | 36px | Item de menu (subitem 32px) |
| `--h-row` | 56px | Linha de tabela (cabeçalho 40px, rodapé 48px) |
Alvo mínimo de toque no celular: 44px (botão de ícone `lg`).

## 9. Movimento
| Token | Valor | Uso |
|---|---|---|
| `--dur-fast` | 120ms | Hover, pressionar, troca de cor |
| `--dur-base` | 180ms | Switch, abas, chips |
| `--dur-slow` | 280ms | Gaveta/folha, preenchimento de medidores |
| `--ease-standard` | cubic-bezier(.2,0,0,1) | Padrão |
| `--ease-emphasized` | cubic-bezier(.3,0,0,1) | Bolinha do switch |
| `--ease-exit` | cubic-bezier(.4,0,1,1) | Saídas |
Só fades e deslizes curtos. Botão pressionado = `scale(.98)`. Sem quique, mola, paralaxe ou animação decorativa.

---

## 10. Componentes

Classes em `public/css/app.css`; funções que geram o HTML em `public/js/ui.js` (`UI.botao`, `UI.campo`, …). Veja todos os estados em `design/componentes.html`.

### Estados — regra geral
| Estado | Como fica |
|---|---|
| Normal | Conforme variante. |
| Hover | Superfície um passo mais escura (`--surface-hover*`); primário/escuro escurecem um passo (`--accent-hover`, `--surface-inverse-hover`); linha de tabela `--surface-hover-subtle`. Ícone de botão fantasma vai de `--text-muted` para `--text-body`. |
| Foco (teclado) | Anel `--ring-focus` de 3px; em campos também borda `--border-focus`. |
| Pressionado | `scale(.98)`, sem piscar cor. |
| Desabilitado | Fundo `--surface-disabled`, texto `--text-disabled`, sem sombra, cursor proibido. Nunca só deixar transparente. Controles de escolha: opacidade 50%. |
| Erro | Borda `--danger`, mensagem 12px `--danger-fg` abaixo dizendo o que corrigir; em foco, anel `--ring-danger`. |

### 10.1 Botões (`.btn`)
- Sempre pílula. Alturas: sm 32 / md 40 / lg 48. Padding lateral 12 / 16 / 20px. Texto `--type-button`. Ícone 16 (sm) ou 18px, gap 8px.
- Variantes: **primary** (`--accent`, texto branco, `--shadow-accent`; com ícone, o ícone fica numa **bolha branca** de 22/28/34px — assinatura do sistema) · **secondary** (branco com borda `--border-default`, padrão) · **dark** (`--surface-inverse`; confirmar/aplicar/concluir) · **soft** (`--accent-soft`) · **neutral** (`--surface-muted`; cancelar/voltar) · **outline** (transparente, `--border-strong`) · **destructive** (`--danger`) · **ghost** (sem fundo; barras de ferramentas e "Ver todas →").
- **Um único `primary` por tela.** Pares de confirmação: `neutral` "Cancelar" à esquerda de `dark` ou `primary` com verbo específico.
- Botão de ícone (`.icon-btn`): círculo 32/40/44/48px, variantes secondary, ghost, neutral, dark, soft; ponto vermelho de 7px para notificação; sempre com `aria-label`.

### 10.2 Ícones
- Lucide 0.460 (contorno, traço 2 na grade 24 ≈ 1,5px a 18px), em `design/assets/icones/` e embutidos em `public/js/icones.js`. Use `UI.icone('wrench', 18)`.
- Tamanhos: 16 em tabelas e campos · 18 em menu e botões · 20 na topbar e no celular · 24+ em estados vazios. Cor = `currentColor` (normalmente `--text-muted`; ativo = tinta; dentro de botão escuro = branco).
- Mapa: Painel `layout-grid` · Matrizes `layers` · Ordens `clipboard-list` · Plano `calendar-clock` · Máquinas `factory` · Relatórios `chart-column` · Equipe `users` · Configurações `settings` · Manutenção `wrench` · Corretiva `hammer` · Vencida `triangle-alert` · Concluída `circle-check` · Histórico `history` · Foto `camera` · Etiqueta `scan-line` · Tema `moon`/`sun`.
- Sem emoji. Unicode só `·` (separador) e `→` (intervalo de datas).

### 10.3 Campos de formulário
- Estrutura: rótulo (`--type-label`, `--text-muted`, asterisco vermelho se obrigatório) → controle → dica (`--text-subtle`) ou erro (`--danger-fg`). Gap 6px.
- Controle: altura 40 (sm 32, lg 48), raio 10px, borda `--border-default`, fundo `--surface-card`, texto 14px `--text-strong`, padding 12px, ícone à esquerda 16px `--text-subtle`, unidade à direita ("golpes", "mm", "dias") em 13px `--text-muted`.
- Estados: normal · foco (borda azul + anel) · **preenchido** (busca: fundo `--surface-sunken`, sem borda) · erro · desabilitado (fundo `--surface-sunken`, texto `--text-disabled`).
- Seleção: mesmo controle com seta `chevron-down` 16px à direita; vazia mostra "Selecione…" em `--text-subtle`. Para 2–4 opções curtas prefira o segmentado.
- Área de texto: mínimo 88px, padding 10×12px, redimensiona só na vertical.
- Código de matriz digitado em Geist Mono.

### 10.4 Controles de escolha
- Checkbox 18px (16 em tabela, 22 no celular), raio 5px, borda 1,5px `--border-strong`; marcado/parcial = `--accent` com ícone branco.
- Radio 18px circular; marcado = `--accent` com ponto branco de 6px. Com descrição, alinha ao topo.
- Switch 36×20 (sm 30×18), desligado `--control-track`, ligado `--accent`, bolinha branca com `--shadow-sm`. Use switch para ajuste que vale na hora; checkbox para o que é enviado com formulário.
- Segmentado: trilho `--surface-muted` com padding 3px; opção ativa = pílula branca com `--shadow-sm`; altura 30 (sm 24), texto 13/12px 500.

### 10.5 Tabelas e exibição de dados
- **Cartão** (`.card`): branco, raio 20, sem borda nem sombra, padding 20px; título 15/600 + subtítulo 12px `--text-muted`; ações à direita no cabeçalho. Variantes: outlined (só sobre fundo branco), sunken, raised (só flutuantes).
- **Indicador (KPI)** (`.stat`): rótulo 13px com ícone 16 · sobretítulo mono à direita ("HOJE") · valor 28/600 tabular · delta em pílula · linhas de comparação abaixo de uma divisória. **highlight** = gradiente azul→marinho com texto branco (no máximo um por linha). **plain** = sem cartão, valor 20/600, para faixas de resumo com 5 itens.
- **Tabela** (`.table`): cabeçalho 40px, 12px/500 `--text-muted`, ordenável com seta (azul quando ativa); linhas 56px com divisória `--border-subtle`; 20px de respiro nas pontas; coluna de checkbox de 44px; números à direita e tabulares; nome em 14/500 com código mono 12px `--text-subtle` embaixo; hover `--surface-hover-subtle`; selecionada ou aberta `--surface-selected`. Clicar na linha abre a gaveta — nunca sair da lista só para olhar. Ações da linha = botões de ícone `ghost` sm. Abaixo de 900px a tabela vira lista de cartões.
- **Medidor de uso** (`.meter`): trilho de 4px (6 na gaveta, 8 no celular), 64px na tabela ou 100%; verde < 70%, âmbar ≥ 70%, vermelho ≥ 90% do limite de golpes; rótulo 12/600 na mesma cor.
- **Avatar**: iniciais em círculo `--surface-muted`; 24 na tabela, 32 padrão, 36 na topbar e 44 no celular; `brand` (azul suave) para o usuário logado.
- **Gráfico semanal**: colunas arredondadas (8px) sobre trilho; históricas `--chart-bar`, atual `--chart-current`, prevista hachurada e tracejada; linha do planejado `--chart-line`; tooltip = cartão branco `--shadow-md`.

### 10.6 Chips e status
- **Pílula de status** (`.pill`): 24px (sm 20), fundo suave + texto `-fg` + ponto de 6px na cor base. Sempre use os presets de palavra fixa (seção 2.7). Não é botão.
- **Chip** (`.chip`) 28px: opção (branco com borda; selecionado = azul suave com ✓), **filtro aplicado** (azul suave com × para remover; mostre perto da lista para explicar por que ela está curta).
- **Tag** (`.tag`): 22px, raio 6, cinza, 11/500 — metadado (máquina, tipo, turno).
- **Badge** (`.badge`): contagem redonda de 20px; `danger` para urgência no menu.
- **Delta** (`.delta`): seta + valor em pílula de 20px; a cor segue o **significado** (subir vencidas = vermelho).

### 10.7 Navegação
- **Sidebar**: cartão branco de 272px, logo no topo (40px), itens de 36px com ícone 18 + texto 14/500 `--text-secondary`; hover `--surface-hover`; **ativo = pílula de tinta** (`--surface-inverse`) com texto branco; grupo aberto = recipiente `--surface-sunken` raio 14 com subitens de 32px recuados 26px; badge vermelho suave à direita. No rodapé, a caixa com nome do módulo e versão.
- **Topbar**: busca preenchida (320px), dados do turno e hora, ajuda, tema, notificações (ponto), usuário (avatar azul + nome + cargo).
- **Abas**: *trilho* (filtros de status com contagem: trilho `--surface-sunken`, ativa branca com sombra) e *pílula* (seções da gaveta/detalhe: ativa em tinta). Rolam na horizontal em telas estreitas, sem quebrar linha.
- **Etapas** (stepper): barra de 3px + círculo numerado de 20px; concluída = azul com ✓, atual = tinta com rótulo em negrito, próxima = cinza. Todas clicáveis. No celular vira "Etapa X de 4" + barra de progresso.
- **Paginação**: resumo à esquerda ("1–10 de 128 matrizes"), páginas de 32px com a atual em tinta, "Anterior/Próxima" em pílula `--surface-sunken` (só setas no celular).
- **Gaveta** (detalhe): painel flutuante de até 480px, 12px das bordas, raio 20, `--shadow-lg`; cabeçalho com sobretítulo mono "MATRIZ · MTZ-0142", título 17/600, anterior/próxima e fechar; rodapé fixo com `neutral` à esquerda e ação `dark` à direita. Esc e clique fora fecham.
- **Modal**: até 520–560px, raio 24, escurecimento com desfoque; título 20/600 + descrição; corpo com gap 16; rodapé à direita. Para tarefas curtas; formulário longo vai para página ou gaveta.
- **App do Técnico**: barra de abas inferior (Hoje · Matrizes · Ordens) com a ativa em pílula de tinta atrás do ícone; voltar = botão de ícone de 44px.

---

## 11. Padrões de tela — Admin (`public/admin/`)

Casca comum: sidebar + topbar + página. Cabeçalho de página = título 28/600 + linha de contexto pontilhada (`128 matrizes · 6 vencidas · atualizado 14:32`) + ações à direita (secundárias primeiro, primária por último).

1. **Painel** — linha de 4 KPIs (Manutenções vencidas · Próximos 7 dias · **Cumprimento do plano [destaque]** · Em manutenção) com linhas de comparação; gráfico "Manutenções por semana" (realizadas × planejadas, 12 semanas, atual em azul, próxima hachurada, segmentado 8/12/26 sem) + cartão "Atenção" (vencidas e próximas, com medidor; clique abre a gaveta); "Próximas manutenções por máquina" (barras horizontais) + "Ordens recentes".
2. **Relação preventiva** — faixa de resumo (5 KPIs plain) → cartão com abas de status com contagem (Todas · Vencidas · Próximas · Em manutenção · Em dia), busca, chips de máquina (viram filtro com ×), barra de seleção em massa em tinta (Reprogramar · Gerar OS), tabela ordenável (Matriz/código · Máquina · Responsável · Golpes [medidor + "182k / 200k"] · Próxima [relativa, colorida] · Status · ações) e paginação. Linha → **gaveta da matriz** (status, caixa de uso de golpes, abas Geral/Checklist/Histórico, rodapé Reprogramar · Registrar manutenção) → **modal Registrar manutenção** (data, técnico, contador, tempo, checklist obrigatório completo, observações; "Salvar e concluir" só habilita com tudo marcado; ao salvar zera golpes e volta para *Em dia*).
3. **Ordens de serviço** — faixa de resumo; abas Abertas · Em andamento · Aguardando peça · Concluídas · Todas; filtro de técnico; tabela (OS mono + tipo · Matriz · Técnico · Abertura · Prazo ["Hoje" em vermelho] · Status · ação da linha: Iniciar → Concluir; Peça recebida; Relatório).
4. **Cadastrar matriz** — formulário em 4 etapas (Identificação · Plano preventivo · Checklist · Revisão) dentro de cartão com padding 24, cartão "Resumo" fixo à direita (desktop) mostrando os campos e "Campos obrigatórios X / 6"; rodapé com Voltar (neutral) · Salvar rascunho · Próximo (dark) / Cadastrar matriz (primary, só com obrigatórios). Cabeçalho mostra "● Rascunho · não salvo".

## 12. Padrões de tela — App do Técnico (`public/tecnico/`)

- Cabeçalho: linha de contexto 13px acima do título 26/600; nas telas internas, voltar de 44px.
- Listas = pilhas de cartões brancos de raio 20 (sem tabela no celular).
- **Hoje**: saudação + data/turno, busca grande + botão escuro de escanear etiqueta, 3 mini-KPIs (Minhas OS · Vencidas em vermelho · Feitas hoje em verde), cartão em destaque "Em andamento" (gradiente, progresso do checklist, "Continuar manutenção"), "Minhas tarefas".
- **Matrizes**: busca + abas de status + cartões com medidor e prazo relativo.
- **Ordens**: abas Abertas/Concluídas + cartões de OS.
- **Detalhe da matriz**: pílulas de status/tipo/máquina, cartão de golpes (KPI 28 + medidor de 8px), dados em linhas, histórico; barra fixa inferior com Reprogramar (ícone) + "Iniciar manutenção" (primary lg, largura total).
- **Executar manutenção**: progresso do checklist, itens de 56px tocáveis (riscados quando feitos), desgaste medido, contador, fotos (72px, "Adicionar" tracejado), observações; "Concluir manutenção" (dark lg) só com tudo marcado, senão "Faltam N itens".
- **Concluído**: ícone de sucesso de 80px, "Manutenção registrada", explicação curta, "Voltar para Hoje".

## 13. Textos (voz)
- Português do Brasil, tom calmo, preciso e operacional (prancheta do supervisor, não marketing).
- Impessoal por padrão; "você" com moderação. Botões = verbo no infinitivo + objeto ("Registrar manutenção", "Nova OS", "Exportar").
- Vazio diz o que é verdade + próximo passo: "Nenhuma manutenção vencida. Próxima prevista para 24/10."
- Erro diz o que corrigir: "Informe o limite de golpes".
- Sem emoji, sem exclamação, sem piadas.

---

## 14. Sempre / Nunca

**Sempre**
- Usar `var(--token)` para cor, fonte, tamanho, espaço, raio, sombra e duração; criar o token nos dois temas se faltar.
- Montar telas com as classes de `app.css` / funções de `ui.js`; seguir `componentes.html` para algo novo.
- Testar claro **e** escuro, e as três larguras (≥1200, 900–1199, <900).
- Um único botão primário por tela; pílula de tinta para o item ativo.
- Status com as palavras fixas; números no formato pt-BR com algarismos tabulares.
- Clicar em linha abre gaveta; tabela vira cartões no celular.

**Nunca**
- Usar cor, fonte ou espaçamento fora dos tokens (nada de `#hex`, `rgb()`, `white`, `Arial`, `13px` solto no código das telas).
- Usar a paleta base (`--gray-500`, `--blue-600`…) direto nas telas — só os aliases.
- Pôr sombra ou borda em cartão comum; usar gradiente diferente dos dois oficiais; usar roxo.
- Cartão com borda colorida só na esquerda, emoji, ícones desenhados à mão ou de outra família.
- Redesenhar ou recolorir o logo.
- Depender só da cor para indicar estado.

---

## 15. Componentes do app real (fase 1)

Criados junto com o servidor, seguindo as regras acima (só tokens; exemplos em `design/componentes.html`, seção "App real").

- **Aviso** (`.notice`, `UI.aviso({ tom, texto })`): faixa com raio 14, fundo `-soft` e texto `-fg` do tom (`info`, `success`, `warning`, `danger`), ícone 16 à esquerda. Usar perto do que explica (topo do cartão, topo do formulário). Erro diz o que corrigir.
- **Aviso passageiro** (`.notice--toast`, `UI.toast(texto, tom)`): confirmação curta no rodapé, em tinta (`--surface-inverse`); some em ~3 s. No App do Técnico fica acima da barra de abas. Erro vira vermelho.
- **Entrada** (`.auth`): cartão de 440px, raio 24, com o banner da marca no topo (único lugar do sistema com o banner), sobretítulo mono, título 28/600, campos `lg` e um único botão primário de largura total. Abaixo, link `ghost` para "Criar conta".
- **Matrizes do dia** (`.dayplan` + `.dayplan__item`): cartão no topo do Painel com 3 blocos rebaixados (`--surface-sunken`, raio 14) lado a lado (1 coluna abaixo de 900px). Cada bloco: posição (`num-tile`), nome + código, demanda somada, referência de maior demanda, golpes com medidor e, no rodapé, a pílula do motivo — **Vencida** (danger) · **Maior demanda** (brand) · **Pendente desde dd/mm** (warning) — e a OS ou **Feita** (success). Feita = nome riscado em `--text-muted`. Clique abre a gaveta. No App do Técnico, os mesmos itens viram `mtile` com `num-tile` no topo da tela Hoje.
- **Quem vai usar** (`.person-grid` + `.person-tile`): grade de 2 colunas de cartões brancos com avatar 44, nome e cargo; técnico sem PIN aparece desabilitado com "Sem PIN".
- **Teclado de PIN** (`.pin`, `.pin-dots`, `.keypad`, `UI.tecladoPin({ n })`): 6 pontos (vazado `--border-strong`, cheio em tinta) e teclado 3×4 de teclas brancas de 64px (`--h-control-lg` + `--space-8`), raio 14, número 24/600; apagar com o ícone Lucide `delete`. Envia sozinho ao completar 6 dígitos.
- Ícones acrescentados (Lucide 0.460): `delete`, `key-round` (senha/PIN), `tablet-smartphone` (tablets), `mail` (e-mail).
