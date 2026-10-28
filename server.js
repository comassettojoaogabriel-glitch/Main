/* SCREW · Matrizaria — Manutenção preventiva das matrizes
   Servidor Express. Mesmo modelo do Gerenciador de Tarefas: banco em arquivo JSON, senhas com scrypt, Gmail com senha de app.
   Níveis: 1 Dev/Admin · 2 Gestor (Admin completo) · 3 Técnico (App do Técnico no tablet, entra com PIN).
   O servidor aplica as permissões; a tela só esconde o que a pessoa não pode usar. */
const fs = require('fs');
const path = require('path');
const express = require('express');
const banco = require('./lib/db');
const auth = require('./lib/auth');
const calc = require('./lib/calculos');
const datas = require('./lib/datas');
const email = require('./lib/email');
const semear = require('./lib/semente');

/* ---------- Configuração ---------- */
function lerConfig() {
  const base = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.exemplo.json'), 'utf8'));
  const arq = path.join(__dirname, 'config.json');
  const local = fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, 'utf8')) : {};
  return { ...base, ...local, gmail: { ...base.gmail, ...(local.gmail || {}) } };
}
const config = lerConfig();
const PORTA = Number(process.env.PORT) || config.porta || 3001;
banco.carregar(semear(config.dadosDeExemplo !== false));
const DB = () => banco.db;
email.iniciar(config);

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '8mb' }));
app.use((req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'same-origin'); next(); });

const erro = (res, cod, msg, extra = {}) => res.status(cod).json({ erro: msg, ...extra });
const texto = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const inteiro = (v, min = 0) => { if (v === undefined || v === null || String(v).trim() === '') return null; const n = Math.round(Number(String(v).replace(/\./g, '').replace(',', '.'))); return Number.isFinite(n) && n >= min ? n : null; };
const NIVEL = { 1: 'Dev / Admin', 2: 'Gestor', 3: 'Técnico' };

/* ---------- Sessões ---------- */
const SESSAO = 'mm_sessao';
const APARELHO = 'mm_aparelho';
function removerSessao(s) { const db = DB(); db.sessoes = db.sessoes.filter((x) => x !== s); banco.salvarDepois(2000); }
function aparelhoDe(req) {
  const t = auth.lerCookies(req)[APARELHO];
  if (!t) return null;
  const h = auth.sha(t);
  return DB().aparelhos.find((a) => a.tokenHash === h && a.ativo) || null;
}
function sessaoDe(req) {
  const t = auth.lerCookies(req)[SESSAO];
  if (!t) return null;
  const h = auth.sha(t);
  const s = DB().sessoes.find((x) => x.token === h);
  if (!s) return null;
  const agora = Date.now();
  if (s.tipo === 'tablet') {
    const ap = DB().aparelhos.find((a) => a.id === s.aparelhoId && a.ativo);
    if (!ap || agora - s.ultimoUso > (Number(config.minutosTablet) || 10) * 60000) { removerSessao(s); return null; }
  } else if (agora > s.expira) { removerSessao(s); return null; }
  const p = DB().pessoas.find((x) => x.id === s.pessoaId);
  if (!p || !p.liberado) { removerSessao(s); return null; }
  s.ultimoUso = agora;
  banco.salvarDepois();
  return { s, p };
}
function novaSessao(res, pessoa, tipo, aparelhoId) {
  const t = auth.token();
  const agora = Date.now();
  const dias = Number(config.diasSessao) || 7;
  DB().sessoes.push({ token: auth.sha(t), pessoaId: pessoa.id, tipo, aparelhoId: aparelhoId || null, criadaEm: agora, ultimoUso: agora, expira: agora + dias * 86400000 });
  banco.salvar();
  auth.cookie(res, SESSAO, t, tipo === 'tablet' ? 12 * 3600 : dias * 86400);
}
const exige = (nivelMax) => (req, res, next) => {
  const x = sessaoDe(req);
  if (!x) return erro(res, 401, 'Sua sessão terminou. Entre novamente.');
  if (x.p.nivel > nivelMax) return erro(res, 403, 'Seu nível de acesso não permite esta ação.');
  req.eu = x.p; req.sessao = x.s; next();
};
const logado = exige(3), gestor = exige(2);
const eTecnico = (req) => req.eu.nivel === 3;
function limparExpirados() {
  const db = DB(), agora = Date.now(), min = (Number(config.minutosTablet) || 10) * 60000;
  const antes = db.sessoes.length + db.pendentes.length;
  db.sessoes = db.sessoes.filter((s) => (s.tipo === 'tablet' ? agora - s.ultimoUso <= min : agora <= s.expira));
  db.pendentes = db.pendentes.filter((p) => agora <= p.expira);
  if (db.sessoes.length + db.pendentes.length !== antes) banco.salvar();
}
limparExpirados();
setInterval(limparExpirados, 3600000).unref();

/* ---------- Conta (níveis 1 e 2): matrícula + e-mail + senha, código de 6 dígitos ---------- */
const porMatricula = (m) => DB().pessoas.find((p) => p.matricula === texto(m, 40));
const contaDe = (p) => DB().contas.find((c) => c.pessoaId === p.id);
const mascara = (e) => e.replace(/^(.).*(@.*)$/, (_, a, b) => `${a}•••${b}`);
const euParaTela = (p, s) => ({ id: p.id, nome: p.nome, nivel: p.nivel, nivelTexto: NIVEL[p.nivel], cargo: p.cargo || NIVEL[p.nivel], tipo: s.tipo, exemplo: !!DB().exemplo, minutosTablet: Number(config.minutosTablet) || 10 });

app.get('/api/eu', (req, res) => {
  const x = sessaoDe(req);
  if (!x) return erro(res, 401, 'Entre para continuar.', { aparelho: !!aparelhoDe(req) });
  res.json(euParaTela(x.p, x.s));
});

function conferirGestor(matricula, senha) {
  const chave = `login:${texto(matricula, 40)}`;
  if (auth.bloqueado(chave)) return { cod: 429, msg: 'Muitas tentativas erradas. Tente de novo em 15 minutos.' };
  const p = porMatricula(matricula);
  const c = p && contaDe(p);
  if (!p || !c || !auth.confere(senha, c.senha)) { auth.errou(chave); return { cod: 401, msg: 'Matrícula ou senha incorreta.' }; }
  auth.acertou(chave);
  if (!p.liberado) return { cod: 403, msg: 'Acesso não liberado. Fale com o administrador.' };
  if (p.nivel > 2) return { cod: 403, msg: 'Técnicos entram pelo tablet da Matrizaria, com o PIN.' };
  return { p };
}
app.post('/api/entrar', (req, res) => {
  const r = conferirGestor(req.body.matricula, req.body.senha);
  if (!r.p) return erro(res, r.cod, r.msg);
  novaSessao(res, r.p, 'admin');
  res.json(euParaTela(r.p, { tipo: 'admin' }));
});

async function mandarCodigo(p, pend) {
  const codigo = auth.codigo6();
  pend.codigo = auth.hash(codigo); pend.enviadoEm = Date.now(); pend.expira = Date.now() + 15 * 60000; pend.erros = 0;
  banco.salvar();
  const r = await email.enviarCodigo(pend.email, p.nome.split(' ')[0], codigo);
  if (r.modoTeste) console.log(`[MODO TESTE] Código de ${p.nome} (${p.matricula}): ${codigo}`);
  return r.modoTeste;
}
app.post('/api/cadastro', async (req, res, next) => {
  try {
    const { matricula, email: em, senha, confirmar } = req.body;
    const p = porMatricula(matricula);
    if (!p) return erro(res, 404, 'Matrícula não cadastrada. Peça ao administrador para incluir você na Equipe.');
    if (!p.liberado) return erro(res, 403, 'Acesso não liberado. Fale com o administrador.');
    if (p.nivel > 2) return erro(res, 403, 'Técnicos não criam conta: entram pelo tablet da Matrizaria, com o PIN.');
    if (contaDe(p)) return erro(res, 409, 'Esta matrícula já tem conta. Use Entrar.');
    const e = texto(em, 120).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return erro(res, 400, 'Informe um e-mail válido.', { campo: 'email' });
    if (String(senha || '').length < 8) return erro(res, 400, 'A senha precisa ter pelo menos 8 caracteres.', { campo: 'senha' });
    if (senha !== confirmar) return erro(res, 400, 'As senhas não conferem.', { campo: 'confirmar' });
    const db = DB();
    db.pendentes = db.pendentes.filter((x) => x.pessoaId !== p.id);
    const pend = { id: auth.id(), pessoaId: p.id, email: e, senha: auth.hash(senha) };
    db.pendentes.push(pend);
    const teste = await mandarCodigo(p, pend);
    res.json({ ok: true, para: mascara(e), modoTeste: teste });
  } catch (e) { next(e); }
});
app.post('/api/cadastro/confirmar', (req, res) => {
  const p = porMatricula(req.body.matricula);
  const db = DB();
  const pend = p && db.pendentes.find((x) => x.pessoaId === p.id);
  if (!pend) return erro(res, 404, 'Nenhum cadastro aguardando código. Comece de novo.');
  if (Date.now() > pend.expira) { db.pendentes = db.pendentes.filter((x) => x !== pend); banco.salvar(); return erro(res, 410, 'O código venceu. Peça um novo.'); }
  if (!auth.confere(texto(req.body.codigo, 6), pend.codigo)) {
    pend.erros += 1;
    if (pend.erros >= 5) { db.pendentes = db.pendentes.filter((x) => x !== pend); banco.salvar(); return erro(res, 429, 'Código bloqueado depois de 5 erros. Comece o cadastro de novo.'); }
    banco.salvar();
    return erro(res, 401, `Código incorreto. Restam ${5 - pend.erros} tentativas.`);
  }
  db.pendentes = db.pendentes.filter((x) => x !== pend);
  db.contas = db.contas.filter((c) => c.pessoaId !== p.id);
  db.contas.push({ pessoaId: p.id, email: pend.email, senha: pend.senha, criadaEm: new Date().toISOString() });
  novaSessao(res, p, 'admin');
  res.json(euParaTela(p, { tipo: 'admin' }));
});
app.post('/api/cadastro/reenviar', async (req, res, next) => {
  try {
    const p = porMatricula(req.body.matricula);
    const pend = p && DB().pendentes.find((x) => x.pessoaId === p.id);
    if (!pend) return erro(res, 404, 'Nenhum cadastro aguardando código. Comece de novo.');
    if (Date.now() - pend.enviadoEm < 60000) return erro(res, 429, 'Aguarde 1 minuto para pedir outro código.');
    const teste = await mandarCodigo(p, pend);
    res.json({ ok: true, para: mascara(pend.email), modoTeste: teste });
  } catch (e) { next(e); }
});
app.post('/api/sair', (req, res) => {
  const x = sessaoDe(req);
  if (x) removerSessao(x.s);
  auth.apagarCookie(res, SESSAO);
  res.json({ ok: true });
});

/* ---------- Tablet da Matrizaria (técnicos com PIN) ---------- */
const tecnicosDoTablet = () => DB().pessoas.filter((p) => p.nivel === 3 && p.liberado).sort((a, b) => a.nome.localeCompare(b.nome))
  .map((p) => ({ id: p.id, nome: p.nome, cargo: p.cargo || 'Técnico', temPin: DB().pins.some((x) => x.pessoaId === p.id) }));
app.get('/api/tablet', (req, res) => {
  const ap = aparelhoDe(req);
  if (!ap) return res.json({ liberado: false });
  ap.ultimoUso = Date.now(); banco.salvarDepois();
  res.json({ liberado: true, nome: ap.nome, minutos: Number(config.minutosTablet) || 10, tecnicos: tecnicosDoTablet() });
});
app.post('/api/tablet/liberar', (req, res) => {
  const r = conferirGestor(req.body.matricula, req.body.senha);
  if (!r.p) return erro(res, r.cod, r.msg);
  const t = auth.token();
  const ap = { id: auth.id(), nome: texto(req.body.nome, 60) || 'Tablet da Matrizaria', tokenHash: auth.sha(t), liberadoPor: r.p.id, liberadoEm: new Date().toISOString(), ultimoUso: Date.now(), ativo: true };
  DB().aparelhos.push(ap); banco.salvar();
  auth.cookie(res, APARELHO, t, 400 * 86400);
  res.json({ ok: true, nome: ap.nome });
});
app.post('/api/tablet/entrar', (req, res) => {
  const ap = aparelhoDe(req);
  if (!ap) return erro(res, 403, 'Este aparelho não está liberado. Peça a um gestor para liberar.');
  const p = DB().pessoas.find((x) => x.id === req.body.pessoaId && x.nivel === 3 && x.liberado);
  if (!p) return erro(res, 404, 'Técnico não encontrado.');
  const rec = DB().pins.find((x) => x.pessoaId === p.id);
  if (!rec) return erro(res, 409, 'Este técnico ainda não tem PIN. Peça ao gestor para definir em Equipe.');
  if (rec.bloqueadoAte && rec.bloqueadoAte > Date.now()) return erro(res, 429, 'PIN bloqueado por 15 minutos depois de 5 erros.');
  if (!auth.confere(texto(req.body.pin, 6), rec.pin)) {
    rec.erros = (rec.erros || 0) + 1;
    if (rec.erros >= 5) { rec.erros = 0; rec.bloqueadoAte = Date.now() + 15 * 60000; banco.salvar(); return erro(res, 429, 'PIN bloqueado por 15 minutos depois de 5 erros.'); }
    banco.salvar();
    return erro(res, 401, `PIN incorreto. Restam ${5 - rec.erros} tentativas.`);
  }
  rec.erros = 0; rec.bloqueadoAte = null;
  novaSessao(res, p, 'tablet', ap.id);
  res.json(euParaTela(p, { tipo: 'tablet' }));
});

/* ---------- Listas para os campos de seleção ---------- */
app.get('/api/listas', logado, (req, res) => {
  const db = DB(), c = db.config;
  const pessoas = db.pessoas.filter((p) => p.liberado).sort((a, b) => a.nome.localeCompare(b.nome));
  res.json({
    tecnicos: pessoas.filter((p) => p.nivel === 3).map((p) => ({ id: p.id, nome: p.nome })),
    pessoas: pessoas.map((p) => ({ id: p.id, nome: p.nome, nivel: p.nivel })),
    maquinas: c.maquinas, tiposMatriz: c.tiposMatriz, materiais: c.materiais, tiposServico: c.tiposServico, setores: c.setores,
    matrizes: db.matrizes.filter((m) => m.situacao !== 'inativa').map((m) => ({ id: m.codigo, nome: m.descricao })).sort((a, b) => a.id.localeCompare(b.id)),
    matrizesPorDia: Number(c.matrizesPorDia) || 3, exemplo: !!db.exemplo, hoje: datas.hoje(),
    abertas: { osm: db.osMatrizes.filter((o) => calc.OS_ABERTA.includes(o.status)).length, oss: db.osServicos.filter((o) => calc.OS_ABERTA.includes(o.status)).length },
  });
});

/* ---------- Painel e matrizes do dia ---------- */
app.get('/api/painel', gestor, (req, res) => {
  const db = DB(), ctx = calc.contexto(db);
  const plano = calc.planoDoDia(db, ctx, banco.salvar); /* primeiro: gera a indicação do dia, que entra no gráfico */
  res.json({ ...calc.painel(db, ctx, () => banco.salvarDepois(5000)), plano });
});
app.get('/api/plano-do-dia', logado, (req, res) => {
  const db = DB();
  res.json(calc.planoDoDia(db, calc.contexto(db), banco.salvar));
});
app.post('/api/plano-do-dia/recalcular', gestor, (req, res) => {
  const db = DB(), dia = datas.hoje();
  if (!datas.diaUtil(dia, db.config.email.dias)) return erro(res, 400, 'Hoje não é dia de indicação.');
  delete db.planos[dia];
  res.json(calc.planoDoDia(db, calc.contexto(db), banco.salvar));
});
app.post('/api/plano-do-dia/gerar-os', gestor, (req, res) => {
  const db = DB(), ctx = calc.contexto(db);
  const plano = calc.planoDoDia(db, ctx, banco.salvar);
  if (!plano.deHoje) return erro(res, 400, 'Não há indicação para hoje.');
  const criadas = [];
  for (const it of plano.itens) {
    if (it.feita || ctx.osPorMatriz.has(it.id)) continue;
    const m = ctx.matrizes.get(it.id);
    if (!m) continue;
    const o = { id: banco.proximoNumero('osm'), tipo: 'Preventiva', matriz: m.codigo, tecnico: m.responsavel || null, abertura: new Date().toISOString(), prazo: datas.hoje(), status: 'aberta', origem: 'plano', checks: [], descricao: 'Matriz do dia' };
    db.osMatrizes.push(o); criadas.push(o.id);
  }
  banco.salvar();
  res.json({ criadas });
});

/* ---------- Matrizes ---------- */
const acharMatriz = (codigo) => DB().matrizes.find((m) => m.codigo === codigo);
app.get('/api/matrizes', logado, (req, res) => {
  const db = DB(), ctx = calc.contexto(db);
  res.json(db.matrizes.map((m) => calc.matrizParaTela(db, m, ctx)));
});
app.get('/api/matrizes/:codigo', logado, (req, res) => {
  const m = acharMatriz(req.params.codigo);
  if (!m) return erro(res, 404, 'Matriz não encontrada.');
  const db = DB();
  res.json(calc.detalheMatriz(db, m, calc.contexto(db)));
});
function lerMatriz(b, atual) {
  const criterio = ['golpes', 'dias', 'ambos'].includes(b.criterio) ? b.criterio : 'ambos';
  const m = {
    codigo: atual ? atual.codigo : texto(b.codigo, 40).toUpperCase(),
    descricao: texto(b.descricao, 140), tipo: texto(b.tipo, 60), maquina: texto(b.maquina, 60), estacao: texto(b.estacao, 60), material: texto(b.material, 60),
    situacao: b.situacao === 'inativa' ? 'inativa' : 'ativa', criterio,
    limiteGolpes: inteiro(b.limiteGolpes) ?? 0, intervaloDias: inteiro(b.intervaloDias) ?? 0,
    alertaPct: [70, 80, 90].includes(Number(b.alertaPct)) ? Number(b.alertaPct) : 70,
    responsavel: DB().pessoas.some((p) => p.id === b.responsavel) ? b.responsavel : null,
    notificar: !!b.notificar,
    checklist: (Array.isArray(b.checklist) ? b.checklist : []).map((x) => texto(x, 140)).filter(Boolean).slice(0, 40),
    golpes: inteiro(b.golpes) ?? (atual ? atual.golpes : 0),
    ultima: b.ultima === null || b.ultima === '' ? null : datas.valido(b.ultima) ? b.ultima : atual ? atual.ultima : null,
    referencias: [...new Set((Array.isArray(b.referencias) ? b.referencias : []).map((x) => texto(x, 40)).filter(Boolean))].slice(0, 60),
  };
  const faltam = [];
  if (!m.codigo) faltam.push(['codigo', 'Informe o código']);
  if (!m.descricao) faltam.push(['descricao', 'Informe a descrição']);
  if (!m.maquina) faltam.push(['maquina', 'Selecione a máquina']);
  if (criterio !== 'dias' && !m.limiteGolpes) faltam.push(['limiteGolpes', 'Informe o limite de golpes']);
  if (criterio !== 'golpes' && !m.intervaloDias) faltam.push(['intervaloDias', 'Informe o intervalo em dias']);
  if (!m.responsavel) faltam.push(['responsavel', 'Selecione o responsável']);
  return { m, faltam };
}
function garantirReferencias(lista) {
  const db = DB();
  for (const r of lista) if (!db.referencias.some((x) => x.codigo === r)) db.referencias.push({ codigo: r, descricao: '' });
}
app.post('/api/matrizes', gestor, (req, res) => {
  const { m, faltam } = lerMatriz(req.body);
  if (faltam.length) return erro(res, 400, faltam[0][1], { campos: Object.fromEntries(faltam) });
  if (acharMatriz(m.codigo)) return erro(res, 409, `Já existe a matriz ${m.codigo}.`, { campos: { codigo: 'Código já cadastrado' } });
  const agora = new Date().toISOString();
  DB().matrizes.push({ ...m, proximaManual: null, criadaEm: agora, atualizadaEm: agora });
  garantirReferencias(m.referencias); banco.salvar();
  res.json({ ok: true, id: m.codigo });
});
app.put('/api/matrizes/:codigo', gestor, (req, res) => {
  const atual = acharMatriz(req.params.codigo);
  if (!atual) return erro(res, 404, 'Matriz não encontrada.');
  const { m, faltam } = lerMatriz(req.body, atual);
  if (faltam.length) return erro(res, 400, faltam[0][1], { campos: Object.fromEntries(faltam) });
  Object.assign(atual, m, { atualizadaEm: new Date().toISOString() });
  garantirReferencias(m.referencias); banco.salvar();
  res.json({ ok: true, id: atual.codigo });
});
app.post('/api/matrizes/:codigo/reprogramar', gestor, (req, res) => {
  const m = acharMatriz(req.params.codigo);
  if (!m) return erro(res, 404, 'Matriz não encontrada.');
  if (req.body.data && !datas.valido(req.body.data)) return erro(res, 400, 'Informe uma data válida.');
  m.proximaManual = req.body.data || null;
  m.reprogramacao = req.body.data ? { data: req.body.data, motivo: texto(req.body.motivo, 300), por: req.eu.id, em: new Date().toISOString() } : null;
  banco.salvar();
  res.json({ ok: true });
});

/* ---------- Registro de manutenção (fecha a OS e zera os golpes) ---------- */
app.post('/api/manutencoes', logado, (req, res) => {
  const db = DB(), b = req.body;
  const m = acharMatriz(b.matriz);
  if (!m) return erro(res, 404, 'Matriz não encontrada.');
  if (m.situacao === 'inativa') return erro(res, 400, 'Matriz inativa: ative antes de registrar manutenção.');
  const checks = Array.isArray(b.checklist) ? b.checklist : [];
  if ((m.checklist || []).some((_, i) => !checks[i])) return erro(res, 400, 'Marque todos os itens do checklist.');
  const data = eTecnico(req) ? datas.hoje() : datas.valido(b.data) ? b.data : datas.hoje();
  if (data > datas.hoje()) return erro(res, 400, 'A data não pode ser no futuro.');
  const tecnico = eTecnico(req) ? req.eu.id : db.pessoas.some((p) => p.id === b.tecnico) ? b.tecnico : null;
  if (!tecnico) return erro(res, 400, 'Selecione o técnico.');
  let os = b.os ? db.osMatrizes.find((o) => o.id === b.os && o.matriz === m.codigo) : null;
  if (!os) os = db.osMatrizes.find((o) => o.matriz === m.codigo && calc.OS_ABERTA.includes(o.status));
  if (os && eTecnico(req) && os.tecnico && os.tecnico !== req.eu.id) return erro(res, 403, 'Esta OS está com outro técnico.');
  const tipo = os ? os.tipo : b.tipo === 'Corretiva' ? 'Corretiva' : 'Preventiva';
  const agora = new Date().toISOString();
  const fotos = (Array.isArray(b.fotos) ? b.fotos : []).filter((f) => /^[a-f0-9]{16}\.(jpg|png|webp)$/.test(f)).slice(0, 6);
  const reg = {
    id: auth.id(), matriz: m.codigo, data, tipo, tecnico, golpesContador: inteiro(b.golpesContador), tempoMin: inteiro(b.tempoMin), desgasteMm: texto(b.desgasteMm, 12),
    checklist: (m.checklist || []).map((item) => ({ item, ok: true })), obs: texto(b.obs, 1000), fotos, os: null, registradaPor: req.eu.id, registradaEm: agora,
  };
  if (!os) {
    os = { id: banco.proximoNumero('osm'), tipo, matriz: m.codigo, tecnico, abertura: agora, prazo: data, status: 'aberta', origem: 'registro', checks: [], descricao: '' };
    db.osMatrizes.push(os);
  }
  Object.assign(os, { status: 'concluida', concluidaEm: agora, tecnico: os.tecnico || tecnico, manutencaoId: reg.id, checks: (m.checklist || []).map(() => true) });
  reg.os = os.id;
  db.manutencoes.push(reg);
  if (!m.ultima || data >= m.ultima) { m.ultima = data; m.golpes = 0; m.proximaManual = null; m.reprogramacao = null; }
  banco.salvar();
  res.json({ ok: true, os: os.id, matriz: calc.detalheMatriz(db, m, calc.contexto(db)) });
});

/* ---------- OS - Matrizes ---------- */
const STATUS_OS = ['aberta', 'andamento', 'peca', 'concluida', 'cancelada'];
app.get('/api/os-matrizes', logado, (req, res) => {
  const db = DB(), ctx = calc.contexto(db);
  res.json(db.osMatrizes.map((o) => calc.osmParaTela(o, ctx)).sort((a, b) => String(b.aberturaISO).localeCompare(String(a.aberturaISO))));
});
app.post('/api/os-matrizes', gestor, (req, res) => {
  const db = DB(), b = req.body;
  const codigos = [...new Set(Array.isArray(b.matrizes) ? b.matrizes : [b.matriz])].filter(Boolean);
  if (!codigos.length) return erro(res, 400, 'Selecione a matriz.', { campos: { matriz: 'Selecione a matriz' } });
  const prazo = datas.valido(b.prazo) ? b.prazo : datas.hoje();
  const ctx = calc.contexto(db);
  const criadas = [], ignoradas = [];
  for (const c of codigos) {
    const m = acharMatriz(c);
    if (!m || m.situacao === 'inativa' || ctx.osPorMatriz.has(c)) { ignoradas.push(c); continue; }
    const tecnico = db.pessoas.some((p) => p.id === b.tecnico) ? b.tecnico : b.tecnico === 'responsavel' ? m.responsavel || null : null;
    const o = { id: banco.proximoNumero('osm'), tipo: b.tipo === 'Corretiva' ? 'Corretiva' : 'Preventiva', matriz: c, tecnico, abertura: new Date().toISOString(), prazo, status: 'aberta', origem: 'manual', checks: [], descricao: texto(b.descricao, 600) };
    db.osMatrizes.push(o); criadas.push(o.id);
  }
  banco.salvar();
  res.json({ criadas, ignoradas });
});
app.post('/api/os-matrizes/iniciar', logado, (req, res) => {
  const db = DB(), m = acharMatriz(req.body.matriz);
  if (!m) return erro(res, 404, 'Matriz não encontrada.');
  if (m.situacao === 'inativa') return erro(res, 400, 'Matriz inativa.');
  let os = db.osMatrizes.find((o) => o.matriz === m.codigo && calc.OS_ABERTA.includes(o.status));
  if (os) {
    if (eTecnico(req) && os.tecnico && os.tecnico !== req.eu.id) return erro(res, 403, 'Esta OS está com outro técnico.');
    if (!os.tecnico) os.tecnico = eTecnico(req) ? req.eu.id : m.responsavel || null;
    if (os.status === 'aberta') os.status = 'andamento';
  } else {
    os = { id: banco.proximoNumero('osm'), tipo: 'Preventiva', matriz: m.codigo, tecnico: eTecnico(req) ? req.eu.id : m.responsavel || null, abertura: new Date().toISOString(), prazo: datas.hoje(), status: 'andamento', origem: 'tablet', checks: [], descricao: '' };
    db.osMatrizes.push(os);
  }
  if (!os.iniciadaEm) os.iniciadaEm = new Date().toISOString();
  banco.salvar();
  res.json(calc.osmParaTela(os, calc.contexto(db)));
});
app.patch('/api/os-matrizes/:id', logado, (req, res) => {
  const db = DB(), b = req.body;
  const os = db.osMatrizes.find((o) => o.id === req.params.id);
  if (!os) return erro(res, 404, 'OS não encontrada.');
  if (eTecnico(req)) {
    if (os.tecnico && os.tecnico !== req.eu.id) return erro(res, 403, 'Esta OS está com outro técnico.');
    if (b.status && !['andamento', 'peca'].includes(b.status)) return erro(res, 403, 'Seu nível de acesso não permite esta ação.');
    if (!os.tecnico) os.tecnico = req.eu.id;
  } else {
    if (b.tecnico !== undefined) os.tecnico = db.pessoas.some((p) => p.id === b.tecnico) ? b.tecnico : null;
    if (b.prazo && datas.valido(b.prazo)) os.prazo = b.prazo;
    if (b.descricao !== undefined) os.descricao = texto(b.descricao, 600);
  }
  if (b.status) {
    if (!STATUS_OS.includes(b.status)) return erro(res, 400, 'Situação inválida.');
    if (b.status === 'concluida') return erro(res, 400, 'Para concluir, registre a manutenção.');
    if (!calc.OS_ABERTA.includes(os.status)) return erro(res, 400, 'Esta OS já foi encerrada.');
    os.status = b.status;
    if (b.status === 'andamento' && !os.iniciadaEm) os.iniciadaEm = new Date().toISOString();
    if (b.status === 'cancelada') os.canceladaEm = new Date().toISOString();
  }
  if (Array.isArray(b.checks)) os.checks = b.checks.slice(0, 40).map(Boolean);
  banco.salvar();
  res.json(calc.osmParaTela(os, calc.contexto(db)));
});

/* ---------- OS - Serviços (usinagem, retífica, fresa… pedidos à Matrizaria) ---------- */
app.get('/api/os-servicos', logado, (req, res) => {
  const db = DB(), ctx = calc.contexto(db);
  res.json(db.osServicos.map((o) => calc.ossParaTela(o, ctx)).sort((a, b) => String(b.aberturaISO).localeCompare(String(a.aberturaISO))));
});
app.post('/api/os-servicos', gestor, (req, res) => {
  const db = DB(), b = req.body;
  const campos = {};
  const servico = texto(b.servico, 40), descricao = texto(b.descricao, 600);
  if (!servico) campos.servico = 'Selecione o serviço';
  if (!descricao) campos.descricao = 'Descreva o serviço';
  if (!datas.valido(b.prazo)) campos.prazo = 'Informe o prazo';
  if (Object.keys(campos).length) return erro(res, 400, Object.values(campos)[0], { campos });
  const o = {
    id: banco.proximoNumero('oss'), servico, descricao, solicitante: texto(b.solicitante, 80), setor: texto(b.setor, 60), quantidade: inteiro(b.quantidade, 1) || 1,
    tecnico: db.pessoas.some((p) => p.id === b.tecnico) ? b.tecnico : null, abertura: new Date().toISOString(), prazo: b.prazo, status: 'aberta', observacoes: '', concluidaEm: null,
  };
  db.osServicos.push(o); banco.salvar();
  res.json(calc.ossParaTela(o, calc.contexto(db)));
});
app.patch('/api/os-servicos/:id', logado, (req, res) => {
  const db = DB(), b = req.body;
  const os = db.osServicos.find((o) => o.id === req.params.id);
  if (!os) return erro(res, 404, 'OS não encontrada.');
  if (eTecnico(req)) {
    if (os.tecnico && os.tecnico !== req.eu.id) return erro(res, 403, 'Esta OS está com outro técnico.');
    if (b.status && !['andamento', 'peca', 'concluida'].includes(b.status)) return erro(res, 403, 'Seu nível de acesso não permite esta ação.');
    if (!os.tecnico) os.tecnico = req.eu.id;
  } else {
    if (b.tecnico !== undefined) os.tecnico = db.pessoas.some((p) => p.id === b.tecnico) ? b.tecnico : null;
    if (b.prazo && datas.valido(b.prazo)) os.prazo = b.prazo;
    for (const k of ['servico', 'descricao', 'solicitante', 'setor']) if (b[k] !== undefined && texto(b[k])) os[k] = texto(b[k], k === 'descricao' ? 600 : 80);
    if (b.quantidade !== undefined) os.quantidade = inteiro(b.quantidade, 1) || os.quantidade;
  }
  if (b.observacoes !== undefined) os.observacoes = texto(b.observacoes, 1000);
  if (b.status) {
    if (!STATUS_OS.includes(b.status)) return erro(res, 400, 'Situação inválida.');
    if (!calc.OS_ABERTA.includes(os.status)) return erro(res, 400, 'Esta OS já foi encerrada.');
    os.status = b.status;
    if (b.status === 'concluida') os.concluidaEm = new Date().toISOString();
    if (b.status === 'cancelada') os.canceladaEm = new Date().toISOString();
  }
  banco.salvar();
  res.json(calc.ossParaTela(os, calc.contexto(db)));
});

/* ---------- Equipe (pessoas, PIN, contas) ----------
   Nível 2 gerencia técnicos (nível 3). Só o nível 1 cria, altera ou exclui pessoas de nível 1 ou 2.
   Sempre sobra pelo menos 1 pessoa liberada de nível 1. */
const pessoaParaTela = (p) => {
  const db = DB(), c = db.contas.find((x) => x.pessoaId === p.id), pin = db.pins.find((x) => x.pessoaId === p.id);
  return { id: p.id, nome: p.nome, matricula: p.matricula, nivel: p.nivel, nivelTexto: NIVEL[p.nivel], cargo: p.cargo || '', liberado: p.liberado, conta: !!c, email: c ? c.email : null, pin: !!pin, pinBloqueado: !!(pin && pin.bloqueadoAte && pin.bloqueadoAte > Date.now()), exemplo: !!p.exemplo };
};
const podeMexer = (eu, alvoNivel) => eu.nivel === 1 || alvoNivel === 3;
const restaAdmin = (excetoId, novo) => DB().pessoas.some((p) => (p.id === excetoId ? novo && novo.nivel === 1 && novo.liberado : p.nivel === 1 && p.liberado));
app.get('/api/pessoas', gestor, (req, res) => res.json(DB().pessoas.slice().sort((a, b) => a.nivel - b.nivel || a.nome.localeCompare(b.nome)).map(pessoaParaTela)));
function lerPessoa(b) {
  return { nome: texto(b.nome, 80), matricula: texto(b.matricula, 40), nivel: [1, 2, 3].includes(Number(b.nivel)) ? Number(b.nivel) : 3, cargo: texto(b.cargo, 60), liberado: b.liberado !== false };
}
app.post('/api/pessoas', gestor, (req, res) => {
  const n = lerPessoa(req.body);
  if (!n.nome) return erro(res, 400, 'Informe o nome.', { campos: { nome: 'Informe o nome' } });
  if (!n.matricula) return erro(res, 400, 'Informe a matrícula.', { campos: { matricula: 'Informe a matrícula' } });
  if (porMatricula(n.matricula)) return erro(res, 409, 'Matrícula já cadastrada.', { campos: { matricula: 'Matrícula já cadastrada' } });
  if (!podeMexer(req.eu, n.nivel)) return erro(res, 403, 'Só o nível 1 cadastra gestores e administradores.');
  const p = { id: auth.id(), ...n };
  DB().pessoas.push(p); banco.salvar();
  res.json(pessoaParaTela(p));
});
app.put('/api/pessoas/:id', gestor, (req, res) => {
  const p = DB().pessoas.find((x) => x.id === req.params.id);
  if (!p) return erro(res, 404, 'Pessoa não encontrada.');
  const n = lerPessoa(req.body);
  if (!podeMexer(req.eu, p.nivel) || !podeMexer(req.eu, n.nivel)) return erro(res, 403, 'Só o nível 1 altera gestores e administradores.');
  if (!n.nome || !n.matricula) return erro(res, 400, 'Informe nome e matrícula.');
  const outro = porMatricula(n.matricula);
  if (outro && outro.id !== p.id) return erro(res, 409, 'Matrícula já cadastrada.', { campos: { matricula: 'Matrícula já cadastrada' } });
  if (!restaAdmin(p.id, n)) return erro(res, 400, 'Precisa sobrar pelo menos 1 pessoa liberada de nível 1.');
  Object.assign(p, n);
  if (!p.liberado || p.nivel === 3) DB().sessoes = DB().sessoes.filter((s) => !(s.pessoaId === p.id && (!p.liberado || s.tipo === 'admin')));
  banco.salvar();
  res.json(pessoaParaTela(p));
});
app.delete('/api/pessoas/:id', gestor, (req, res) => {
  const db = DB(), p = db.pessoas.find((x) => x.id === req.params.id);
  if (!p) return erro(res, 404, 'Pessoa não encontrada.');
  if (p.id === req.eu.id) return erro(res, 400, 'Você não pode excluir a si mesmo.');
  if (!podeMexer(req.eu, p.nivel)) return erro(res, 403, 'Só o nível 1 exclui gestores e administradores.');
  if (!restaAdmin(p.id, null)) return erro(res, 400, 'Precisa sobrar pelo menos 1 pessoa liberada de nível 1.');
  db.pessoas = db.pessoas.filter((x) => x !== p);
  db.contas = db.contas.filter((x) => x.pessoaId !== p.id);
  db.pins = db.pins.filter((x) => x.pessoaId !== p.id);
  db.sessoes = db.sessoes.filter((x) => x.pessoaId !== p.id);
  for (const m of db.matrizes) if (m.responsavel === p.id) m.responsavel = null;
  banco.salvar();
  res.json({ ok: true });
});
app.post('/api/pessoas/:id/pin', gestor, (req, res) => {
  const db = DB(), p = db.pessoas.find((x) => x.id === req.params.id);
  if (!p) return erro(res, 404, 'Pessoa não encontrada.');
  if (p.nivel !== 3) return erro(res, 400, 'PIN é só para técnicos (nível 3).');
  const pin = String(req.body.pin || '');
  if (!/^\d{6}$/.test(pin)) return erro(res, 400, 'O PIN precisa ter 6 números.', { campos: { pin: 'Use 6 números' } });
  if (/^(\d)\1{5}$/.test(pin) || '0123456789'.includes(pin) || '9876543210'.includes(pin)) return erro(res, 400, 'Escolha um PIN menos óbvio.', { campos: { pin: 'Evite sequências e números repetidos' } });
  db.pins = db.pins.filter((x) => x.pessoaId !== p.id);
  db.pins.push({ pessoaId: p.id, pin: auth.hash(pin), definidoEm: new Date().toISOString(), erros: 0, bloqueadoAte: null });
  db.sessoes = db.sessoes.filter((s) => s.pessoaId !== p.id);
  banco.salvar();
  res.json(pessoaParaTela(p));
});
app.delete('/api/pessoas/:id/conta', gestor, (req, res) => {
  const db = DB(), p = db.pessoas.find((x) => x.id === req.params.id);
  if (!p) return erro(res, 404, 'Pessoa não encontrada.');
  if (!podeMexer(req.eu, p.nivel) && p.id !== req.eu.id) return erro(res, 403, 'Só o nível 1 apaga contas de gestores e administradores.');
  db.contas = db.contas.filter((x) => x.pessoaId !== p.id);
  db.pendentes = db.pendentes.filter((x) => x.pessoaId !== p.id);
  db.sessoes = db.sessoes.filter((x) => !(x.pessoaId === p.id && x.tipo === 'admin'));
  banco.salvar();
  res.json(pessoaParaTela(p));
});

/* ---------- Tablets liberados ---------- */
app.get('/api/aparelhos', gestor, (req, res) => {
  const db = DB(), nomeDe = (id) => (db.pessoas.find((p) => p.id === id) || {}).nome || '—';
  res.json(db.aparelhos.filter((a) => a.ativo).map((a) => ({ id: a.id, nome: a.nome, liberadoPor: nomeDe(a.liberadoPor), liberadoEm: datas.brHora(a.liberadoEm), ultimoUso: datas.brHora(a.ultimoUso) })));
});
app.delete('/api/aparelhos/:id', gestor, (req, res) => {
  const db = DB(), a = db.aparelhos.find((x) => x.id === req.params.id);
  if (!a) return erro(res, 404, 'Aparelho não encontrado.');
  a.ativo = false; a.revogadoEm = new Date().toISOString(); a.revogadoPor = req.eu.id;
  db.sessoes = db.sessoes.filter((s) => s.aparelhoId !== a.id);
  banco.salvar();
  res.json({ ok: true });
});

/* ---------- Configurações ---------- */
app.get('/api/config', gestor, (req, res) => {
  const db = DB();
  const ult = db.importacoes[db.importacoes.length - 1];
  res.json({ ...db.config, emailModoTeste: email.modoTeste(), exemplo: !!db.exemplo, ultimaImportacao: ult ? { ...ult, quando: datas.brHora(ult.quando) } : null, referencias: db.referencias.length });
});
app.put('/api/config', gestor, (req, res) => {
  const db = DB(), b = req.body, c = db.config;
  const lista = (v, max = 80) => (Array.isArray(v) ? v : String(v || '').split('\n')).map((x) => texto(x, 60)).filter(Boolean).slice(0, max);
  if (b.matrizesPorDia !== undefined) { const n = inteiro(b.matrizesPorDia, 1); if (!n || n > 10) return erro(res, 400, 'Use de 1 a 10 matrizes por dia.', { campos: { matrizesPorDia: 'De 1 a 10' } }); c.matrizesPorDia = n; }
  if (b.minPecasAposManutencao !== undefined) { const n = inteiro(b.minPecasAposManutencao, 0); if (n === null) return erro(res, 400, 'Informe a quantidade de peças.', { campos: { minPecasAposManutencao: 'Informe um número' } }); c.minPecasAposManutencao = n; }
  if (b.alertaPadrao !== undefined && [70, 80, 90].includes(Number(b.alertaPadrao))) c.alertaPadrao = Number(b.alertaPadrao);
  if (b.email) {
    const e = b.email;
    const dest = lista(e.destinatarios, 30).map((x) => x.toLowerCase());
    const ruim = dest.find((x) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(x));
    if (ruim) return erro(res, 400, `E-mail inválido: ${ruim}`, { campos: { destinatarios: 'Confira os e-mails' } });
    if (e.hora !== undefined && !/^([01]\d|2[0-3]):[0-5]\d$/.test(e.hora)) return erro(res, 400, 'Informe o horário no formato 06:30.', { campos: { hora: 'Use HH:MM' } });
    c.email = { ...c.email, ativo: e.ativo !== undefined ? !!e.ativo : c.email.ativo, hora: e.hora || c.email.hora, destinatarios: dest };
  }
  for (const k of ['maquinas', 'tiposMatriz', 'materiais', 'tiposServico', 'setores']) if (b[k] !== undefined) c[k] = lista(b[k]);
  banco.salvar();
  res.json({ ok: true });
});

/* ---------- Fotos da manutenção ---------- */
app.post('/api/fotos', logado, (req, res) => {
  const mm = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(String(req.body.dataUrl || ''));
  if (!mm) return erro(res, 400, 'Envie uma foto em JPG, PNG ou WEBP.');
  const buf = Buffer.from(mm[2], 'base64');
  if (buf.length > 4 * 1024 * 1024) return erro(res, 413, 'Foto grande demais (máximo 4 MB).');
  const nome = `${auth.id()}.${mm[1] === 'jpeg' ? 'jpg' : mm[1]}`;
  fs.writeFileSync(path.join(banco.FOTOS, nome), buf);
  res.json({ nome });
});
app.get('/fotos/:nome', logado, (req, res) => {
  if (!/^[a-f0-9]{16}\.(jpg|png|webp)$/.test(req.params.nome)) return erro(res, 400, 'Nome inválido.');
  const arq = path.join(banco.FOTOS, req.params.nome);
  if (!fs.existsSync(arq)) return erro(res, 404, 'Foto não encontrada.');
  res.sendFile(arq);
});

/* ---------- Telas ---------- */
app.get('/', (req, res) => res.redirect('/admin/'));
app.use('/design', express.static(path.join(__dirname, 'design')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', (req, res) => erro(res, 404, 'Rota não encontrada.'));
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') return erro(res, 413, 'Arquivo grande demais.');
  if (err.type === 'entity.parse.failed') return erro(res, 400, 'Dados inválidos.');
  console.error(err);
  erro(res, 500, 'Erro no servidor. Veja o terminal.');
});

app.listen(PORTA, () => {
  const db = DB();
  console.log('\nSCREW · Manutenção preventiva das matrizes');
  console.log(`  Admin (computador):   http://localhost:${PORTA}/admin/`);
  console.log(`  App do Técnico (tablet): http://localhost:${PORTA}/tecnico/`);
  console.log(`  E-mail: ${email.modoTeste() ? 'MODO TESTE (códigos aparecem aqui no terminal)' : 'Gmail configurado'}`);
  if (db.exemplo) console.log('  Banco com DADOS DE EXEMPLO. Técnicos de exemplo entram com PIN 123456.');
  console.log('');
});
