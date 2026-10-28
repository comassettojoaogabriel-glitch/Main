# LEIA-ME — Manutenção Preventiva das Matrizes (SCREW · Matrizaria)

App web com dois lados:
- **Admin** (computador): Painel com as matrizes do dia, Relação preventiva, OS - Matrizes, OS - Serviços, Equipe e Configurações. Para níveis 1 (Dev/Admin) e 2 (Gestor).
- **App do Técnico** (tablet da Matrizaria): cada técnico entra com o próprio PIN.

Fase 1 pronta. A importação do CIGAM, a carga da planilha real e o e-mail diário entram na fase 2 (detalhes no `CLAUDE.md`).

---

## 1. Testar no seu computador

1. Instale o **Node.js LTS** (nodejs.org) se ainda não tiver.
   *Resultado:* no terminal, `node -v` mostra a versão.
2. Descompacte `manutencao-matrizes.zip` numa pasta (ex.: `Documentos\manutencao-matrizes`) e abra a pasta no **VS Code** (Arquivo → Abrir Pasta…).
   *Resultado:* aparecem `server.js`, `public/`, `design/`, `CLAUDE.md`.
3. Abra `pessoas-iniciais.json` e troque as matrículas `1001` (João) e `1002` (Mariana) pelas reais. Salve.
   *Resultado:* só essas matrículas conseguem criar conta no Admin.
4. No terminal do VS Code (Terminal → Novo Terminal): `npm install` e depois `node server.js`.
   No Windows também dá para dar dois cliques em `iniciar.bat`.
   *Resultado:* o terminal mostra os endereços e "E-mail: MODO TESTE". A pasta `data/` é criada com dados de exemplo.
5. Abra `http://localhost:3001/admin/` → **Criar conta** com a sua matrícula, um e-mail e uma senha (mínimo 8).
   *Resultado:* como o Gmail ainda não está configurado, o código de 6 dígitos aparece no terminal. Digite e entre.
6. Para ver o tablet no computador: abra `http://localhost:3001/tecnico/` numa janela anônima, F12 → modo celular.
   Libere o aparelho com a sua matrícula e senha, escolha **Fernanda Costa** e digite o PIN **123456** (técnicos de exemplo).
   *Resultado:* tela Hoje com as matrizes do dia no topo.
7. Para começar do zero: pare o servidor (Ctrl+C), apague a pasta `data/` e rode de novo.

## 2. Configurar o Gmail
1. Use a mesma conta do Gerenciador de Tarefas. Crie uma **senha de app** em `myaccount.google.com/apppasswords`.
2. Copie `config.exemplo.json` para `config.json` (o `iniciar.bat` já faz isso) e preencha `gmail.usuario` e `gmail.senhaDeApp`.
3. Ajuste `urlBase` com o nome ou IP do servidor (vai nos links do e-mail da fase 2).
4. Reinicie o servidor.
   *Resultado:* o terminal mostra "E-mail: Gmail configurado" e os códigos chegam por e-mail.

## 3. Instalar no servidor da empresa
1. Peça à TI: máquina sempre ligada (a mesma do Gerenciador), nome ou IP fixo, **porta 3001** liberada na rede, saída para `smtp.gmail.com` (465/587).
2. Copie a pasta para o servidor **sem** `node_modules/` e **sem** `data/`. Coloque o `config.json` com o Gmail e `"dadosDeExemplo": false` para começar vazio.
3. Rode `iniciar.bat` uma vez.
   *Resultado:* instala as dependências e sobe em `http://SERVIDOR:3001/admin/`.
4. No **Agendador de Tarefas**: nova tarefa "Na inicialização", ação `node.exe` com argumento `server.js` e "Iniciar em" a pasta do app.
   *Resultado:* o app volta sozinho quando a máquina reinicia.
5. No Admin → **Equipe**: cadastre os técnicos e defina o PIN de cada um. Em **Configurações**: máquinas, tipos, materiais e destinatários do e-mail.
6. No tablet da Matrizaria: abra `http://SERVIDOR:3001/tecnico/`, libere com a matrícula e a senha de um gestor e adicione à tela inicial.

## 4. Atualizar depois
- Mudou só tela (`public/` ou `design/`): copie os arquivos para o servidor e recarregue a página.
- Mudou `server.js` ou `lib/`: copie e reinicie a tarefa no Agendador.
- **Nunca** copie `data/` nem `config.json` do seu PC por cima dos do servidor (apaga os dados reais). Backups diários ficam em `data/backups/` (30 dias).

## 5. Onde mexer
| Quero mudar… | Arquivo |
|---|---|
| Uma cor, fonte, espaço, raio ou sombra | `design/tokens.css` (nos dois temas) + `DESIGN.md` |
| A aparência de um componente | `public/css/app.css` + `design/componentes.html` |
| Uma tela do Admin | `public/admin/app.js` |
| Uma tela do tablet | `public/tecnico/app.js` |
| A tela de entrada | `public/entrar/app.js` |
| A regra das matrizes do dia ou os status | `lib/calculos.js` |
| Rotas e permissões | `server.js` |
