/* Regras de negócio calculadas no servidor:
   - status de cada matriz (Em dia, Próxima, Vencida, Em manutenção, Inativa)
   - as matrizes do dia (regra definida pelo João, ver CLAUDE.md)
   - números do Painel
   - formatação dos registros para as telas */
const d = require('./datas');

const OS_ABERTA = ['aberta', 'andamento', 'peca'];

/* Contexto calculado uma vez por requisição */
function contexto(db) {
  const osPorMatriz = new Map();
  for (const o of db.osMatrizes) if (OS_ABERTA.includes(o.status) && !osPorMatriz.has(o.matriz)) osPorMatriz.set(o.matriz, o);
  const pessoas = new Map(db.pessoas.map((p) => [p.id, p]));
  const matrizes = new Map(db.matrizes.map((m) => [m.codigo, m]));
  return { hoje: d.hoje(), osPorMatriz, pessoas, matrizes, cfg: db.config };
}
const nome = (ctx, id) => (id && ctx.pessoas.get(id) ? ctx.pessoas.get(id).nome : null);

/* ---------- Status da matriz ---------- */
function statusMatriz(m, ctx) {
  const usaG = m.criterio !== 'dias' && Number(m.limiteGolpes) > 0;
  const usaD = m.criterio !== 'golpes' && Number(m.intervaloDias) > 0;
  const proximaISO = m.proximaManual || (usaD && m.ultima ? d.somarDias(m.ultima, Number(m.intervaloDias)) : null);
  const dias = proximaISO ? d.diferencaDias(ctx.hoje, proximaISO) : null;
  const uso = usaG ? (Number(m.golpes) || 0) / Number(m.limiteGolpes) : null;
  const alerta = (Number(m.alertaPct) || ctx.cfg.alertaPadrao || 70) / 100;
  const pct = uso !== null ? `${Math.round(uso * 100)}% do limite` : '—';
  const base = { proximaISO, dias, uso, venceuPor: null };

  if (m.situacao === 'inativa') return { ...base, status: 'inactive', rel: 'Fora de uso' };
  const os = ctx.osPorMatriz.get(m.codigo);
  if (os) return { ...base, status: 'progress', rel: os.id };
  if (usaG && uso >= 1) return { ...base, status: 'overdue', venceuPor: 'golpes', rel: dias !== null && dias <= 0 ? d.prazoRelativo(dias) : 'Limite de golpes atingido' };
  if (dias !== null && dias <= 0) return { ...base, status: 'overdue', venceuPor: 'data', rel: d.prazoRelativo(dias) };
  if (usaD && !m.ultima && !m.proximaManual) return { ...base, status: 'due', rel: 'Sem manutenção registrada' };
  const dueD = dias !== null && dias <= 7;
  const dueG = usaG && uso >= alerta;
  if (dueD || dueG) return { ...base, status: 'due', rel: dueD ? d.prazoRelativo(dias) : pct };
  return { ...base, status: 'ok', rel: dias !== null ? d.prazoRelativo(dias) : pct };
}

/* Demanda mensal da matriz = soma das referências ligadas a ela (decisão 7-A) */
function demandaDaMatriz(db, m) {
  let soma = 0, maior = null;
  for (const r of m.referencias || []) {
    const v = db.demanda[r] ? Number(db.demanda[r].mensal) || 0 : 0;
    soma += v;
    if (!maior || v > maior.v) maior = { ref: r, v };
  }
  return { soma, refMaior: maior ? maior.ref : null, refMaiorDemanda: maior ? maior.v : 0 };
}

/* ---------- Matriz no formato das telas ---------- */
function matrizParaTela(db, m, ctx) {
  const st = statusMatriz(m, ctx);
  const dem = demandaDaMatriz(db, m);
  return {
    id: m.codigo, nome: m.descricao, tipo: m.tipo || '—', maquina: m.maquina || '—', estacao: m.estacao || '—', material: m.material || '—',
    situacao: m.situacao, criterio: m.criterio, limite: Number(m.limiteGolpes) || 0, intervalo: Number(m.intervaloDias) || 0,
    alerta: Number(m.alertaPct) || ctx.cfg.alertaPadrao, golpes: Number(m.golpes) || 0,
    ultimaISO: m.ultima || null, ultima: d.br(m.ultima), proximaISO: st.proximaISO, proxima: d.br(st.proximaISO),
    dias: st.dias, uso: st.uso, rel: st.rel, status: st.status, venceuPor: st.venceuPor,
    resp: nome(ctx, m.responsavel) || '—', respId: m.responsavel || null,
    demanda: dem.soma, refMaior: dem.refMaior, refMaiorDemanda: dem.refMaiorDemanda, referencias: m.referencias || [],
    osAberta: ctx.osPorMatriz.has(m.codigo) ? ctx.osPorMatriz.get(m.codigo).id : null,
    checklistN: (m.checklist || []).length, notificar: !!m.notificar,
  };
}

function detalheMatriz(db, m, ctx) {
  const t = matrizParaTela(db, m, ctx);
  const historico = db.manutencoes.filter((x) => x.matriz === m.codigo).sort((a, b) => (b.data + b.registradaEm).localeCompare(a.data + a.registradaEm)).map((x) => ({
    id: x.id, data: d.br(x.data), tipo: x.tipo, tec: nome(ctx, x.tecnico) || '—', nota: x.obs || 'Sem observações.', golpes: x.golpesContador, tempoMin: x.tempoMin, desgasteMm: x.desgasteMm, fotos: x.fotos || [], os: x.os || null,
  }));
  const refs = (m.referencias || []).map((r) => {
    const ref = db.referencias.find((x) => x.codigo === r);
    const dm = db.demanda[r];
    return { codigo: r, descricao: ref ? ref.descricao : '', mensal: dm ? Number(dm.mensal) || 0 : 0, atualizadaEm: dm ? dm.atualizadaEm : null };
  });
  return { ...t, checklist: m.checklist || [], historico, refs, proximaManual: m.proximaManual || null };
}

/* ---------- Ordens de serviço ---------- */
function prazoInfo(prazoISO, status, ctx) {
  const aberta = OS_ABERTA.includes(status);
  const dias = prazoISO ? d.diferencaDias(ctx.hoje, prazoISO) : null;
  return { prazoISO, prazo: d.brCurto(prazoISO), prazoHoje: aberta && dias === 0, atrasada: aberta && dias !== null && dias < 0 };
}
function osmParaTela(o, ctx) {
  const m = ctx.matrizes.get(o.matriz);
  return {
    id: o.id, grupo: 'matriz', tipo: o.tipo, matriz: o.matriz, nome: m ? m.descricao : 'Matriz removida', maquina: m ? m.maquina || '—' : '—',
    tecnico: nome(ctx, o.tecnico) || 'Sem técnico', tecnicoId: o.tecnico || null, aberturaISO: o.abertura, abertura: d.brHora(o.abertura),
    ...prazoInfo(o.prazo, o.status, ctx), status: o.status, checks: o.checks || [], checklistTotal: m ? (m.checklist || []).length : 0,
    origem: o.origem || 'manual', descricao: o.descricao || '', concluidaEm: o.concluidaEm ? d.brHora(o.concluidaEm) : null,
  };
}
function ossParaTela(o, ctx) {
  return {
    id: o.id, grupo: 'servico', servico: o.servico, descricao: o.descricao, solicitante: o.solicitante || '—', setor: o.setor || '—', quantidade: o.quantidade || 1,
    tecnico: nome(ctx, o.tecnico) || 'Sem técnico', tecnicoId: o.tecnico || null, aberturaISO: o.abertura, abertura: d.brHora(o.abertura),
    ...prazoInfo(o.prazo, o.status, ctx), status: o.status, observacoes: o.observacoes || '', concluidaEm: o.concluidaEm ? d.brHora(o.concluidaEm) : null,
  };
}

/* ---------- Matrizes do dia ----------
   Regra (respostas do João, 27/10/2026):
   1. Pendentes do plano anterior (indicadas e ainda sem manutenção registrada) ocupam as primeiras vagas (11-A).
   2. Ficam de fora: inativas; matrizes com OS aberta; matrizes que já passaram por manutenção e ainda
      não produziram o mínimo de peças configurado (config.minPecasAposManutencao) (8).
   3. Vencidas primeiro; depois as demais pela demanda mensal somada das referências (9-B, 7-A).
   4. Empate: última manutenção mais antiga primeiro; sem registro conta como a mais antiga (10-A).
   5. Sem extração nova do CIGAM: usa a última demanda e avisa (12-A). */
const feitaDesde = (db, codigo, desde) => db.manutencoes.some((x) => x.matriz === codigo && x.data >= desde);
function demandaDe(db) {
  let maior = null;
  for (const v of Object.values(db.demanda)) if (v && v.atualizadaEm && (!maior || v.atualizadaEm > maior)) maior = v.atualizadaEm;
  return maior ? maior.slice(0, 10) : null;
}
function planoAnterior(db, dia) {
  const k = Object.keys(db.planos).filter((x) => x < dia).sort().pop();
  return k ? db.planos[k] : null;
}
function gerarPlano(db, dia, ctx) {
  const n = Number(db.config.matrizesPorDia) || 3;
  const min = Number(db.config.minPecasAposManutencao) || 0;
  const itens = [];
  const usados = new Set();
  const item = (m, motivo, extra = {}) => { const dm = demandaDaMatriz(db, m); usados.add(m.codigo); return { matriz: m.codigo, motivo, demanda: dm.soma, refMaior: dm.refMaior, refMaiorDemanda: dm.refMaiorDemanda, ...extra }; };

  const ant = planoAnterior(db, dia);
  if (ant) for (const it of ant.itens) {
    if (itens.length >= n) break;
    const m = ctx.matrizes.get(it.matriz);
    if (!m || m.situacao === 'inativa' || feitaDesde(db, it.matriz, ant.data)) continue;
    itens.push(item(m, 'pendente', { desde: it.desde || ant.data }));
  }
  const ultimaAntes = (a, b) => (a.ultima || '0000-00-00').localeCompare(b.ultima || '0000-00-00');
  const cand = db.matrizes
    .filter((m) => !usados.has(m.codigo) && m.situacao !== 'inativa' && !ctx.osPorMatriz.has(m.codigo))
    .filter((m) => !(m.ultima && (Number(m.golpes) || 0) < min))
    .map((m) => ({ m, st: statusMatriz(m, ctx).status, dem: demandaDaMatriz(db, m).soma }));
  const ordem = (a, b) => (b.dem - a.dem) || ultimaAntes(a.m, b.m) || a.m.codigo.localeCompare(b.m.codigo);
  const fila = [...cand.filter((x) => x.st === 'overdue').sort(ordem), ...cand.filter((x) => x.st !== 'overdue').sort(ordem)];
  for (const x of fila) { if (itens.length >= n) break; itens.push(item(x.m, x.st === 'overdue' ? 'vencida' : 'demanda')); }
  return { data: dia, geradoEm: new Date().toISOString(), demandaDe: demandaDe(db), itens };
}

/* Devolve o plano de hoje (gera e grava na primeira consulta de um dia útil) ou o último plano */
function planoDoDia(db, ctx, salvar) {
  const dia = ctx.hoje;
  const util = d.diaUtil(dia, db.config.email.dias || [1, 2, 3, 4, 5]);
  let plano = db.planos[dia];
  if (!plano && util && db.matrizes.length) { plano = gerarPlano(db, dia, ctx); db.planos[dia] = plano; salvar(); }
  if (!plano) plano = planoAnterior(db, dia);
  return plano ? planoParaTela(db, plano, ctx, util) : { data: dia, itens: [], vazio: true, diaUtil: util };
}
function planoParaTela(db, plano, ctx, util) {
  const itens = plano.itens.map((it, i) => {
    const m = ctx.matrizes.get(it.matriz);
    const t = m ? matrizParaTela(db, m, ctx) : null;
    const feita = feitaDesde(db, it.matriz, plano.data);
    return {
      pos: i + 1, id: it.matriz, nome: t ? t.nome : 'Matriz removida', maquina: t ? t.maquina : '—', motivo: it.motivo, desde: it.desde ? d.br(it.desde) : null,
      demanda: it.demanda, refMaior: it.refMaior, refMaiorDemanda: it.refMaiorDemanda,
      golpes: t ? t.golpes : 0, limite: t ? t.limite : 0, status: t ? t.status : 'inactive', rel: t ? t.rel : '', feita, os: t ? t.osAberta : null,
    };
  });
  const hojeEhOPlano = plano.data === ctx.hoje;
  return {
    data: plano.data, dataTexto: d.curtoComDia(plano.data), deHoje: hojeEhOPlano, diaUtil: util,
    demandaDe: plano.demandaDe ? d.br(plano.demandaDe) : null,
    avisoDemanda: !plano.demandaDe ? 'Nenhuma demanda importada. A ordem usa só o vencimento e a última manutenção.'
      : plano.demandaDe < plano.data ? `A extração do CIGAM de ${d.br(plano.data)} não chegou. Usando a demanda de ${d.br(plano.demandaDe)}.` : null,
    feitas: itens.filter((x) => x.feita).length, itens,
  };
}

/* ---------- Painel ---------- */
function cumprimento(db, mesISO, ctx) {
  let total = 0, feitas = 0;
  for (const [dia, p] of Object.entries(db.planos)) {
    if (!dia.startsWith(mesISO) || dia > ctx.hoje) continue;
    for (const it of p.itens) {
      const ok = feitaDesde(db, it.matriz, dia);
      if (dia < ctx.hoje || ok) { total += 1; if (ok) feitas += 1; }
    }
  }
  return { total, feitas, pct: total ? (feitas / total) * 100 : null };
}
function mesAnterior(mes) { const [a, m] = mes.split('-').map(Number); return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`; }
const fmtPct = (v) => (v === null ? '—' : `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`);
function tempoTexto(min) {
  if (!min) return '—';
  const h = Math.floor(min / 60), mm = Math.round(min % 60);
  return h ? `${h}h ${String(mm).padStart(2, '0')}min` : `${mm}min`;
}

function painel(db, ctx, salvar) {
  const ms = db.matrizes.map((m) => matrizParaTela(db, m, ctx));
  const c = (s) => ms.filter((m) => m.status === s).length;
  const vencidas = c('overdue'), proximas = c('due');
  db.instantaneos[ctx.hoje] = { vencidas, proximas };
  const ontem = db.instantaneos[d.somarDias(ctx.hoje, -1)];

  const porMaquinaDe = (lista) => {
    const g = new Map();
    for (const m of lista) g.set(m.maquina, (g.get(m.maquina) || 0) + 1);
    return [...g.entries()].sort((a, b) => b[1] - a[1]).map(([m, n]) => ({ m, n }));
  };
  const mes = ctx.hoje.slice(0, 7);
  const cmp = cumprimento(db, mes, ctx), cmpAnt = cumprimento(db, mesAnterior(mes), ctx);

  const desde30 = d.somarDias(ctx.hoje, -30);
  const tempos = db.manutencoes.filter((x) => x.data >= desde30 && Number(x.tempoMin) > 0).map((x) => Number(x.tempoMin));
  const osAbertas = db.osMatrizes.filter((o) => OS_ABERTA.includes(o.status));

  /* Gráfico: 12 semanas + 1 prevista */
  const n = Number(db.config.matrizesPorDia) || 3;
  const semanas = [];
  for (let i = 11; i >= -1; i--) {
    const seg = d.segundaDaSemana(d.somarDias(ctx.hoje, -7 * i));
    const fim = d.somarDias(seg, 6);
    const real = db.manutencoes.filter((x) => x.tipo === 'Preventiva' && x.data >= seg && x.data <= fim).length;
    let plan = Object.entries(db.planos).filter(([k]) => k >= seg && k <= fim).reduce((s, [, p]) => s + p.itens.length, 0);
    if (i === -1) plan = n * (db.config.email.dias || [1, 2, 3, 4, 5]).length;
    semanas.push({ s: `S${d.semanaISO(seg).slice(-2)}`, de: d.brCurto(seg), plan, real, atual: i === 0, futura: i === -1 });
  }
  const maxBruto = Math.max(5, ...semanas.map((w) => Math.max(w.plan, w.real)));
  const max = Math.ceil(maxBruto / 5) * 5;

  const ordemAtencao = (a, b) => (a.status === b.status ? (a.dias ?? 999) - (b.dias ?? 999) : a.status === 'overdue' ? -1 : 1);
  const recentes = [...db.osMatrizes.map((o) => osmParaTela(o, ctx)), ...db.osServicos.map((o) => ossParaTela(o, ctx))]
    .sort((a, b) => String(b.aberturaISO).localeCompare(String(a.aberturaISO))).slice(0, 5);

  salvar();
  return {
    atualizado: d.hora(),
    totais: { matrizes: ms.length, ativas: ms.length - c('inactive'), vencidas, proximas, emManutencao: c('progress') },
    kpis: {
      vencidas: { valor: vencidas, delta: ontem ? vencidas - ontem.vencidas : null, linhas: [['Por golpes', ms.filter((m) => m.venceuPor === 'golpes').length], ['Por data', ms.filter((m) => m.venceuPor === 'data').length], ['Ontem', ontem ? ontem.vencidas : '—']] },
      proximas: { valor: proximas, delta: ontem ? proximas - ontem.proximas : null, linhas: porMaquinaDe(ms.filter((m) => m.status === 'due')).slice(0, 3).map((x) => [x.m, x.n]) },
      cumprimento: { valor: cmp.pct === null ? '—' : cmp.pct.toLocaleString('pt-BR', { maximumFractionDigits: 1 }), temValor: cmp.pct !== null, linhas: [['Indicadas', cmp.total], ['Realizadas', cmp.feitas], ['Mês anterior', fmtPct(cmpAnt.pct)]] },
      emManutencao: { valor: c('progress'), linhas: [['OS abertas', osAbertas.filter((o) => o.status === 'aberta').length], ['Aguardando peça', osAbertas.filter((o) => o.status === 'peca').length], ['Tempo médio (30 dias)', tempoTexto(tempos.length ? tempos.reduce((s, v) => s + v, 0) / tempos.length : 0)]] },
    },
    grafico: { semanas, max, totalReal: semanas.filter((w) => !w.futura).reduce((s, w) => s + w.real, 0), totalPlan: semanas.filter((w) => !w.futura).reduce((s, w) => s + w.plan, 0) },
    atencao: ms.filter((m) => m.status === 'overdue' || m.status === 'due').sort(ordemAtencao).slice(0, 8),
    porMaquina: porMaquinaDe(ms.filter((m) => m.status === 'overdue' || m.status === 'due' || (m.status === 'ok' && m.dias !== null && m.dias <= 30))).slice(0, 8),
    recentes,
  };
}

module.exports = { contexto, statusMatriz, demandaDaMatriz, matrizParaTela, detalheMatriz, osmParaTela, ossParaTela, planoDoDia, gerarPlano, painel, tempoTexto, OS_ABERTA };
