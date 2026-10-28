# CLAUDE.md — instruções para o Claude no VS Code

## O projeto
Sistema web da **SCREW · setor de Matrizaria** que substitui a planilha **"Relação de manutenção preventiva – Matrizes"**. Responsável pelo uso: Mariana Lange (Matrizaria). Criado por João Comassetto (Eng. de Manufatura).

**Regra principal do negócio:** indicar **3 matrizes por dia** para manutenção preventiva, **priorizadas pela demanda mensal**. Cadeia de dados: **Matriz → Referência → Demanda mensal** (a demanda vem de uma extração diária do CIGAM).

Mesmo modelo do app "Gerenciador de Tarefas": **Express + banco em arquivo JSON + Gmail com senha de app**, rodando no servidor da empresa pelo Agendador de Tarefas.

## Situação atual (27/10/2026)
- **Fase 1 — pronta:** servidor, banco, login com níveis, tablet com PIN, todas as telas lendo a API, OS separadas em Matrizes e Serviços, regra das matrizes do dia e cartões no Painel e na tela Hoje.
- **Fase 2 — falta:** importação da demanda do CIGAM, carga inicial da planilha real, e-mail diário automático (ver "Fase 2" no fim).
- O banco nasce com **dados de exemplo** (matrizes dos protótipos) se `config.json → dadosDeExemplo` for `true`. Técnicos de exemplo entram com PIN `123456`.

## Decisões do João (respostas de 27/10/2026)
| # | Assunto | Decisão |
|---|---|---|
| 1 | Onde roda | Mesma máquina do Gerenciador, app separado na **porta 3001** |
| 2 | Níveis | **1 Dev/Admin · 2 Gestor (Admin completo) · 3 Técnico** (só App do Técnico) |
| 3 | Entrada do técnico | **Tablet fixo da Matrizaria** liberado por um gestor; técnico escolhe o nome e digita **PIN de 6 dígitos** |
| 4–6 | Dados (carga, CIGAM, golpes) | **Adiado.** João traz a planilha e uma extração do CIGAM; o Claude do chat gera o contexto com os dados |
| 7 | Matriz com várias referências | **Somar** as demandas |
| 8 | Quem fica de fora | Matrizes que **já passaram por manutenção e ainda não produziram uma grande quantidade de peças** depois dela (parâmetro em Configurações) |
| 9 | Vencimento | **Vencidas primeiro**, depois por demanda |
| 10 | Empate | **Última manutenção mais antiga** primeiro |
| 11 | Indicada e não feita | **Volta no dia seguinte e ocupa uma das 3 vagas** |
| 12 | CIGAM não chegou | **Usa a última demanda e avisa** no Painel/e-mail |
| 13 | OS | **Separar:** **OS - Matrizes** (manutenção das matrizes) e **OS - Serviços** (usinagem, retífica, fresa… pedidos à Matrizaria) |
| 14 | E-mail | **Segunda a sexta, 06:30** |
| 15 | Remetente | **Mesma conta Gmail do Gerenciador**; destinatários editáveis em Configurações |
| 16 | Onde aparecem as 3 | **Topo do Painel** (Admin) e **topo da tela Hoje** (técnico) |
| 17 | Entrega | **Em duas fases** |

### Decisões que o Claude tomou na fase 1 (confirmar com o João)
- Nível 2 gerencia só técnicos (nível 3). Criar/alterar/excluir pessoas de nível 1 ou 2 é só do nível 1.
- Inativas e matrizes com OS - Matrizes aberta ficam fora da indicação (a não ser que sejam pendentes do dia anterior).
- A exclusão "produziu pouco" vale também para matriz vencida por calendário.
- "Peças desde a última manutenção" usa o campo **golpes** da matriz (1 golpe = 1 peça) até a fonte real ser definida.
- Padrão: **10.000 peças** mínimas depois da manutenção (editável).
- A indicação do dia é gerada **na primeira consulta de um dia útil** e fica gravada. "Recalcular" no Painel refaz a de hoje.
- "Gerar OS" no cartão abre OS - Matrizes preventivas para as indicadas, com o responsável da matriz como técnico.
- Técnico só mexe em OS dele ou sem técnico (ao iniciar, a OS fica com ele). Concluir OS - Matrizes = registrar a manutenção (checklist completo obrigatório).
- Tablet: sessão do técnico fecha após `minutosTablet` (10) sem uso; o aparelho fica liberado por 400 dias ou até ser revogado em Equipe.

## Estrutura
```
CLAUDE.md                 este arquivo
DESIGN.md                 sistema de design (ler antes de qualquer mudança visual) — seção 15: componentes novos
LEIA-ME.md                instalação passo a passo
server.js                 Express: login, sessões, permissões, API
lib/db.js                 banco em data/db.json (gravação atômica + backup diário em data/backups/, guarda 30)
lib/auth.js               scrypt (senha, PIN, código), tokens, cookies, bloqueio por tentativas
lib/calculos.js           status da matriz, regra das matrizes do dia, Painel, formatação para as telas
lib/datas.js              datas locais 'YYYY-MM-DD', pt-BR, prazos relativos, semana ISO
lib/email.js              Gmail (nodemailer) ou MODO TESTE; cores lidas de design/tokens.json
lib/semente.js            1ª execução: pessoas-iniciais.json + dados de exemplo
pessoas-iniciais.json     semente das pessoas (troque as matrículas antes da 1ª execução)
config.exemplo.json       copie para config.json (porta, Gmail, minutos do tablet, dados de exemplo)
iniciar.bat / iniciar.sh  instala na 1ª vez e roda node server.js
design/                   tokens.css (ÚNICA fonte de valores), tokens.json, componentes.html, assets/
prototipos/               protótipos offline originais (não editar)
public/css/app.css        todas as classes (importa ../../design/tokens.css)
public/js/ui.js           funções de componentes (UI.botao, UI.campo, UI.aviso, UI.toast, UI.tecladoPin…)
public/js/api.js          fetch para a API (API.get/post/put/patch/del), reduzir foto, baixar CSV
public/js/icones.js       ícones Lucide embutidos
public/entrar/            tela de entrada do Admin (entrar, criar conta, código)
public/admin/             Painel, Relação, Cadastrar/editar matriz, OS - Matrizes, OS - Serviços, Equipe, Configurações
public/tecnico/           tablet: liberar aparelho, quem vai usar, PIN, Hoje, Matrizes, Ordens, Detalhe, Executar, Concluído, OS de serviço
data/                     criado ao rodar: db.json, backups/, fotos/ (NÃO versionar, NÃO copiar do PC para o servidor)
```
O servidor serve `public/` em `/` e `design/` em `/design` (por isso o `@import "../../design/tokens.css"` e os logos funcionam). `/` redireciona para `/admin/`.

## Acesso e sessões
- **Níveis 1 e 2 (Admin, computador):** `/entrar/` → matrícula + senha. Primeiro acesso: "Criar conta" (matrícula + e-mail + senha ≥ 8) → código de 6 dígitos por e-mail (15 min, 5 erros, reenviar após 60 s). Sem Gmail = MODO TESTE (código no terminal). Nome e nível vêm da tabela `pessoas`, nunca do que a pessoa digita.
- **Nível 3 (tablet):** `/tecnico/` → se o aparelho não está liberado, um gestor libera com matrícula e senha (cookie `mm_aparelho`). Depois: "Quem vai usar?" → PIN (6 dígitos, 5 erros = 15 min de bloqueio). Gestor logado também abre `/tecnico/` para ver o app.
- Cookies `HttpOnly; SameSite=Lax`: `mm_sessao` (Admin: `diasSessao`; tablet: `minutosTablet` sem uso) e `mm_aparelho`. No banco só o SHA-256 dos tokens.
- **O servidor aplica as permissões** (`exige(nivel)` em cada rota), não só a tela. Sempre sobra 1 pessoa liberada de nível 1.
- Senha esquecida: Equipe → "Apagar conta" e a pessoa cria de novo.

## Banco (`data/db.json`)
`pessoas{id,nome,matricula,nivel,cargo,liberado}` · `contas{pessoaId,email,senha}` · `pins{pessoaId,pin,erros,bloqueadoAte}` · `pendentes` (cadastro aguardando código) · `sessoes` · `aparelhos{id,nome,tokenHash,liberadoPor,ativo}`
`matrizes{codigo,descricao,tipo,maquina,estacao,material,situacao:'ativa'|'inativa',criterio:'golpes'|'dias'|'ambos',limiteGolpes,intervaloDias,alertaPct,responsavel,notificar,checklist[],golpes,ultima,proximaManual,referencias[]}`
`referencias{codigo,descricao}` · `demanda{[referencia]:{mensal,atualizadaEm}}` · `importacoes[]`
`osMatrizes{id:'OSM 2026-0001',tipo:'Preventiva'|'Corretiva',matriz,tecnico,abertura,prazo,status,origem:'plano'|'manual'|'tablet'|'registro',checks[],descricao,concluidaEm,manutencaoId}`
`osServicos{id:'OSS 2026-0001',servico,descricao,solicitante,setor,quantidade,tecnico,abertura,prazo,status,observacoes,concluidaEm}`
`manutencoes{id,matriz,data,tipo,tecnico,golpesContador,tempoMin,desgasteMm,checklist[],obs,fotos[],os}` · `planos{'YYYY-MM-DD':{data,geradoEm,demandaDe,itens[{matriz,motivo:'pendente'|'vencida'|'demanda',demanda,refMaior,refMaiorDemanda,desde}]}}`
`config{matrizesPorDia,minPecasAposManutencao,alertaPadrao,email{ativo,hora,dias,destinatarios},maquinas,tiposMatriz,materiais,tiposServico,setores}` · `contadores` · `instantaneos` (vencidas/próximas por dia, para "Ontem")
Situações de OS: `aberta · andamento · peca · concluida · cancelada`. Registrar manutenção conclui a OS aberta da matriz (ou cria uma já concluída), zera os golpes e grava a data como última.

## Status da matriz (`lib/calculos.js → statusMatriz`)
Inativa → `inactive` · OS aberta → `progress` · golpes ≥ limite ou data ≤ hoje → `overdue` · sem última manutenção (critério por dias) → `due` · golpes ≥ alerta% ou ≤ 7 dias → `due` · senão `ok`. Próxima = `proximaManual` (Reprogramar) ou última + intervalo. Palavras fixas: Em dia · Próxima · Vencida · Em manutenção · Inativa.

## Regra das matrizes do dia (`gerarPlano`)
1. Pendentes do plano anterior (sem manutenção registrada desde a indicação) ocupam as primeiras vagas.
2. Fora: inativas, com OS aberta, e as que têm última manutenção e `golpes < minPecasAposManutencao`.
3. Vencidas primeiro; depois as demais por **demanda mensal somada** das referências.
4. Empate: última manutenção mais antiga (sem registro = mais antiga); depois código.
5. `demandaDe` = data mais recente da demanda; se for anterior ao dia do plano, aviso "A extração do CIGAM de … não chegou".
Só em dias úteis (`config.email.dias`, padrão seg–sex). Fim de semana mostra a última indicação.

## API (todas em JSON; 401 = entrar de novo; 403 = nível sem permissão)
Conta: `GET /api/eu` · `POST /api/entrar` · `POST /api/cadastro` · `POST /api/cadastro/confirmar` · `POST /api/cadastro/reenviar` · `POST /api/sair`
Tablet: `GET /api/tablet` · `POST /api/tablet/liberar` (gestor) · `POST /api/tablet/entrar` (PIN)
Leitura (qualquer nível): `GET /api/listas` · `/api/matrizes` · `/api/matrizes/:codigo` · `/api/plano-do-dia` · `/api/os-matrizes` · `/api/os-servicos` · `GET /fotos/:nome`
Gestor (≤ 2): `GET /api/painel` · `POST /api/plano-do-dia/recalcular` · `POST /api/plano-do-dia/gerar-os` · `POST/PUT /api/matrizes[/:codigo]` · `POST /api/matrizes/:codigo/reprogramar` · `POST /api/os-matrizes` · `POST /api/os-servicos` · `GET/POST/PUT/DELETE /api/pessoas[/:id]` · `POST /api/pessoas/:id/pin` · `DELETE /api/pessoas/:id/conta` · `GET/DELETE /api/aparelhos[/:id]` · `GET/PUT /api/config`
Técnico e gestor: `POST /api/manutencoes` · `POST /api/os-matrizes/iniciar` · `PATCH /api/os-matrizes/:id` · `PATCH /api/os-servicos/:id` · `POST /api/fotos` (foto reduzida no aparelho, até 4 MB)

## Regra de design (obrigatória)
1. **Antes de qualquer mudança visual, ler `DESIGN.md`.**
2. Usar **só** os tokens de `design/tokens.css` (aliases semânticos). Nada de `#hex`, `rgb()`, nomes de cor, `font-family` ou `px` de fonte soltos em `public/`.
3. Componente novo: classe em `public/css/app.css`, função em `public/js/ui.js`, exemplo em `design/componentes.html`, descrição no `DESIGN.md`.
4. Valor novo: criar o token em `design/tokens.css` nos **dois** temas, regenerar `tokens.json` e documentar no `DESIGN.md`.
5. Conferir claro/escuro e as larguras desktop (≥ 1200), tablet (900–1199) e celular (< 900).
6. Verificação antes de entregar (não deve encontrar nada):
   `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|font-family:\s*[^v]" public --include=*.css --include=*.js --include=*.html | grep -v icones.js`
7. E-mail não aceita `var(--token)`: use `email.cor('nome-do-token')` de `lib/email.js`, que lê `design/tokens.json`.

## Como trabalhar comigo
- Responder sempre em **português**.
- Quando houver dúvida de caminho, mostrar **opções em múltipla escolha** e esperar a resposta.
- Explicar em **passo a passo numerado**, uma etapa por vez, com o resultado esperado de cada uma.
- Fazer tudo pelo **VS Code** quando der (terminal integrado, extensões, editar arquivos).
- **Editar os arquivos existentes**; não recriar do zero.
- Antes de concluir, **revisar** e mandar um **relatório curto**: o que mudou, o que foi conferido e o que ficou pendente.
- Sem emoji no app.

## Como testar antes de entregar
1. `npm run check` (sintaxe do servidor e de `lib/`) e `node --check` nos `app.js` alterados.
2. Copiar o app para uma pasta temporária **sem `data/`** e rodar `PORT=3999 node server.js` (no Windows: `set PORT=3999 && node server.js`).
3. Testar: senha errada recusada; criar conta com código do terminal; Painel com 3 matrizes do dia; registrar manutenção marca "Feita"; nível 2 recebe 403 ao criar nível 1; tablet: liberar com gestor, PIN errado recusado, PIN 123456 entra, técnico recebe 403 em `/api/pessoas`; sem rolagem lateral em 390 px.
4. Ver as telas em 1440, 1024 e 390 px nos dois temas e rodar o grep de cores.
5. Parar o servidor de teste e apagar a pasta temporária.

## Fase 2 (próximos passos)
1. **Carga inicial** da planilha "Relação de manutenção preventiva – Matrizes": script `scripts/importar-planilha.js` que lê o `.xlsx` e preenche `matrizes`, `referencias` e a ligação matriz → referências (colunas a definir com o arquivo real). Desligar `dadosDeExemplo` e começar com `data/` limpo.
2. **Importação diária do CIGAM**: rota `POST /api/demanda/importar` (gestor) + botão "Importar demanda" em Configurações → card "Demanda do CIGAM". Formato (CSV/XLSX/pasta de rede) e horário a definir com o arquivo real. Validar, gravar `demanda[ref] = { mensal, atualizadaEm }`, registrar em `importacoes`. Se chegar depois da indicação, oferecer "Recalcular".
3. **Fonte dos golpes / peças produzidas** (para a regra 8): digitado, contador ou produção do CIGAM — decidir com os dados.
4. **E-mail diário** (seg–sex 06:30, `config.email`): agendador interno no `server.js` (checa a cada minuto), gera a indicação do dia e envia `email.enviarPlanoDoDia` (a criar em `lib/email.js`, usando `moldura()` e `cor()`), com código, nome, máquina, referência de maior demanda, demanda mensal, golpes/limite e link `urlBase/admin/`. Gravar `planos[dia].emailEnviadoEm` para não enviar duas vezes.
5. Pendências menores: leitura de etiqueta (QR) no tablet; "Esqueci minha senha"; quem abre OS - Serviços (só gestor hoje — formulário para outros setores?); HTTPS se houver acesso fora da rede.
