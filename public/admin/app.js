/* SCREW · Admin — Painel, Relação preventiva, Cadastrar matriz, OS - Matrizes, OS - Serviços, Equipe, Configurações.
   Interface montada com window.UI (js/ui.js) e classes de css/app.css. Dados: API do servidor (js/api.js).
   Acesso: níveis 1 (Dev/Admin) e 2 (Gestor). O servidor confere as permissões em cada chamada. */
(function () {
  const { esc, icone, botao, botaoIcone, status, chip, chipFiltro, tag, badge, medidor, avatar, campo, selecao, areaTexto, caixa, radio, chave, segmentado, abas, paginacao, etapas, indicador, cartao, aviso, toast, montar } = window.UI;
  const LOGO = '/design/assets/logo/';
  const fmtNum = window.fmtNum, fmtK = window.fmtK;
  const ORDEM_STATUS = { overdue: 0, due: 1, progress: 2, ok: 3, inactive: 4 };
  const PASSOS = ['Identificação', 'Plano preventivo', 'Checklist', 'Revisão'];
  const PAGINAS = ['painel', 'relacao', 'cadastro', 'os-matrizes', 'os-servicos', 'equipe', 'config'];
  const POR_PAGINA = 25;
  const OS_ST = { aberta: { tone: 'neutral', label: 'Aberta' }, andamento: { tone: 'brand', label: 'Em andamento' }, peca: { tone: 'warning', label: 'Aguardando peça' }, concluida: { tone: 'success', label: 'Concluída' }, cancelada: { tone: 'neutral', label: 'Cancelada' } };
  const ABERTA = (o) => ['aberta', 'andamento', 'peca'].includes(o.status);
  const CHECK_PADRAO = ['Inspecionar trincas e lascamentos', 'Medir desgaste do perfil (paquímetro / projetor)', 'Polir cavidade e raios', 'Verificar pino ejetor e mola', 'Limpar e aplicar protetivo'];
  const NIVEIS = [{ v: 3, t: 'Técnico' }, { v: 2, t: 'Gestor' }, { v: 1, t: 'Dev / Admin' }];

  const cadVazio = () => ({ passo: 0, editando: null, novo: '', novaRef: '', erros: {}, salvando: false, itens: CHECK_PADRAO.slice(), f: { codigo: '', descricao: '', tipo: '', maquina: '', estacao: '', material: '', situacao: 'Ativa', criterio: 'ambos', limiteGolpes: '200000', intervaloDias: '90', alertaPct: '70%', responsavel: '', notificar: true, golpes: '0', ultima: '', referencias: [] } });
  const S = {
    eu: null, listas: null, pagina: PAGINAS.includes(localStorage.getItem('screw-admin-pagina')) ? localStorage.getItem('screw-admin-pagina') : 'painel',
    carregando: true, erro: '', painel: null, matrizes: [], osm: [], oss: [], pessoas: [], aparelhos: [], config: null,
    grupos: { matrizes: true, ordens: true }, menu: false,
    aberta: null, detalhe: null, abaGaveta: 'geral', modal: null,
    rel: { aba: 'todas', busca: '', maquina: null, sel: [], ordem: 'status', dir: 'asc', pag: 1 },
    os: { aba: 'abertas', tecnico: '', busca: '' }, ss: { aba: 'abertas', tecnico: '', busca: '' },
    cad: cadVazio(), cfg: { novoEmail: '' },
  };
  const raiz = document.getElementById('app');
  const render = () => montar(raiz, vApp());
  const falhou = (e) => { if (e && e.status !== 401) toast(e.message || 'Algo deu errado.', 'danger'); };
  const valor = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
  const hojeISO = () => (S.listas ? S.listas.hoje : new Date().toISOString().slice(0, 10));
  const corRel = (m) => (m.status === 'overdue' ? 't-danger' : m.status === 'due' ? 't-warning' : '');
  const conta = (st) => S.matrizes.filter((m) => m.status === st).length;
  const pessoasOpc = () => (S.listas ? S.listas.pessoas.map((p) => ({ v: p.id, t: p.nome })) : []);
  const tecnicosOpc = () => (S.listas ? S.listas.tecnicos.map((p) => ({ v: p.id, t: p.nome })) : []);

  /* ---------- Dados ---------- */
  async function carregarListas() { S.listas = await API.get('/api/listas'); }
  async function carregarPagina() {
    S.carregando = true; S.erro = ''; render();
    try {
      const p = S.pagina;
      if (p === 'painel') S.painel = await API.get('/api/painel');
      if (p === 'relacao') S.matrizes = await API.get('/api/matrizes');
      if (p === 'os-matrizes') S.osm = await API.get('/api/os-matrizes');
      if (p === 'os-servicos') S.oss = await API.get('/api/os-servicos');
      if (p === 'equipe') { [S.pessoas, S.aparelhos] = await Promise.all([API.get('/api/pessoas'), API.get('/api/aparelhos')]); }
      if (p === 'config') S.config = await API.get('/api/config');
    } catch (e) { if (e.status !== 401) S.erro = e.message; }
    S.carregando = false; render();
  }
  async function recarregar() { try { await carregarListas(); } catch (e) { /* segue */ } await carregarPagina(); }
  const ir = (p) => { if (!PAGINAS.includes(p)) return; S.pagina = p; S.aberta = null; S.detalhe = null; S.menu = false; localStorage.setItem('screw-admin-pagina', p); window.scrollTo(0, 0); carregarPagina(); };
  async function abrirMatriz(id) {
    S.aberta = id; S.detalhe = null; S.abaGaveta = 'geral'; render();
    try { S.detalhe = await API.get(`/api/matrizes/${API.u(id)}`); } catch (e) { falhou(e); S.aberta = null; }
    render();
  }

  /* ---------- Casca ---------- */
  function navItens() {
    const ab = (S.listas && S.listas.abertas) || {};
    return [
      { id: 'painel', ico: 'layout-grid', rotulo: 'Painel' },
      { id: 'matrizes', ico: 'layers', rotulo: 'Matrizes', filhos: [{ id: 'relacao', rotulo: 'Relação preventiva' }, { id: 'cadastro', rotulo: 'Cadastrar matriz' }] },
      { id: 'ordens', ico: 'clipboard-list', rotulo: 'Ordens de serviço', filhos: [{ id: 'os-matrizes', rotulo: 'OS - Matrizes', badge: ab.osm }, { id: 'os-servicos', rotulo: 'OS - Serviços', badge: ab.oss }] },
      { id: 'equipe', ico: 'users', rotulo: 'Equipe' },
      { id: 'config', ico: 'settings', rotulo: 'Configurações' },
    ];
  }
  function vNav() {
    return `<nav class="nav">${navItens().map((n) => {
      if (!n.filhos) return `<button type="button" class="nav-item${S.pagina === n.id ? ' is-active' : ''}" data-acao="ir" data-id="${n.id}" title="${n.rotulo}">${icone(n.ico)}<span class="nav-item__label">${n.rotulo}</span></button>`;
      const aberto = S.grupos[n.id], atual = n.filhos.some((f) => f.id === S.pagina);
      const soma = n.filhos.reduce((s, f) => s + (f.badge || 0), 0);
      return `<div class="nav-group${aberto ? ' is-open' : ''}${atual ? ' is-current' : ''}"><button type="button" class="nav-item" data-acao="grupo" data-id="${n.id}" title="${n.rotulo}">${icone(n.ico)}<span class="nav-item__label">${n.rotulo}</span>${!aberto && soma ? `<span class="nav-item__badge">${soma}</span>` : ''}<span class="nav-item__chev">${icone(aberto ? 'chevron-up' : 'chevron-down', 14)}</span></button><div class="nav-sub">${n.filhos.map((f) => `<button type="button" class="nav-item${S.pagina === f.id ? ' is-active' : ''}" data-acao="ir" data-id="${f.id}"><span class="nav-item__label">${f.rotulo}</span>${f.badge ? `<span class="nav-item__badge">${f.badge}</span>` : ''}</button>`).join('')}</div></div>`;
    }).join('')}</nav>`;
  }
  const logoCompleto = (cls) => `<img class="${cls} logo-light" src="${LOGO}screw-logo-transparent.png" alt="SCREW"><img class="${cls} logo-dark" src="${LOGO}screw-logo-white.png" alt="SCREW">`;
  const logoSimbolo = (cls) => `<img class="${cls} logo-light" src="${LOGO}screw-mark.png" alt="SCREW"><img class="${cls} logo-dark" src="${LOGO}screw-mark-white.png" alt="SCREW">`;
  function vSidebar() {
    return `<aside class="sidebar"><div class="sidebar__logo">${logoCompleto('logo-full')}${logoSimbolo('logo-mark')}</div>${vNav()}<div class="sidebar__foot"><span class="overline">Manutenção preventiva</span><span class="caption">v1.0 · ${S.listas && S.listas.exemplo ? 'dados de exemplo' : 'Matrizaria'}</span></div></aside>`;
  }
  function vMenuMovel() {
    return `<div class="mnav${S.menu ? ' is-open' : ''}" data-acao="menu-fechar"><div class="mnav__panel" data-acao="nada"><div class="mnav__head"><span>${logoCompleto('')}</span>${botaoIcone({ ico: 'x', rotulo: 'Fechar menu', variante: 'neutral', tam: 'sm', a: 'menu-fechar' })}</div>${vNav()}</div></div>`;
  }
  const agora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const hojeTexto = () => new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).replace('.', '');
  function vTopbar() {
    const u = S.eu || { nome: '', cargo: '' };
    return `<header class="topbar">
${botaoIcone({ ico: 'menu', rotulo: 'Abrir menu', variante: 'ghost', a: 'menu', cls: 'only-mobile' })}
<span class="only-mobile">${logoSimbolo('topbar__mark')}</span>
${campo({ ico: 'search', cheio: true, tam: 'sm', ph: 'Buscar matriz ou máquina e Enter', id: 'busca-global', cls: 'topbar__search hide-mobile', extra: { 'data-enter': 'busca-global' } })}
<div class="spacer"></div>
<div class="topbar__meta only-desktop"><div class="meta"><span class="meta__k">Hoje</span><span class="meta__v">${esc(hojeTexto())}</span></div><div class="meta"><span class="meta__k">Hora local</span><span class="meta__v" id="hora-local">${agora()}</span></div></div>
${window.UI.botaoTema()}
<div class="topbar__user">${avatar(u.nome, 36, true)}<div class="meta only-desktop"><span class="meta__v">${esc(u.nome)}</span><span class="meta__k">${esc(u.cargo)}</span></div></div>
${botaoIcone({ ico: 'log-out', rotulo: 'Sair', variante: 'ghost', a: 'sair' })}
</header>`;
  }
  const cabecalho = (titulo, sub, acoes) => `<div class="page-head"><div class="page-head__text"><h1 class="page-title">${esc(titulo)}</h1>${sub ? `<p class="page-sub">${sub}</p>` : ''}</div>${acoes ? `<div class="page-actions">${acoes}</div>` : ''}</div>`;
  const carregandoTela = (titulo) => `<div class="page">${cabecalho(titulo)}${S.erro ? aviso({ tom: 'danger', texto: S.erro, acao: botao({ texto: 'Tentar de novo', tam: 'sm', a: 'recarregar' }) }) : '<div class="loading">Carregando…</div>'}</div>`;
  const avisoExemplo = () => (S.listas && S.listas.exemplo ? aviso({ tom: 'warning', texto: 'Banco com dados de exemplo (matrizes dos protótipos). Troque pelos dados reais antes de usar no dia a dia.' }) : '');

  /* ---------- Painel ---------- */
  const MOTIVO = (it) => (it.motivo === 'pendente' ? { tom: 'warning', texto: `Pendente desde ${it.desde || 'ontem'}` } : it.motivo === 'vencida' ? { tom: 'danger', texto: 'Vencida' } : { tom: 'brand', texto: 'Maior demanda' });
  function vPlanoDoDia(p) {
    const semOS = p.deHoje && p.itens.some((x) => !x.feita && !x.os);
    const sub = p.vazio ? 'Nenhuma indicação gerada ainda' : `${p.deHoje ? 'Hoje' : 'Última indicação'}, ${p.dataTexto} · ${p.feitas} de ${p.itens.length} feitas${p.demandaDe ? ' · demanda de ' + p.demandaDe : ''}`;
    const acoes = botao({ texto: 'Gerar OS', tam: 'sm', ico: 'clipboard-list', desabilitado: !semOS, a: 'plano-os' }) + (p.deHoje ? botaoIcone({ ico: 'refresh-cw', rotulo: 'Recalcular a indicação de hoje', tam: 'sm', variante: 'ghost', a: 'plano-recalcular' }) : '');
    const vazio = p.vazio && !p.diaUtil ? 'Sem indicação em fim de semana. A próxima sai no próximo dia útil.' : 'Nenhuma matriz elegível. Confira a regra em Configurações.';
    const itens = p.itens.map((it) => {
      const mot = MOTIVO(it);
      return `<button type="button" class="dayplan__item${it.feita ? ' is-done' : ''}" data-acao="abrir" data-id="${esc(it.id)}">
<span class="dayplan__head"><span class="num-tile">${it.pos}</span><span class="cell-stack spacer"><span class="cell-title ellipsis">${esc(it.nome)}</span><span class="cell-code">${esc(it.id)} · ${esc(it.maquina)}</span></span></span>
<span class="kv-list"><span class="kv"><span>Demanda mensal (soma)</span><b>${fmtNum(it.demanda)} peças</b></span><span class="kv"><span>Referência de maior demanda</span><b>${esc(it.refMaior || '—')}</b></span><span class="kv"><span>Golpes</span><b>${it.limite ? `${fmtK(it.golpes)} / ${fmtK(it.limite)}` : fmtK(it.golpes)}</b></span></span>
${it.limite ? medidor({ valor: it.golpes, max: it.limite, bloco: true }) : ''}
<span class="dayplan__foot">${status({ tom: mot.tom, texto: mot.texto, tam: 'sm' })}${it.feita ? status({ tom: 'success', texto: 'Feita', tam: 'sm' }) : it.os ? `<span class="cell-code">${esc(it.os)}</span>` : '<span class="caption">Sem OS</span>'}</span>
</button>`;
    }).join('');
    return cartao({ titulo: 'Matrizes do dia', sub, acoes, corpo: `<div class="stack gap-8">${p.avisoDemanda ? aviso({ tom: 'warning', texto: p.avisoDemanda }) : ''}${p.itens.length ? `<div class="dayplan">${itens}</div>` : `<p class="t-muted-sm">${vazio}</p>`}</div>` });
  }
  function vGrafico(g) {
    const max = g.max || 5;
    const ticks = [max, Math.round((max * 2) / 3), Math.round(max / 3), 0];
    return `<div class="legend"><div><div class="legend__k"><i class="sw-bar"></i>Realizadas (12 sem)</div><div class="legend__v">${g.totalReal}</div></div><div><div class="legend__k"><i class="sw-line"></i>Indicadas</div><div class="legend__v">${g.totalPlan}</div></div></div>
<div class="chart"><div class="chart__axis">${ticks.map((t) => `<span>${t}</span>`).join('')}</div><div class="chart__cols">${g.semanas.map((w) => {
      const h = ((w.futura ? w.plan : w.real) / max) * 100, p = (w.plan / max) * 100;
      return `<div class="chart__col${w.atual ? ' is-current' : ''}${w.futura ? ' is-future' : ''}"><div class="chart__area"><div class="chart__bar" style="height:${h}%"></div><div class="chart__plan" style="bottom:${p}%"></div><div class="chart__tip" style="bottom:calc(${p}% + 10px)"><b>Semana ${w.s.slice(1)}${w.atual ? ' · atual' : w.futura ? ' · prevista' : ''}</b><span><i class="sw-bar"></i>Realizadas <b>${w.futura ? '—' : w.real}</b></span><span><i class="sw-line"></i>Indicadas <b>${w.plan}</b></span></div></div><span class="chart__x">${w.s}</span></div>`;
    }).join('')}</div></div>`;
  }
  const deltaKpi = (v) => (v ? { delta: String(Math.abs(v)), dir: v > 0 ? 'up' : 'down', bom: v < 0 } : {});
  function vPainel() {
    const P = S.painel;
    if (!P) return carregandoTela('Painel');
    const k = P.kpis, t = P.totais;
    const maxM = Math.max(1, ...P.porMaquina.map((x) => x.n));
    return `<div class="page">
${cabecalho('Painel', `${t.ativas} matrizes ativas · ${t.vencidas} vencidas · atualizado ${P.atualizado}`, botao({ texto: 'Atualizar', ico: 'refresh-cw', a: 'recarregar' }) + botao({ texto: 'Nova OS', variante: 'primary', ico: 'plus', a: 'nova-osm' }))}
${avisoExemplo()}
${vPlanoDoDia(P.plano)}
<div class="grid-kpi">
${indicador({ rotulo: 'Manutenções vencidas', ico: 'triangle-alert', valor: k.vencidas.valor, ...deltaKpi(k.vencidas.delta), sobre: 'Hoje', linhas: k.vencidas.linhas, a: 'ir-rel', id: 'overdue' })}
${indicador({ rotulo: 'Próximas do limite', ico: 'calendar-clock', valor: k.proximas.valor, ...deltaKpi(k.proximas.delta), sobre: 'Alerta', linhas: k.proximas.linhas.length ? k.proximas.linhas : [['Nenhuma máquina em alerta', '—']], a: 'ir-rel', id: 'due' })}
${indicador({ variante: 'highlight', rotulo: 'Cumprimento das indicações', valor: k.cumprimento.valor, unidade: k.cumprimento.temValor ? '%' : '', sobre: 'Mês', linhas: k.cumprimento.linhas })}
${indicador({ rotulo: 'Em manutenção', ico: 'wrench', valor: k.emManutencao.valor, sobre: 'Agora', linhas: k.emManutencao.linhas, a: 'ir', id: 'os-matrizes' })}
</div>
<div class="grid-2-1">
${cartao({ titulo: 'Manutenções por semana', sub: 'Preventivas realizadas e matrizes indicadas · semana atual em azul, próxima prevista', corpo: vGrafico(P.grafico) })}
${cartao({ titulo: 'Atenção', sub: 'Vencidas e próximas do limite', acoes: botao({ texto: 'Ver todas', variante: 'ghost', tam: 'sm', icoDir: 'arrow-right', a: 'ir', id: 'relacao' }), corpoCls: 'card__body--tight', corpo: P.atencao.length ? P.atencao.map((m) => `<button type="button" class="list-row" data-acao="abrir" data-id="${esc(m.id)}"><span class="list-row__main"><span class="cell-title ellipsis">${esc(m.nome)}</span><span class="cell-code">${esc(m.id)} · ${esc(m.maquina)}</span></span><span class="list-row__rel ${corRel(m)}">${esc(m.rel)}</span>${m.limite ? medidor({ valor: m.golpes, max: m.limite, bloco: true }) : ''}</button>`).join('') : '<p class="t-muted-sm">Nenhuma matriz vencida ou próxima do limite.</p>' })}
</div>
<div class="grid-1-1">
${cartao({ titulo: 'Próximas manutenções por máquina', sub: 'Vencidas, em alerta e previstas em até 30 dias', corpo: P.porMaquina.length ? `<div class="hbars">${P.porMaquina.map((x) => `<div class="hbar"><span class="hbar__name">${esc(x.m)}</span><span class="hbar__track"><span class="hbar__fill" style="width:${(x.n / maxM) * 100}%"></span></span><span class="hbar__n">${x.n}</span></div>`).join('')}</div>` : '<p class="t-muted-sm">Nenhuma manutenção prevista para os próximos 30 dias.</p>' })}
${cartao({ titulo: 'Ordens recentes', acoes: botao({ texto: 'OS - Matrizes', variante: 'ghost', tam: 'sm', icoDir: 'arrow-right', a: 'ir', id: 'os-matrizes' }), corpoCls: 'card__body--tight', corpo: P.recentes.length ? P.recentes.map((o) => `<button type="button" class="list-item" data-acao="ir" data-id="${o.grupo === 'matriz' ? 'os-matrizes' : 'os-servicos'}"><span class="ico-tile">${icone(o.grupo === 'servico' ? 'cog' : o.tipo === 'Corretiva' ? 'hammer' : 'wrench', 16)}</span><span class="list-item__main"><span class="cell-title ellipsis">${esc(o.grupo === 'servico' ? o.descricao : o.nome)}</span><span class="cell-code">${esc(o.id)} · ${esc(o.tecnico)}</span></span>${status({ tom: OS_ST[o.status].tone, texto: OS_ST[o.status].label, tam: 'sm' })}</button>`).join('') : '<p class="t-muted-sm">Nenhuma OS aberta ainda.</p>' })}
</div></div>`;
  }

  /* ---------- Relação preventiva ---------- */
  function linhasRelacao() {
    const r = S.rel, q = r.busca.toLowerCase();
    const rows = S.matrizes.filter((m) => (r.aba === 'todas' ? true : m.status === r.aba)).filter((m) => !q || (m.nome + ' ' + m.id + ' ' + m.maquina).toLowerCase().includes(q)).filter((m) => !r.maquina || m.maquina === r.maquina);
    const d = r.dir === 'asc' ? 1 : -1;
    const uso = (m) => (m.limite ? m.golpes / m.limite : 0);
    return rows.sort((a, b) => (r.ordem === 'uso' ? (uso(a) - uso(b)) * d : r.ordem === 'nome' ? a.nome.localeCompare(b.nome) * d : r.ordem === 'demanda' ? (a.demanda - b.demanda) * d : ((ORDEM_STATUS[a.status] - ORDEM_STATUS[b.status]) * d || (a.dias ?? 9999) - (b.dias ?? 9999))));
  }
  function th(rotulo, chaveOrdem, cls = '') {
    if (!chaveOrdem) return `<th class="${cls}">${rotulo}</th>`;
    const on = S.rel.ordem === chaveOrdem;
    return `<th class="is-sortable${on ? ' is-sorted' : ''} ${cls}" data-acao="ordenar" data-id="${chaveOrdem}"><span class="th-in">${rotulo}${icone(on ? (S.rel.dir === 'asc' ? 'arrow-up' : 'arrow-down') : 'chevron-down', 12)}</span></th>`;
  }
  const golpesCel = (m) => (m.status === 'inactive' || !m.limite ? `<span class="t-subtle">${m.limite ? '—' : fmtK(m.golpes)}</span>` : `<span class="cell-stack gap-2">${medidor({ valor: m.golpes, max: m.limite, mostrar: true })}<span class="cell-caption">${fmtK(m.golpes)} / ${fmtK(m.limite)}</span></span>`);
  function vTabelaRelacao(rows) {
    const sel = S.rel.sel, todas = rows.length > 0 && rows.every((m) => sel.includes(m.id)), algumas = !todas && rows.some((m) => sel.includes(m.id));
    return `<div class="table-wrap hide-mobile"><table class="table"><thead><tr><th class="col-check">${caixa({ marcado: todas, misto: algumas, a: 'sel-todas', tam: 'sm' })}</th>${th('Matriz', 'nome')}${th('Máquina')}${th('Responsável', null, 'col-desktop')}${th('Golpes', 'uso')}${th('Demanda', 'demanda', 'num col-desktop')}${th('Próxima')}${th('Status', 'status')}<th class="num"></th></tr></thead><tbody>
${rows.length ? rows.map((m) => `<tr class="is-clickable${S.aberta === m.id ? ' is-active' : ''}${sel.includes(m.id) ? ' is-selected' : ''}" data-acao="abrir" data-id="${esc(m.id)}">
<td class="col-check" data-acao="nada">${caixa({ marcado: sel.includes(m.id), a: 'sel', id: m.id, tam: 'sm' })}</td>
<td><div class="cell-stack"><span class="cell-title">${esc(m.nome)}</span><span class="cell-code">${esc(m.id)}</span></div></td>
<td>${esc(m.maquina)}</td>
<td class="col-desktop">${m.resp === '—' ? '<span class="t-subtle">—</span>' : `<span class="cell-person">${avatar(m.resp, 24)}${esc(m.resp)}</span>`}</td>
<td>${golpesCel(m)}</td>
<td class="num col-desktop">${m.demanda ? fmtNum(m.demanda) : '<span class="t-subtle">—</span>'}</td>
<td><span class="${corRel(m)}">${esc(m.rel)}</span></td>
<td>${status({ st: m.status, tam: 'sm' })}</td>
<td class="num"><span class="cell-actions">${botaoIcone({ ico: 'wrench', rotulo: 'Registrar manutenção', tam: 'sm', variante: 'ghost', a: 'registrar', id: m.id, desabilitado: m.status === 'inactive' })}${botaoIcone({ ico: 'pencil', rotulo: 'Editar matriz', tam: 'sm', variante: 'ghost', a: 'editar', id: m.id })}</span></td>
</tr>`).join('') : `<tr><td colspan="9" class="table__empty">${S.matrizes.length ? 'Nenhuma matriz encontrada com estes filtros' : 'Nenhuma matriz cadastrada. Use Nova matriz.'}</td></tr>`}
</tbody></table></div>`;
  }
  function vListaRelacao(rows) {
    return `<div class="only-mobile">${rows.map((m) => `<button type="button" class="mcard" data-acao="abrir" data-id="${esc(m.id)}"><span class="mcard__top"><span class="cell-stack"><span class="cell-title">${esc(m.nome)}</span><span class="cell-code">${esc(m.id)}</span></span>${status({ st: m.status, tam: 'sm' })}</span><span class="row">${m.tipo !== '—' ? tag(m.tipo) : ''}${tag(m.maquina)}</span>${m.status !== 'inactive' && m.limite ? medidor({ valor: m.golpes, max: m.limite, bloco: true, mostrar: true }) : ''}<span class="mcard__foot"><span>${fmtNum(m.golpes)}${m.limite ? ' / ' + fmtNum(m.limite) : ''} golpes</span><span class="${corRel(m)}">${esc(m.rel)}</span></span></button>`).join('')}</div>`;
  }
  function vRelacao() {
    if (S.carregando && !S.matrizes.length) return carregandoTela('Relação preventiva');
    const r = S.rel, todas = linhasRelacao(), n = S.matrizes.length;
    const paginas = Math.max(1, Math.ceil(todas.length / POR_PAGINA));
    if (r.pag > paginas) r.pag = paginas;
    const ini = (r.pag - 1) * POR_PAGINA, rows = todas.slice(ini, ini + POR_PAGINA);
    const maquinas = [...S.matrizes.reduce((g, m) => g.set(m.maquina, (g.get(m.maquina) || 0) + 1), new Map()).entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map((x) => x[0]);
    if (r.maquina && !maquinas.includes(r.maquina)) maquinas.unshift(r.maquina);
    return `<div class="page">
${cabecalho('Relação preventiva', `${n} matrizes · ${conta('overdue')} vencidas · ${conta('due')} próximas do limite`, botao({ texto: 'Exportar', ico: 'download', cls: 'hide-mobile', a: 'exportar-rel' }) + botao({ texto: 'Nova matriz', variante: 'primary', ico: 'plus', a: 'nova-matriz' }))}
<section class="card card--resp"><div class="card__body"><div class="grid-summary">
${indicador({ variante: 'plain', rotulo: 'Matrizes ativas', valor: n - conta('inactive') })}${indicador({ variante: 'plain', rotulo: 'Vencidas', valor: conta('overdue') })}${indicador({ variante: 'plain', rotulo: 'Próximas do limite', valor: conta('due') })}${indicador({ variante: 'plain', rotulo: 'Em manutenção', valor: conta('progress') })}${indicador({ variante: 'plain', rotulo: 'Inativas', valor: conta('inactive') })}
</div></div></section>
<section class="card card--flush">
<div class="toolbar">${abas({ valor: r.aba, a: 'aba-rel', itens: [{ id: 'todas', rotulo: 'Todas', n }, { id: 'overdue', rotulo: 'Vencidas', n: conta('overdue') }, { id: 'due', rotulo: 'Próximas', n: conta('due') }, { id: 'progress', rotulo: 'Em manutenção', n: conta('progress') }, { id: 'ok', rotulo: 'Em dia', n: conta('ok') }, { id: 'inactive', rotulo: 'Inativas', n: conta('inactive') }] })}<div class="spacer"></div>${campo({ ico: 'search', cheio: true, tam: 'sm', ph: 'Buscar por nome, código ou máquina', id: 'busca-rel', valor: r.busca, a: 'busca-rel', cls: 'toolbar__search' })}<span class="row row--nowrap hide-mobile">${botaoIcone({ ico: 'refresh-cw', rotulo: 'Atualizar', tam: 'sm', variante: 'ghost', a: 'recarregar' })}</span></div>
${maquinas.length > 1 ? `<div class="chips-row">${maquinas.map((x) => (r.maquina === x ? chipFiltro({ texto: 'Máquina: ' + x, a: 'maquina', id: '' }) : chip({ texto: x, a: 'maquina', id: x }))).join('')}</div>` : ''}
${r.sel.length ? `<div class="bulkbar"><span>${r.sel.length} selecionada${r.sel.length > 1 ? 's' : ''}</span><div class="spacer"></div>${botao({ texto: 'Gerar OS', tam: 'sm', ico: 'clipboard-list', a: 'gerar-os-sel' })}${botaoIcone({ ico: 'x', rotulo: 'Limpar seleção', tam: 'sm', variante: 'ghost', cls: 'icon-btn--on-inverse', a: 'sel-limpar' })}</div>` : ''}
<div class="divider-top">${vTabelaRelacao(rows)}${vListaRelacao(rows)}</div>
<div class="card-foot">${paginacao({ pagina: r.pag, total: paginas, resumo: todas.length ? `${ini + 1}–${ini + rows.length} de ${todas.length} matrizes` : '0 matrizes', a: 'pag' })}</div>
</section></div>`;
  }

  /* ---------- Gaveta da matriz ---------- */
  function vGaveta() {
    if (!S.aberta) return '';
    const m = S.detalhe;
    const cab = (over, titulo) => `<header class="drawer__head"><div><div class="drawer__over">${over}</div><h2 class="drawer__title">${titulo}</h2></div><div class="drawer__actions"><span class="row row--nowrap hide-mobile">${botaoIcone({ ico: 'chevron-up', rotulo: 'Anterior', tam: 'sm', variante: 'ghost', a: 'passo-gaveta', id: -1 })}${botaoIcone({ ico: 'chevron-down', rotulo: 'Próxima', tam: 'sm', variante: 'ghost', a: 'passo-gaveta', id: 1 })}</span>${botaoIcone({ ico: 'x', rotulo: 'Fechar', variante: 'neutral', tam: 'sm', a: 'fechar-gaveta' })}</div></header>`;
    if (!m) return `<div class="overlay overlay--drawer" data-acao="fechar-gaveta"><aside class="drawer" role="dialog" aria-modal="true" data-acao="nada"><span class="drawer__handle"></span>${cab(`Matriz · ${esc(S.aberta)}`, 'Carregando…')}<div class="drawer__body"><div class="loading">Carregando…</div></div></aside></div>`;
    const a = S.abaGaveta;
    const pct = m.limite ? Math.round((m.golpes / m.limite) * 100) : 0;
    const plano = m.criterio === 'golpes' ? `A cada ${fmtNum(m.limite)} golpes` : m.criterio === 'dias' ? `A cada ${m.intervalo} dias` : `A cada ${fmtNum(m.limite)} golpes ou ${m.intervalo} dias`;
    const geral = `<dl class="dl">${[['Máquina', m.maquina], ['Estação', m.estacao], ['Responsável', m.resp], ['Plano', plano], ['Última manutenção', m.ultima], ['Próxima prevista', m.proxima + (m.proximaManual ? ' (reprogramada)' : '')], ['Alerta antecipado', `${m.alerta}% do limite`], ['Demanda mensal (soma)', m.demanda ? `${fmtNum(m.demanda)} peças` : '—'], ['Referência de maior demanda', m.refMaior || '—']].map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
    const lista = m.checklist.length ? `<div class="stack gap-6">${m.checklist.map((c) => `<div class="row t-body-sm"><span class="bullet"></span>${esc(c)}</div>`).join('')}</div>` : '<p class="t-muted-sm">Sem itens. Inclua pelo editor da matriz.</p>';
    const hist = m.historico.length ? `<div class="stack">${m.historico.map((h, i) => `<div class="timeline__item"><span class="timeline__rail"><span class="timeline__dot${h.tipo === 'Corretiva' ? ' timeline__dot--warn' : ''}"></span>${i < m.historico.length - 1 ? '<span class="timeline__line"></span>' : ''}</span><span class="timeline__content"><span class="cell-title ellipsis">${esc(h.tipo)} · ${esc(h.data)}</span><span class="caption">${esc(h.tec)}${h.os ? ' · ' + esc(h.os) : ''}${h.tempoMin ? ' · ' + h.tempoMin + ' min' : ''}</span><span class="t-body-sm">${esc(h.nota)}</span>${h.fotos.length ? `<span class="photos">${h.fotos.map((f) => `<a class="photo" href="/fotos/${esc(f)}" target="_blank" rel="noopener"><img src="/fotos/${esc(f)}" alt="Foto da manutenção"></a>`).join('')}</span>` : ''}</span></div>`).join('')}</div>` : '<p class="t-muted-sm">Nenhuma manutenção registrada.</p>';
    const dem = m.refs.length ? `<div class="stack">${m.refs.map((r) => `<div class="list-item"><span class="list-item__main"><span class="cell-title ellipsis">${esc(r.codigo)}</span><span class="cell-code">${esc(r.descricao || 'Sem descrição')}</span></span><span class="t-strong">${fmtNum(r.mensal)}</span></div>`).join('')}<div class="resumo__total"><span class="t-muted">Soma mensal</span><b class="t-strong">${fmtNum(m.demanda)} peças</b></div></div>` : '<p class="t-muted-sm">Nenhuma referência ligada a esta matriz. Sem referência, a matriz não entra pela demanda.</p>';
    return `<div class="overlay overlay--drawer" data-acao="fechar-gaveta"><aside class="drawer" role="dialog" aria-modal="true" data-acao="nada">
<span class="drawer__handle"></span>
${cab(`Matriz · ${esc(m.id)}`, esc(m.nome))}
<div class="drawer__body" data-rolagem="gaveta">
<div class="row">${status({ st: m.status, texto: m.status === 'overdue' ? m.rel : undefined })}${m.tipo !== '—' ? tag(m.tipo) : ''}${m.material !== '—' ? tag(m.material) : ''}</div>
${m.status !== 'inactive' && m.limite ? `<div class="box-sunken"><div class="row-between"><span class="t-muted-sm">Golpes desde a última manutenção</span><span class="usage-pct ${corRel(m)}">${pct}%</span></div><div class="usage-big">${fmtNum(m.golpes)} <span class="t-muted-sm">/ ${fmtNum(m.limite)}</span></div>${medidor({ valor: m.golpes, max: m.limite, bloco: true, alt: '6' })}</div>` : ''}
${abas({ pill: true, valor: a, a: 'aba-gaveta', itens: [{ id: 'geral', rotulo: 'Geral' }, { id: 'checklist', rotulo: 'Checklist', n: m.checklist.length }, { id: 'historico', rotulo: 'Histórico', n: m.historico.length }, { id: 'demanda', rotulo: 'Demanda', n: m.refs.length }] })}
${a === 'geral' ? geral : a === 'checklist' ? lista : a === 'historico' ? hist : dem}
</div>
<footer class="drawer__foot">${botao({ texto: 'Reprogramar', variante: 'neutral', ico: 'calendar', desabilitado: m.status === 'inactive', a: 'reprogramar' })}<div class="spacer"></div>${botaoIcone({ ico: 'pencil', rotulo: 'Editar matriz', a: 'editar', id: m.id })}${botao({ texto: 'Registrar manutenção', variante: 'dark', ico: 'wrench', desabilitado: m.status === 'inactive', a: 'registrar', id: m.id })}</footer>
</aside></div>`;
  }

  /* ---------- Modais ---------- */
  const modalCasca = (titulo, desc, corpo, rodape, largo) => `<div class="overlay overlay--modal" data-acao="fechar-modal"><div class="modal${largo ? ' modal--wide' : ''}" role="dialog" aria-modal="true" data-acao="nada">
<header class="modal__head"><div><h2 class="modal__title">${esc(titulo)}</h2>${desc ? `<p class="modal__desc">${esc(desc)}</p>` : ''}</div>${botaoIcone({ ico: 'x', rotulo: 'Fechar', variante: 'neutral', tam: 'sm', a: 'fechar-modal' })}</header>
<div class="modal__body" data-rolagem="modal">${corpo}</div>
<footer class="modal__foot">${rodape}</footer></div></div>`;
  const cancelar = () => botao({ texto: 'Cancelar', variante: 'neutral', a: 'fechar-modal' });
  function vModal() {
    const M = S.modal;
    if (!M) return '';
    const f = M.f || {}, e = M.erros || {}, topo = M.erro ? aviso({ tom: 'danger', texto: M.erro }) : '';
    if (M.tipo === 'registrar') {
      const m = M.matriz, total = m.checklist.length, feitos = M.checks.filter(Boolean).length;
      return modalCasca('Registrar manutenção', `${m.id} · ${m.nome}${M.os ? ' · ' + M.os : ''}`, `${topo}
<div class="form-grid-auto">${campo({ rotulo: 'Data', tipo: 'date', valor: f.data, ico: 'calendar', id: 'reg-data', a: 'm:data', extra: { max: hojeISO() } })}${selecao({ rotulo: 'Técnico', obrig: true, ph: 'Selecione…', valor: f.tecnico, opcoes: pessoasOpc(), id: 'reg-tec', a: 'm:tecnico', erro: e.tecnico })}${campo({ rotulo: 'Golpes no contador', valor: f.golpesContador, sufixo: 'golpes', id: 'reg-golpes', a: 'm:golpesContador', extra: { inputmode: 'numeric' } })}${campo({ rotulo: 'Tempo gasto', valor: f.tempoMin, sufixo: 'min', ico: 'timer', id: 'reg-tempo', a: 'm:tempoMin', extra: { inputmode: 'numeric' } })}</div>
${M.os ? '' : `<div class="field"><span class="field__label">Tipo</span>${segmentado({ opcoes: ['Preventiva', 'Corretiva'], valor: f.tipo, a: 'm-tipo' })}</div>`}
${total ? `<div class="stack gap-5"><div class="row-between field__label"><span>Checklist</span><span>${feitos}/${total}</span></div>${m.checklist.map((c, i) => caixa({ rotulo: c, marcado: M.checks[i], a: 'check-reg', id: i })).join('')}</div>` : ''}
${areaTexto({ rotulo: 'Observações', id: 'reg-obs', ph: 'Desgaste medido, peças trocadas, anomalias…', valor: f.obs, a: 'm:obs' })}
<p class="caption">Ao salvar, os golpes da matriz voltam a zero e ela fica Em dia a partir da data informada.</p>`,
      cancelar() + botao({ texto: M.salvando ? 'Salvando…' : 'Salvar e concluir', variante: 'dark', ico: 'check', desabilitado: feitos < total || M.salvando, a: 'salvar-registro' }), true);
    }
    if (M.tipo === 'reprogramar') {
      return modalCasca('Reprogramar manutenção', `${M.matriz.id} · ${M.matriz.nome}`, `${topo}${campo({ rotulo: 'Nova data', tipo: 'date', valor: f.data, ico: 'calendar', id: 'rep-data', a: 'm:data', erro: e.data })}${areaTexto({ rotulo: 'Motivo', id: 'rep-motivo', linhas: 2, ph: 'Ex.: aguardando peça', valor: f.motivo, a: 'm:motivo' })}${M.matriz.proximaManual ? `<p class="caption">Esta matriz já está reprogramada. ${botao({ texto: 'Voltar ao cálculo automático', variante: 'ghost', tam: 'sm', a: 'reprogramar-limpar' })}</p>` : ''}`,
      cancelar() + botao({ texto: 'Salvar', variante: 'dark', a: 'salvar-reprogramar', desabilitado: M.salvando }));
    }
    if (M.tipo === 'nova-osm') {
      return modalCasca('Nova OS - Matriz', 'Manutenção preventiva ou corretiva de uma matriz', `${topo}
${selecao({ rotulo: 'Matriz', obrig: true, ph: 'Selecione…', valor: f.matriz, opcoes: (S.listas ? S.listas.matrizes : []).map((m) => ({ v: m.id, t: `${m.id} · ${m.nome}` })), id: 'osm-matriz', a: 'm:matriz', erro: e.matriz })}
<div class="field"><span class="field__label">Tipo</span>${segmentado({ opcoes: ['Preventiva', 'Corretiva'], valor: f.tipo, a: 'm-tipo' })}</div>
<div class="form-grid">${selecao({ rotulo: 'Técnico', valor: f.tecnico, opcoes: [{ v: 'responsavel', t: 'Responsável da matriz' }, { v: '', t: 'Sem técnico' }, ...tecnicosOpc()], id: 'osm-tec', a: 'm:tecnico' })}${campo({ rotulo: 'Prazo', tipo: 'date', valor: f.prazo, ico: 'calendar', id: 'osm-prazo', a: 'm:prazo' })}</div>
${areaTexto({ rotulo: 'Descrição', id: 'osm-desc', linhas: 2, ph: 'Ex.: lascamento na aresta de corte', valor: f.descricao, a: 'm:descricao' })}`,
      cancelar() + botao({ texto: 'Abrir OS', variante: 'dark', ico: 'check', a: 'salvar-osm', desabilitado: M.salvando }));
    }
    if (M.tipo === 'oss') {
      const nova = !M.id;
      const servs = (S.listas ? S.listas.tiposServico : []);
      return modalCasca(nova ? 'Nova OS - Serviço' : `OS - Serviço · ${M.id}`, nova ? 'Usinagem, retífica, fresa e outros serviços pedidos à Matrizaria' : `Aberta em ${M.abertura}`, `${topo}
<div class="field"><span class="field__label">Serviço<span class="field__req"> *</span></span><div class="row">${servs.map((s) => chip({ texto: s, selecionado: f.servico === s, a: 'm-servico', id: s })).join('')}</div>${e.servico ? `<span class="field__error">${esc(e.servico)}</span>` : ''}</div>
${areaTexto({ rotulo: 'Descrição', obrig: true, id: 'oss-desc', linhas: 3, ph: 'O que precisa ser feito, peça, desenho, medidas…', valor: f.descricao, a: 'm:descricao', erro: e.descricao })}
<div class="form-grid">${campo({ rotulo: 'Solicitante', id: 'oss-sol', valor: f.solicitante, a: 'm:solicitante', ico: 'user' })}${selecao({ rotulo: 'Setor', ph: 'Selecione…', valor: f.setor, opcoes: S.listas ? S.listas.setores : [], id: 'oss-setor', a: 'm:setor' })}${campo({ rotulo: 'Quantidade', valor: f.quantidade, sufixo: 'peças', id: 'oss-qtd', a: 'm:quantidade', extra: { inputmode: 'numeric' } })}${campo({ rotulo: 'Prazo', obrig: true, tipo: 'date', valor: f.prazo, ico: 'calendar', id: 'oss-prazo', a: 'm:prazo', erro: e.prazo })}</div>
${selecao({ rotulo: 'Técnico', valor: f.tecnico, opcoes: [{ v: '', t: 'Sem técnico' }, ...tecnicosOpc()], id: 'oss-tec', a: 'm:tecnico' })}
${nova ? '' : areaTexto({ rotulo: 'Observações', id: 'oss-obs', linhas: 2, valor: f.observacoes, a: 'm:observacoes' })}`,
      cancelar() + botao({ texto: nova ? 'Abrir OS' : 'Salvar', variante: 'dark', ico: 'check', a: 'salvar-oss', desabilitado: M.salvando }), true);
    }
    if (M.tipo === 'pessoa') {
      const niveis = S.eu.nivel === 1 ? NIVEIS : NIVEIS.filter((x) => x.v === 3);
      return modalCasca(M.id ? 'Editar pessoa' : 'Adicionar pessoa', 'Nome e nível vêm daqui; a pessoa não escolhe.', `${topo}
<div class="form-grid">${campo({ rotulo: 'Nome', obrig: true, id: 'p-nome', valor: f.nome, a: 'm:nome', erro: e.nome })}${campo({ rotulo: 'Matrícula', obrig: true, id: 'p-mat', valor: f.matricula, a: 'm:matricula', mono: true, erro: e.matricula })}</div>
<div class="field"><span class="field__label">Nível</span>${segmentado({ opcoes: niveis.map((x) => x.t), valor: (NIVEIS.find((x) => x.v === Number(f.nivel)) || NIVEIS[0]).t, a: 'm-nivel' })}<span class="field__hint">${Number(f.nivel) === 3 ? 'Entra no tablet da Matrizaria com PIN.' : 'Cria a conta em /entrar com matrícula, e-mail e senha.'}</span></div>
${campo({ rotulo: 'Cargo', id: 'p-cargo', valor: f.cargo, a: 'm:cargo', ph: 'Ex.: Técnico de matrizaria' })}
${chave({ rotulo: 'Acesso liberado', desc: 'Desligado, a pessoa não entra no sistema', ligado: f.liberado, a: 'm-liberado' })}`,
      cancelar() + botao({ texto: 'Salvar', variante: 'dark', ico: 'check', a: 'salvar-pessoa', desabilitado: M.salvando }));
    }
    if (M.tipo === 'pin') {
      return modalCasca('Definir PIN', `${M.pessoa.nome} · entra no tablet da Matrizaria com este PIN`, `${topo}
<div class="form-grid">${campo({ rotulo: 'PIN (6 números)', tipo: 'password', id: 'pin-1', a: 'm:pin', valor: f.pin, erro: e.pin, mono: true, extra: { inputmode: 'numeric', maxlength: 6, autocomplete: 'new-password' } })}${campo({ rotulo: 'Repetir PIN', tipo: 'password', id: 'pin-2', a: 'm:pin2', valor: f.pin2, mono: true, extra: { inputmode: 'numeric', maxlength: 6, autocomplete: 'new-password' } })}</div>
<p class="caption">Combine o PIN com o técnico pessoalmente. Evite sequências e números repetidos.</p>`,
      cancelar() + botao({ texto: 'Salvar PIN', variante: 'dark', ico: 'check', a: 'salvar-pin', desabilitado: M.salvando }));
    }
    if (M.tipo === 'confirmar') {
      return modalCasca(M.titulo, null, `${topo}<p class="t-body-sm">${esc(M.texto)}</p>`, cancelar() + botao({ texto: M.botao, variante: 'destructive', a: 'confirmar-sim', desabilitado: M.salvando }));
    }
    return '';
  }

  /* ---------- OS - Matrizes ---------- */
  function acaoOSM(o) {
    if (o.status === 'aberta') return botao({ texto: 'Iniciar', variante: 'soft', tam: 'sm', ico: 'play', a: 'osm-status', id: o.id, extra: { 'data-st': 'andamento' } }) + botaoIcone({ ico: 'x', rotulo: 'Cancelar OS', tam: 'sm', variante: 'ghost', a: 'osm-cancelar', id: o.id });
    if (o.status === 'andamento') return botao({ texto: 'Concluir', variante: 'dark', tam: 'sm', ico: 'check', a: 'osm-concluir', id: o.id }) + botaoIcone({ ico: 'circle-pause', rotulo: 'Aguardando peça', tam: 'sm', variante: 'ghost', a: 'osm-status', id: o.id, extra: { 'data-st': 'peca' } });
    if (o.status === 'peca') return botao({ texto: 'Peça recebida', tam: 'sm', a: 'osm-status', id: o.id, extra: { 'data-st': 'andamento' } });
    return botao({ texto: 'Ver matriz', variante: 'ghost', tam: 'sm', ico: 'eye', a: 'abrir', id: o.matriz });
  }
  const prazoCel = (o) => `<span class="${o.prazoHoje || o.atrasada ? 't-danger' : ''}">${o.prazoHoje ? 'Hoje' : o.prazo}${o.atrasada ? ' · atrasada' : ''}</span>`;
  const pessoaCel = (nome, tam = 24) => (nome === 'Sem técnico' ? '<span class="t-subtle">Sem técnico</span>' : `<span class="cell-person">${avatar(nome, tam)}${esc(nome)}</span>`);
  function filtroOS(lista, F) {
    const q = F.busca.toLowerCase(), a = F.aba;
    return lista.filter((o) => (a === 'todas' ? true : a === 'abertas' ? ABERTA(o) : a === 'concluidas' ? o.status === 'concluida' : o.status === a))
      .filter((o) => !F.tecnico || o.tecnicoId === F.tecnico)
      .filter((o) => !q || Object.values(o).join(' ').toLowerCase().includes(q));
  }
  function abasOS(lista, F, a) {
    const c = (s) => lista.filter((o) => o.status === s).length;
    return abas({ valor: F.aba, a, itens: [{ id: 'abertas', rotulo: 'Abertas', n: lista.filter(ABERTA).length }, { id: 'andamento', rotulo: 'Em andamento', n: c('andamento') }, { id: 'peca', rotulo: 'Aguardando peça', n: c('peca') }, { id: 'concluidas', rotulo: 'Concluídas', n: c('concluida') }, { id: 'todas', rotulo: 'Todas', n: lista.length }] });
  }
  function resumoOS(lista) {
    const c = (s) => lista.filter((o) => o.status === s).length;
    return `<section class="card card--resp"><div class="card__body"><div class="grid-summary">${indicador({ variante: 'plain', rotulo: 'Abertas', valor: c('aberta') })}${indicador({ variante: 'plain', rotulo: 'Em andamento', valor: c('andamento') })}${indicador({ variante: 'plain', rotulo: 'Aguardando peça', valor: c('peca') })}${indicador({ variante: 'plain', rotulo: 'Concluídas', valor: c('concluida') })}${indicador({ variante: 'plain', rotulo: 'Atrasadas', valor: lista.filter((o) => o.atrasada).length })}</div></div></section>`;
  }
  const filtroTecnico = (F, a) => selecao({ opcoes: [{ v: '', t: 'Todos os técnicos' }, ...tecnicosOpc()], valor: F.tecnico, tam: 'sm', id: `${a}-tec`, a, cls: 'hide-mobile os-filtro' });
  function vOSM() {
    if (S.carregando && !S.osm.length) return carregandoTela('OS - Matrizes');
    const lista = S.osm, rows = filtroOS(lista, S.os);
    return `<div class="page">
${cabecalho('OS - Matrizes', `${lista.filter(ABERTA).length} abertas · ${lista.filter((o) => o.status === 'peca').length} aguardando peça · prazo de hoje: ${lista.filter((o) => o.prazoHoje).length}`, botao({ texto: 'Exportar', ico: 'download', cls: 'hide-mobile', a: 'exportar-osm' }) + botao({ texto: 'Nova OS', variante: 'primary', ico: 'plus', a: 'nova-osm' }))}
${resumoOS(lista)}
<section class="card card--flush">
<div class="toolbar">${abasOS(lista, S.os, 'aba-osm')}<div class="spacer"></div>${filtroTecnico(S.os, 'osm-tecnico')}${campo({ ico: 'search', cheio: true, tam: 'sm', ph: 'Buscar OS ou matriz', id: 'busca-osm', valor: S.os.busca, a: 'busca-osm', cls: 'toolbar__search toolbar__search--sm' })}</div>
<div class="divider-top">
<div class="table-wrap hide-mobile"><table class="table"><thead><tr><th>OS</th><th>Matriz</th><th>Técnico</th><th class="col-desktop">Abertura</th><th>Prazo</th><th>Status</th><th class="num">Ações</th></tr></thead><tbody>
${rows.length ? rows.map((o) => `<tr class="is-clickable" data-acao="abrir" data-id="${esc(o.matriz)}"><td><div class="cell-stack"><span class="cell-os">${esc(o.id)}</span><span class="${o.tipo === 'Corretiva' ? 't-warning-xs' : 'caption'}">${o.tipo}${o.origem === 'plano' ? ' · do dia' : ''}</span></div></td><td><div class="cell-stack"><span class="cell-title">${esc(o.nome)}</span><span class="cell-code">${esc(o.matriz)} · ${esc(o.maquina)}</span></div></td><td>${pessoaCel(o.tecnico)}</td><td class="col-desktop">${o.abertura}</td><td>${prazoCel(o)}</td><td>${status({ tom: OS_ST[o.status].tone, texto: OS_ST[o.status].label, tam: 'sm' })}</td><td class="num" data-acao="nada"><span class="cell-actions">${acaoOSM(o)}</span></td></tr>`).join('') : '<tr><td colspan="7" class="table__empty">Nenhuma OS nesta aba</td></tr>'}
</tbody></table></div>
<div class="only-mobile">${rows.map((o) => `<div class="mcard"><div class="mcard__top"><div class="cell-stack"><span class="cell-title">${esc(o.nome)}</span><span class="cell-code">${esc(o.id)} · ${o.tipo}</span></div>${status({ tom: OS_ST[o.status].tone, texto: OS_ST[o.status].label, tam: 'sm' })}</div><div class="mcard__foot"><span>${esc(o.tecnico)} · prazo ${o.prazoHoje ? 'hoje' : o.prazo}</span><span class="row row--nowrap">${acaoOSM(o)}</span></div></div>`).join('')}</div>
</div>
<div class="card-foot">${paginacao({ pagina: 1, total: 1, resumo: `${rows.length} ordens` })}</div>
</section></div>`;
  }

  /* ---------- OS - Serviços ---------- */
  function acaoOSS(o) {
    if (o.status === 'aberta') return botao({ texto: 'Iniciar', variante: 'soft', tam: 'sm', ico: 'play', a: 'oss-status', id: o.id, extra: { 'data-st': 'andamento' } }) + botaoIcone({ ico: 'x', rotulo: 'Cancelar OS', tam: 'sm', variante: 'ghost', a: 'oss-cancelar', id: o.id });
    if (o.status === 'andamento') return botao({ texto: 'Concluir', variante: 'dark', tam: 'sm', ico: 'check', a: 'oss-status', id: o.id, extra: { 'data-st': 'concluida' } }) + botaoIcone({ ico: 'circle-pause', rotulo: 'Aguardando peça', tam: 'sm', variante: 'ghost', a: 'oss-status', id: o.id, extra: { 'data-st': 'peca' } });
    if (o.status === 'peca') return botao({ texto: 'Peça recebida', tam: 'sm', a: 'oss-status', id: o.id, extra: { 'data-st': 'andamento' } });
    return `<span class="caption">${o.concluidaEm || ''}</span>`;
  }
  function vOSS() {
    if (S.carregando && !S.oss.length) return carregandoTela('OS - Serviços');
    const lista = S.oss, rows = filtroOS(lista, S.ss);
    return `<div class="page">
${cabecalho('OS - Serviços', `${lista.filter(ABERTA).length} abertas · usinagem, retífica, fresa e outros pedidos à Matrizaria`, botao({ texto: 'Exportar', ico: 'download', cls: 'hide-mobile', a: 'exportar-oss' }) + botao({ texto: 'Nova OS', variante: 'primary', ico: 'plus', a: 'nova-oss' }))}
${resumoOS(lista)}
<section class="card card--flush">
<div class="toolbar">${abasOS(lista, S.ss, 'aba-oss')}<div class="spacer"></div>${filtroTecnico(S.ss, 'oss-tecnico')}${campo({ ico: 'search', cheio: true, tam: 'sm', ph: 'Buscar OS, serviço ou solicitante', id: 'busca-oss', valor: S.ss.busca, a: 'busca-oss', cls: 'toolbar__search toolbar__search--sm' })}</div>
<div class="divider-top">
<div class="table-wrap hide-mobile"><table class="table"><thead><tr><th>OS</th><th>Serviço</th><th>Técnico</th><th class="col-desktop">Abertura</th><th>Prazo</th><th>Status</th><th class="num">Ações</th></tr></thead><tbody>
${rows.length ? rows.map((o) => `<tr class="is-clickable" data-acao="editar-oss" data-id="${esc(o.id)}"><td><div class="cell-stack"><span class="cell-os">${esc(o.id)}</span><span class="caption">${esc(o.servico)}</span></div></td><td><div class="cell-stack"><span class="cell-title">${esc(o.descricao)}</span><span class="cell-code">${esc(o.solicitante)} · ${esc(o.setor)} · ${o.quantidade} pç</span></div></td><td>${pessoaCel(o.tecnico)}</td><td class="col-desktop">${o.abertura}</td><td>${prazoCel(o)}</td><td>${status({ tom: OS_ST[o.status].tone, texto: OS_ST[o.status].label, tam: 'sm' })}</td><td class="num" data-acao="nada"><span class="cell-actions">${acaoOSS(o)}</span></td></tr>`).join('') : '<tr><td colspan="7" class="table__empty">Nenhuma OS nesta aba</td></tr>'}
</tbody></table></div>
<div class="only-mobile">${rows.map((o) => `<div class="mcard"><button type="button" class="mcard__top" data-acao="editar-oss" data-id="${esc(o.id)}"><div class="cell-stack"><span class="cell-title">${esc(o.descricao)}</span><span class="cell-code">${esc(o.id)} · ${esc(o.servico)}</span></div>${status({ tom: OS_ST[o.status].tone, texto: OS_ST[o.status].label, tam: 'sm' })}</button><div class="mcard__foot"><span>${esc(o.tecnico)} · prazo ${o.prazoHoje ? 'hoje' : o.prazo}</span><span class="row row--nowrap">${acaoOSS(o)}</span></div></div>`).join('')}</div>
</div>
<div class="card-foot">${paginacao({ pagina: 1, total: 1, resumo: `${rows.length} ordens` })}</div>
</section></div>`;
  }

  /* ---------- Cadastrar / editar matriz ---------- */
  const obrigatorios = (f) => [['codigo', f.codigo], ['descricao', f.descricao], ['maquina', f.maquina], ['limiteGolpes', f.criterio === 'dias' || f.limiteGolpes], ['intervaloDias', f.criterio === 'golpes' || f.intervaloDias], ['responsavel', f.responsavel]];
  function vCadastro() {
    const k = S.cad, f = k.f, p = k.passo, e = k.erros, L = S.listas || {};
    const obr = obrigatorios(f), preenchidos = obr.filter(([, v]) => v).length;
    const respNome = (L.pessoas || []).find((x) => x.id === f.responsavel);
    const resumo = [['Código', f.codigo || '—'], ['Descrição', f.descricao || '—'], ['Tipo', f.tipo || '—'], ['Máquina', f.maquina || '—'], ['Plano', f.criterio === 'dias' ? `${f.intervaloDias || '—'} dias` : f.criterio === 'golpes' ? `${fmtNum(f.limiteGolpes)} golpes` : `${fmtNum(f.limiteGolpes)} golpes / ${f.intervaloDias || '—'} dias`], ['Alerta', f.alertaPct], ['Responsável', respNome ? respNome.nome : '—'], ['Referências', f.referencias.length ? f.referencias.join(', ') : '—'], ['Checklist', `${k.itens.length} itens`]];
    let corpo;
    if (p === 0) corpo = `<h2 class="section-title">Identificação</h2>
<div class="form-grid">${campo({ rotulo: 'Código', obrig: true, ph: 'Ex.: MTZ-0312', valor: f.codigo, id: 'cad-codigo', a: 'codigo', mono: true, desabilitado: !!k.editando, erro: e.codigo, dica: k.editando ? 'O código não muda depois de cadastrado' : undefined })}${campo({ rotulo: 'Descrição', obrig: true, ph: 'Ex.: Matriz de 1º golpe M8', valor: f.descricao, id: 'cad-nome', a: 'descricao', erro: e.descricao })}</div>
${(L.tiposMatriz || []).length ? `<div class="field"><span class="field__label">Tipo</span><div class="row">${L.tiposMatriz.map((t) => chip({ texto: t, selecionado: f.tipo === t, a: 'tipo', id: t })).join('')}</div></div>` : campo({ rotulo: 'Tipo', valor: f.tipo, id: 'cad-tipo', a: 'tipo-txt' })}
<div class="form-grid">${selecao({ rotulo: 'Máquina', obrig: true, ph: 'Selecione…', valor: f.maquina, opcoes: L.maquinas || [], id: 'cad-maquina', a: 'maquina', erro: e.maquina, dica: (L.maquinas || []).length ? undefined : 'Cadastre as máquinas em Configurações' })}${campo({ rotulo: 'Estação / posição', ph: 'Ex.: Estação 2', valor: f.estacao, id: 'cad-estacao', a: 'estacao' })}${selecao({ rotulo: 'Material', ph: 'Selecione…', valor: f.material, opcoes: L.materiais || [], id: 'cad-material', a: 'material' })}<div class="field"><span class="field__label">Situação</span>${segmentado({ opcoes: ['Ativa', 'Inativa'], valor: f.situacao, a: 'situacao' })}</div></div>
<div class="field"><span class="field__label">Referências (produtos que usam esta matriz)</span><div class="row row--end">${campo({ ph: 'Código da referência no CIGAM', valor: k.novaRef, id: 'cad-ref', a: 'novaRef', cls: 'spacer', mono: true, extra: { 'data-enter': 'add-ref' } })}${botao({ texto: 'Adicionar', ico: 'plus', desabilitado: !k.novaRef, a: 'add-ref' })}</div>${f.referencias.length ? `<div class="chips-row chips-row--wrap gap-4">${f.referencias.map((r) => chipFiltro({ texto: r, a: 'rem-ref', id: r })).join('')}</div>` : '<span class="field__hint">A demanda mensal da matriz é a soma das referências daqui.</span>'}</div>`;
    else if (p === 1) corpo = `<h2 class="section-title">Plano preventivo</h2>
<div class="stack gap-6"><span class="field__label">Critério de vencimento</span>${radio({ nome: 'crit', valor: 'golpes', rotulo: 'Por golpes', desc: 'Vence ao atingir o limite de golpes do contador', marcado: f.criterio === 'golpes', a: 'criterio' })}${radio({ nome: 'crit', valor: 'dias', rotulo: 'Por calendário', desc: 'Vence a cada intervalo fixo de dias', marcado: f.criterio === 'dias', a: 'criterio' })}${radio({ nome: 'crit', valor: 'ambos', rotulo: 'O que vencer primeiro', desc: 'Recomendado para matrizes de forjamento', marcado: f.criterio === 'ambos', a: 'criterio' })}</div>
<div class="form-grid">${campo({ rotulo: 'Limite de golpes', obrig: f.criterio !== 'dias', valor: f.limiteGolpes, sufixo: 'golpes', desabilitado: f.criterio === 'dias', id: 'cad-limite', a: 'limiteGolpes', erro: e.limiteGolpes, extra: { inputmode: 'numeric' } })}${campo({ rotulo: 'Intervalo', obrig: f.criterio !== 'golpes', valor: f.intervaloDias, sufixo: 'dias', desabilitado: f.criterio === 'golpes', id: 'cad-intervalo', a: 'intervaloDias', erro: e.intervaloDias, extra: { inputmode: 'numeric' } })}<div class="field"><span class="field__label">Alerta antecipado</span>${segmentado({ opcoes: ['70%', '80%', '90%'], valor: f.alertaPct, a: 'alerta' })}<span class="field__hint">Status muda para “Próxima” neste ponto</span></div>${selecao({ rotulo: 'Responsável', obrig: true, ph: 'Selecione…', valor: f.responsavel, opcoes: pessoasOpc(), id: 'cad-resp', a: 'responsavel', erro: e.responsavel })}</div>
${chave({ rotulo: 'Notificar responsável', desc: 'Guardado para a fase 2: e-mail quando entrar em alerta e ao vencer', ligado: f.notificar, a: 'notif' })}
<h2 class="section-title">Situação atual</h2>
<div class="form-grid">${campo({ rotulo: 'Golpes desde a última manutenção', valor: f.golpes, sufixo: 'golpes', id: 'cad-golpes', a: 'golpes', extra: { inputmode: 'numeric' } })}${campo({ rotulo: 'Última manutenção', tipo: 'date', valor: f.ultima, id: 'cad-ultima', a: 'ultima', extra: { max: hojeISO() } })}</div>`;
    else if (p === 2) corpo = `<h2 class="section-title">Checklist da manutenção</h2>
<div class="stack">${k.itens.map((it, i) => `<div class="checklist-row"><span class="num-tile">${i + 1}</span><span class="spacer t-strong">${esc(it)}</span>${botaoIcone({ ico: 'trash-2', rotulo: 'Remover', tam: 'sm', variante: 'ghost', a: 'rem-item', id: i })}</div>`).join('')}</div>
<div class="row row--end">${campo({ rotulo: 'Novo item', ph: 'Ex.: Verificar folga do porta-matriz', valor: k.novo, id: 'cad-novo', a: 'novo', cls: 'spacer', extra: { 'data-enter': 'add-item' } })}${botao({ texto: 'Adicionar', ico: 'plus', desabilitado: !k.novo, a: 'add-item' })}</div>`;
    else corpo = `<h2 class="section-title">Revisão</h2>${Object.keys(e).length ? aviso({ tom: 'danger', texto: Object.values(e)[0] }) : ''}<dl class="dl dl--wide">${resumo.map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join('')}</dl>${preenchidos < obr.length ? status({ tom: 'warning', texto: `Faltam ${obr.length - preenchidos} campos obrigatórios` }) : status({ tom: 'success', texto: 'Pronto para salvar' })}`;
    return `<div class="page">
${cabecalho(k.editando ? 'Editar matriz' : 'Cadastrar matriz', k.editando ? `Editando ${esc(k.editando)}` : '<span class="dot"></span>Rascunho · não salvo', botao({ texto: 'Descartar', variante: 'neutral', a: 'descartar' }))}
<div class="grid-main-aside">
<section class="card card--p24 card--resp"><div class="card__body"><div class="stack gap-12">
<div class="only-mobile field__label">Etapa ${p + 1} de 4 · <b class="t-strong">${PASSOS[p]}</b><div class="progress-line"><span style="width:${((p + 1) / 4) * 100}%"></span></div></div>
<div class="hide-mobile">${etapas({ passos: PASSOS, atual: p, a: 'passo' })}</div>
${corpo}
<div class="form-nav">${botao({ texto: 'Voltar', variante: 'neutral', ico: 'chevron-left', desabilitado: p === 0, a: 'passo', id: p - 1 })}<div class="spacer"></div>${p < 3 ? botao({ texto: 'Próximo', variante: 'dark', icoDir: 'arrow-right', a: 'passo', id: p + 1 }) : botao({ texto: k.salvando ? 'Salvando…' : k.editando ? 'Salvar alterações' : 'Cadastrar matriz', variante: 'primary', ico: 'check', desabilitado: preenchidos < obr.length || k.salvando, a: 'salvar-matriz' })}</div>
</div></div></section>
<section class="card only-desktop sticky"><header class="card__head"><h3 class="card__title">Resumo</h3></header><div class="card__body"><dl class="resumo">${resumo.map(([a, b]) => `<div class="resumo__row"><dt>${a}</dt><dd class="${b === '—' ? 't-subtle' : ''}">${esc(b)}</dd></div>`).join('')}</dl><div class="resumo__total"><span class="t-muted">Campos obrigatórios</span><b class="t-strong">${preenchidos} / ${obr.length}</b></div></div></section>
</div></div>`;
  }
  function cadDeMatriz(m) {
    const c = cadVazio();
    c.editando = m.id; c.itens = m.checklist.slice();
    c.f = { codigo: m.id, descricao: m.nome, tipo: m.tipo === '—' ? '' : m.tipo, maquina: m.maquina === '—' ? '' : m.maquina, estacao: m.estacao === '—' ? '' : m.estacao, material: m.material === '—' ? '' : m.material, situacao: m.situacao === 'inativa' ? 'Inativa' : 'Ativa', criterio: m.criterio, limiteGolpes: String(m.limite || ''), intervaloDias: String(m.intervalo || ''), alertaPct: `${m.alerta}%`, responsavel: m.respId || '', notificar: m.notificar, golpes: String(m.golpes), ultima: m.ultimaISO || '', referencias: m.referencias.slice() };
    return c;
  }

  /* ---------- Equipe ---------- */
  const podeMexer = (p) => S.eu.nivel === 1 || p.nivel === 3;
  function acessoCel(p) {
    if (p.nivel === 3) return p.pinBloqueado ? status({ tom: 'warning', texto: 'PIN bloqueado', tam: 'sm' }) : p.pin ? status({ tom: 'success', texto: 'PIN definido', tam: 'sm' }) : status({ tom: 'neutral', texto: 'Sem PIN', tam: 'sm' });
    return p.conta ? `<span class="cell-stack"><span class="t-body-sm">Conta criada</span><span class="cell-code">${esc(p.email)}</span></span>` : '<span class="t-subtle">Sem conta (cria em /entrar)</span>';
  }
  function acoesPessoa(p) {
    const ok = podeMexer(p);
    return botaoIcone({ ico: 'pencil', rotulo: 'Editar', tam: 'sm', variante: 'ghost', a: 'editar-pessoa', id: p.id, desabilitado: !ok })
      + (p.nivel === 3 ? botaoIcone({ ico: 'key-round', rotulo: 'Definir PIN', tam: 'sm', variante: 'ghost', a: 'definir-pin', id: p.id }) : botaoIcone({ ico: 'rotate-ccw', rotulo: 'Apagar conta (a pessoa cria de novo)', tam: 'sm', variante: 'ghost', a: 'apagar-conta', id: p.id, desabilitado: !p.conta || (!ok && p.id !== S.eu.id) }))
      + botaoIcone({ ico: 'trash-2', rotulo: 'Excluir', tam: 'sm', variante: 'ghost', a: 'excluir-pessoa', id: p.id, desabilitado: !ok || p.id === S.eu.id });
  }
  function vEquipe() {
    if (S.carregando && !S.pessoas.length) return carregandoTela('Equipe');
    const ps = S.pessoas, tec = ps.filter((p) => p.nivel === 3).length, exemplo = ps.some((p) => p.exemplo);
    return `<div class="page">
${cabecalho('Equipe', `${ps.length} pessoas · ${tec} técnicos · ${S.aparelhos.length} tablet${S.aparelhos.length === 1 ? '' : 's'} liberado${S.aparelhos.length === 1 ? '' : 's'}`, botao({ texto: 'Adicionar pessoa', variante: 'primary', ico: 'plus', a: 'nova-pessoa' }))}
${exemplo ? aviso({ tom: 'warning', texto: 'Os técnicos de exemplo entram com o PIN 123456. Exclua-os antes de usar de verdade.' }) : ''}
${S.eu.nivel === 2 ? aviso({ texto: 'Gestores gerenciam os técnicos. Para alterar gestores e administradores, fale com o nível 1.' }) : ''}
<section class="card card--flush">
<div class="table-wrap hide-mobile"><table class="table"><thead><tr><th>Pessoa</th><th>Nível</th><th class="col-desktop">Cargo</th><th>Acesso</th><th>Situação</th><th class="num">Ações</th></tr></thead><tbody>
${ps.map((p) => `<tr><td><div class="cell-stack"><span class="cell-person">${avatar(p.nome, 24, p.id === S.eu.id)}<span class="cell-title">${esc(p.nome)}</span></span><span class="cell-code">Matrícula ${esc(p.matricula)}</span></div></td><td>${tag(p.nivelTexto)}</td><td class="col-desktop">${esc(p.cargo || '—')}</td><td>${acessoCel(p)}</td><td>${status({ tom: p.liberado ? 'success' : 'neutral', texto: p.liberado ? 'Liberado' : 'Bloqueado', tam: 'sm' })}</td><td class="num"><span class="cell-actions">${acoesPessoa(p)}</span></td></tr>`).join('')}
</tbody></table></div>
<div class="only-mobile">${ps.map((p) => `<div class="mcard"><div class="mcard__top"><div class="cell-stack"><span class="cell-title">${esc(p.nome)}</span><span class="cell-code">${esc(p.matricula)} · ${esc(p.nivelTexto)}</span></div>${status({ tom: p.liberado ? 'success' : 'neutral', texto: p.liberado ? 'Liberado' : 'Bloqueado', tam: 'sm' })}</div><div class="mcard__foot">${acessoCel(p)}<span class="cell-actions">${acoesPessoa(p)}</span></div></div>`).join('')}</div>
</section>
${cartao({ titulo: 'Tablets liberados', sub: 'Para liberar, abra /tecnico/ no tablet e entre com a matrícula e a senha de um gestor', corpoCls: 'card__body--tight', corpo: S.aparelhos.length ? S.aparelhos.map((a) => `<div class="list-item"><span class="ico-tile">${icone('tablet-smartphone', 16)}</span><span class="list-item__main"><span class="cell-title ellipsis">${esc(a.nome)}</span><span class="cell-code">Liberado por ${esc(a.liberadoPor)} em ${esc(a.liberadoEm)} · último uso ${esc(a.ultimoUso)}</span></span>${botao({ texto: 'Revogar', tam: 'sm', a: 'revogar', id: a.id })}</div>`).join('') : '<p class="t-muted-sm">Nenhum tablet liberado ainda.</p>' })}
</div>`;
  }

  /* ---------- Configurações ---------- */
  function vConfig() {
    const C = S.config;
    if (!C) return carregandoTela('Configurações');
    const em = C.email;
    const passos = [['Pendentes primeiro', 'Matriz indicada antes e ainda sem manutenção registrada continua na lista e ocupa uma vaga.'], ['Ficam de fora', `Inativas, com OS aberta e as que já passaram por manutenção e ainda não produziram ${fmtNum(C.minPecasAposManutencao)} peças.`], ['Vencidas na frente', 'Depois as demais, pela demanda mensal somada das referências de cada matriz.'], ['Desempate', 'Última manutenção mais antiga primeiro.']];
    return `<div class="page">
${cabecalho('Configurações', 'Regra das matrizes do dia, e-mail diário, demanda do CIGAM e listas dos cadastros')}
<div class="grid-1-1">
${cartao({ titulo: 'Regra das matrizes do dia', sub: 'Vale a partir da próxima indicação (ou use Recalcular no Painel)', corpo: `<div class="stack gap-10">
<div class="form-grid">${campo({ rotulo: 'Matrizes por dia', valor: C.matrizesPorDia, id: 'cfg-n', a: 'cfg:matrizesPorDia', extra: { inputmode: 'numeric' } })}${campo({ rotulo: 'Peças mínimas após a manutenção', valor: C.minPecasAposManutencao, sufixo: 'peças', id: 'cfg-min', a: 'cfg:minPecasAposManutencao', dica: 'Abaixo disso a matriz não volta para a lista', extra: { inputmode: 'numeric' } })}</div>
<div class="field"><span class="field__label">Alerta antecipado padrão</span>${segmentado({ opcoes: ['70%', '80%', '90%'], valor: `${C.alertaPadrao}%`, a: 'cfg-alerta' })}</div>
<div class="stack">${passos.map(([t, d], i) => `<div class="checklist-row"><span class="num-tile">${i + 1}</span><span class="cell-stack"><span class="cell-title">${t}</span><span class="t-muted-sm">${esc(d)}</span></span></div>`).join('')}</div>
<div class="row row--end">${botao({ texto: 'Salvar regra', variante: 'dark', ico: 'check', a: 'salvar-regra' })}</div></div>` })}
${cartao({ titulo: 'E-mail diário', sub: `Matrizes do dia · ${em.hora} · segunda a sexta`, corpo: `<div class="stack gap-10">
${aviso({ texto: 'O envio automático entra na fase 2. Horário e destinatários já ficam guardados.' })}
${C.emailModoTeste ? aviso({ tom: 'warning', texto: 'Gmail não configurado no config.json: os e-mails ficam em modo teste (aparecem no terminal).' }) : ''}
${chave({ rotulo: 'Enviar e-mail diário', ligado: em.ativo, a: 'cfg-email-ativo' })}
${campo({ rotulo: 'Horário', tipo: 'time', valor: em.hora, id: 'cfg-hora', a: 'cfg:hora', ico: 'clock' })}
<div class="field"><span class="field__label">Destinatários</span><div class="row row--end">${campo({ ph: 'nome@screw.com.br', tipo: 'email', valor: S.cfg.novoEmail, id: 'cfg-novo-email', a: 'cfg-novo-email', ico: 'mail', cls: 'spacer', extra: { 'data-enter': 'add-email' } })}${botao({ texto: 'Adicionar', ico: 'plus', a: 'add-email', desabilitado: !S.cfg.novoEmail })}</div>${em.destinatarios.length ? `<div class="chips-row chips-row--wrap gap-4">${em.destinatarios.map((x) => chipFiltro({ texto: x, a: 'rem-email', id: x })).join('')}</div>` : '<span class="field__hint">Nenhum destinatário ainda.</span>'}</div>
<div class="row row--end">${botao({ texto: 'Salvar e-mail', variante: 'dark', ico: 'check', a: 'salvar-email' })}</div></div>` })}
</div>
<div class="grid-1-1">
${cartao({ titulo: 'Demanda do CIGAM', sub: 'Extração diária da demanda mensal por referência', corpo: `<div class="stack gap-8"><dl class="dl">${[['Última importação', C.ultimaImportacao ? `${C.ultimaImportacao.quando} · ${C.ultimaImportacao.arquivo}` : 'Nenhuma'], ['Referências cadastradas', fmtNum(C.referencias)]].map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>${aviso({ texto: 'A importação da extração do CIGAM entra na fase 2, quando o formato do arquivo estiver definido.' })}</div>` })}
${cartao({ titulo: 'Listas dos cadastros', sub: 'Um item por linha', corpo: `<div class="stack gap-8">${[['maquinas', 'Máquinas'], ['tiposMatriz', 'Tipos de matriz'], ['materiais', 'Materiais'], ['tiposServico', 'Tipos de serviço (OS - Serviços)'], ['setores', 'Setores solicitantes']].map(([k, r]) => areaTexto({ rotulo: r, id: `cfg-${k}`, linhas: 3, valor: Array.isArray(C[k]) ? C[k].join('\n') : C[k] || '', a: `cfg:${k}` })).join('')}<div class="row row--end">${botao({ texto: 'Salvar listas', variante: 'dark', ico: 'check', a: 'salvar-listas' })}</div></div>` })}
</div></div>`;
  }

  /* ---------- App ---------- */
  function vApp() {
    if (!S.eu) return '<div class="loading">Carregando…</div>';
    const pag = { painel: vPainel, relacao: vRelacao, cadastro: vCadastro, 'os-matrizes': vOSM, 'os-servicos': vOSS, equipe: vEquipe, config: vConfig }[S.pagina]();
    return `<div class="app">${vSidebar()}${vMenuMovel()}<div class="main-col">${vTopbar()}<main class="main" data-screen-label="${S.pagina}">${pag}</main></div></div>${vGaveta()}${vModal()}`;
  }

  /* ---------- Ações ---------- */
  async function salvando(fn) {
    const M = S.modal;
    if (M) { M.salvando = true; M.erro = ''; M.erros = {}; render(); }
    try { await fn(); } catch (e) {
      if (e.status === 401) return;
      if (S.modal) { S.modal.erro = e.campos && Object.keys(e.campos).length ? '' : e.message; S.modal.erros = e.campos || {}; if (!Object.keys(S.modal.erros).length) S.modal.erro = e.message; S.modal.salvando = false; render(); } else falhou(e);
    }
  }
  function abrirRegistro(m, os) {
    S.modal = { tipo: 'registrar', matriz: m, os: os || null, checks: m.checklist.map(() => false), f: { data: hojeISO(), tecnico: m.respId || '', golpesContador: String(m.golpes || ''), tempoMin: '', obs: '', tipo: 'Preventiva' } };
    render();
  }
  async function detalheDe(id) { return S.detalhe && S.detalhe.id === id ? S.detalhe : API.get(`/api/matrizes/${API.u(id)}`); }
  const pedirConfirmacao = (titulo, texto, botaoTxt, fazer) => { S.modal = { tipo: 'confirmar', titulo, texto, botao: botaoTxt, fazer }; render(); };
  async function patchOS(tipo, id, corpo, msg) {
    try { await API.patch(`/api/${tipo}/${API.u(id)}`, corpo); toast(msg); await recarregar(); } catch (e) { falhou(e); }
  }

  const ACOES = {
    nada() {},
    ir: (el) => ir(el.dataset.id),
    'ir-rel': (el) => { S.rel.aba = el.dataset.id; S.rel.pag = 1; ir('relacao'); },
    recarregar: () => recarregar(),
    grupo: (el) => {
      const g = el.dataset.id;
      if (el.closest('.sidebar') && matchMedia('(max-width:1199px)').matches) return ir(g === 'ordens' ? 'os-matrizes' : 'relacao');
      S.grupos[g] = !S.grupos[g]; render();
    },
    menu: () => { S.menu = true; render(); },
    'menu-fechar': () => { S.menu = false; render(); },
    tema: () => { window.UI.alternarTema(); render(); },
    sair: async () => { try { await API.post('/api/sair'); } catch (e) { /* segue */ } location.href = '/entrar/'; },
    abrir: (el) => abrirMatriz(el.dataset.id),
    'fechar-gaveta': () => { S.aberta = null; S.detalhe = null; render(); },
    'passo-gaveta': async (el) => {
      if (!S.matrizes.length) { try { S.matrizes = await API.get('/api/matrizes'); } catch (e) { return falhou(e); } }
      const lista = S.pagina === 'relacao' ? linhasRelacao() : S.matrizes;
      const i = lista.findIndex((m) => m.id === S.aberta), n = lista.length;
      if (n) abrirMatriz(lista[(i + Number(el.dataset.id) + n) % n].id);
    },
    'aba-gaveta': (el) => { S.abaGaveta = el.dataset.id; render(); },
    registrar: async (el) => { try { abrirRegistro(await detalheDe(el.dataset.id)); } catch (e) { falhou(e); } },
    'fechar-modal': () => { S.modal = null; render(); },
    'check-reg': (el) => { S.modal.checks[Number(el.dataset.id)] = el.checked; render(); },
    'm-tipo': (el) => { S.modal.f.tipo = el.dataset.id; render(); },
    'salvar-registro': () => salvando(async () => {
      const M = S.modal, f = M.f;
      const r = await API.post('/api/manutencoes', { matriz: M.matriz.id, os: M.os, data: f.data, tecnico: f.tecnico, golpesContador: f.golpesContador, tempoMin: f.tempoMin, obs: f.obs, tipo: f.tipo, checklist: M.checks });
      S.modal = null; if (S.aberta) S.detalhe = r.matriz;
      toast(`Manutenção registrada · ${r.os}`); await recarregar();
    }),
    reprogramar: () => { const m = S.detalhe; S.modal = { tipo: 'reprogramar', matriz: m, f: { data: m.proximaISO || hojeISO(), motivo: '' } }; render(); },
    'salvar-reprogramar': () => salvando(async () => {
      const M = S.modal;
      if (!M.f.data) { S.modal.erros = { data: 'Informe a nova data' }; S.modal.salvando = false; return render(); }
      await API.post(`/api/matrizes/${API.u(M.matriz.id)}/reprogramar`, { data: M.f.data, motivo: M.f.motivo });
      S.modal = null; toast('Manutenção reprogramada'); await abrirMatriz(M.matriz.id); await recarregar();
    }),
    'reprogramar-limpar': () => salvando(async () => {
      const M = S.modal;
      await API.post(`/api/matrizes/${API.u(M.matriz.id)}/reprogramar`, { data: null });
      S.modal = null; toast('Próxima data volta a ser calculada'); await abrirMatriz(M.matriz.id); await recarregar();
    }),
    'nova-osm': () => { S.modal = { tipo: 'nova-osm', f: { matriz: S.detalhe ? S.detalhe.id : '', tipo: 'Preventiva', tecnico: 'responsavel', prazo: hojeISO(), descricao: '' } }; render(); },
    'salvar-osm': () => salvando(async () => {
      const f = S.modal.f;
      const r = await API.post('/api/os-matrizes', { matriz: f.matriz, tipo: f.tipo, tecnico: f.tecnico, prazo: f.prazo, descricao: f.descricao });
      S.modal = null;
      toast(r.criadas.length ? `OS aberta · ${r.criadas[0]}` : 'Esta matriz já tem OS aberta', r.criadas.length ? 'success' : 'warning');
      await recarregar();
    }),
    'osm-status': (el) => patchOS('os-matrizes', el.dataset.id, { status: el.dataset.st }, el.dataset.st === 'peca' ? 'OS aguardando peça' : 'OS em andamento'),
    'osm-cancelar': (el) => pedirConfirmacao('Cancelar OS', `A ${el.dataset.id} será cancelada e sai da lista de abertas.`, 'Cancelar OS', () => API.patch(`/api/os-matrizes/${API.u(el.dataset.id)}`, { status: 'cancelada' })),
    'osm-concluir': async (el) => {
      const o = S.osm.find((x) => x.id === el.dataset.id);
      try { abrirRegistro(await API.get(`/api/matrizes/${API.u(o.matriz)}`), o.id); } catch (e) { falhou(e); }
    },
    'nova-oss': () => { S.modal = { tipo: 'oss', f: { servico: '', descricao: '', solicitante: '', setor: '', quantidade: '1', prazo: hojeISO(), tecnico: '' } }; render(); },
    'editar-oss': (el) => {
      const o = S.oss.find((x) => x.id === el.dataset.id);
      if (!o) return;
      S.modal = { tipo: 'oss', id: o.id, abertura: o.abertura, f: { servico: o.servico, descricao: o.descricao, solicitante: o.solicitante === '—' ? '' : o.solicitante, setor: o.setor === '—' ? '' : o.setor, quantidade: String(o.quantidade), prazo: o.prazoISO, tecnico: o.tecnicoId || '', observacoes: o.observacoes } };
      render();
    },
    'm-servico': (el) => { S.modal.f.servico = el.dataset.id; render(); },
    'salvar-oss': () => salvando(async () => {
      const M = S.modal;
      if (M.id) await API.patch(`/api/os-servicos/${API.u(M.id)}`, M.f); else await API.post('/api/os-servicos', M.f);
      S.modal = null; toast(M.id ? 'OS salva' : 'OS de serviço aberta'); await recarregar();
    }),
    'oss-status': (el) => patchOS('os-servicos', el.dataset.id, { status: el.dataset.st }, el.dataset.st === 'concluida' ? 'OS concluída' : el.dataset.st === 'peca' ? 'OS aguardando peça' : 'OS em andamento'),
    'oss-cancelar': (el) => pedirConfirmacao('Cancelar OS', `A ${el.dataset.id} será cancelada e sai da lista de abertas.`, 'Cancelar OS', () => API.patch(`/api/os-servicos/${API.u(el.dataset.id)}`, { status: 'cancelada' })),
    'confirmar-sim': () => salvando(async () => { await S.modal.fazer(); S.modal = null; toast('Feito'); await recarregar(); }),
    'plano-os': async () => { try { const r = await API.post('/api/plano-do-dia/gerar-os'); toast(r.criadas.length ? `${r.criadas.length} OS aberta${r.criadas.length > 1 ? 's' : ''}` : 'Nenhuma OS nova', r.criadas.length ? 'success' : 'warning'); await recarregar(); } catch (e) { falhou(e); } },
    'plano-recalcular': async () => { try { await API.post('/api/plano-do-dia/recalcular'); toast('Indicação de hoje recalculada'); await recarregar(); } catch (e) { falhou(e); } },
    /* Relação */
    'aba-rel': (el) => { S.rel.aba = el.dataset.id; S.rel.pag = 1; render(); },
    maquina: (el) => { S.rel.maquina = el.dataset.id || null; S.rel.pag = 1; render(); },
    ordenar: (el) => { const k = el.dataset.id; S.rel.dir = S.rel.ordem === k && S.rel.dir === 'desc' ? 'asc' : 'desc'; S.rel.ordem = k; render(); },
    sel: (el) => { const id = el.dataset.id; S.rel.sel = el.checked ? [...S.rel.sel, id] : S.rel.sel.filter((x) => x !== id); render(); },
    'sel-todas': () => { const ids = linhasRelacao().map((m) => m.id); const todas = ids.every((i) => S.rel.sel.includes(i)); S.rel.sel = todas ? [] : ids; render(); },
    'sel-limpar': () => { S.rel.sel = []; render(); },
    'gerar-os-sel': async () => {
      try { const r = await API.post('/api/os-matrizes', { matrizes: S.rel.sel, tipo: 'Preventiva', tecnico: 'responsavel', prazo: hojeISO() }); toast(`${r.criadas.length} OS aberta${r.criadas.length === 1 ? '' : 's'}${r.ignoradas.length ? ` · ${r.ignoradas.length} já tinham OS ou estão inativas` : ''}`); S.rel.sel = []; await recarregar(); } catch (e) { falhou(e); }
    },
    pag: (el) => { S.rel.pag = Number(el.dataset.id); render(); window.scrollTo(0, 0); },
    'exportar-rel': () => API.baixarCSV(`relacao-preventiva-${hojeISO()}.csv`, ['Código', 'Descrição', 'Tipo', 'Máquina', 'Estação', 'Responsável', 'Golpes', 'Limite', 'Intervalo (dias)', 'Última', 'Próxima', 'Prazo', 'Status', 'Demanda mensal', 'Referências'], linhasRelacao().map((m) => [m.id, m.nome, m.tipo, m.maquina, m.estacao, m.resp, m.golpes, m.limite, m.intervalo, m.ultima, m.proxima, m.rel, window.UI.STATUS[m.status][1], m.demanda, m.referencias.join(' ')])),
    'exportar-osm': () => API.baixarCSV(`os-matrizes-${hojeISO()}.csv`, ['OS', 'Tipo', 'Matriz', 'Descrição', 'Máquina', 'Técnico', 'Abertura', 'Prazo', 'Status', 'Concluída'], filtroOS(S.osm, S.os).map((o) => [o.id, o.tipo, o.matriz, o.nome, o.maquina, o.tecnico, o.abertura, o.prazo, OS_ST[o.status].label, o.concluidaEm || ''])),
    'exportar-oss': () => API.baixarCSV(`os-servicos-${hojeISO()}.csv`, ['OS', 'Serviço', 'Descrição', 'Solicitante', 'Setor', 'Quantidade', 'Técnico', 'Abertura', 'Prazo', 'Status', 'Concluída'], filtroOS(S.oss, S.ss).map((o) => [o.id, o.servico, o.descricao, o.solicitante, o.setor, o.quantidade, o.tecnico, o.abertura, o.prazo, OS_ST[o.status].label, o.concluidaEm || ''])),
    'aba-osm': (el) => { S.os.aba = el.dataset.id; render(); },
    'aba-oss': (el) => { S.ss.aba = el.dataset.id; render(); },
    /* Cadastro */
    'nova-matriz': () => { S.cad = cadVazio(); ir('cadastro'); },
    editar: async (el) => { try { const m = await detalheDe(el.dataset.id); S.cad = cadDeMatriz(m); S.aberta = null; S.detalhe = null; ir('cadastro'); } catch (e) { falhou(e); } },
    descartar: () => { S.cad = cadVazio(); ir('relacao'); },
    passo: (el) => { S.cad.passo = Math.max(0, Math.min(3, Number(el.dataset.id))); render(); },
    tipo: (el) => { S.cad.f.tipo = S.cad.f.tipo === el.dataset.id ? '' : el.dataset.id; render(); },
    situacao: (el) => { S.cad.f.situacao = el.dataset.id; render(); },
    alerta: (el) => { S.cad.f.alertaPct = el.dataset.id; render(); },
    criterio: (el) => { S.cad.f.criterio = el.dataset.id; render(); },
    notif: (el) => { S.cad.f.notificar = el.checked; render(); },
    'rem-item': (el) => { S.cad.itens.splice(Number(el.dataset.id), 1); render(); },
    'add-item': () => { const t = S.cad.novo.trim(); if (t) { S.cad.itens.push(t); S.cad.novo = ''; render(); const n = document.getElementById('cad-novo'); if (n) n.focus(); } },
    'add-ref': () => { const t = S.cad.novaRef.trim(); if (t && !S.cad.f.referencias.includes(t)) S.cad.f.referencias.push(t); S.cad.novaRef = ''; render(); const n = document.getElementById('cad-ref'); if (n) n.focus(); },
    'rem-ref': (el) => { S.cad.f.referencias = S.cad.f.referencias.filter((r) => r !== el.dataset.id); render(); },
    'salvar-matriz': async () => {
      const k = S.cad, f = k.f;
      k.salvando = true; k.erros = {}; render();
      const corpo = { ...f, situacao: f.situacao === 'Inativa' ? 'inativa' : 'ativa', alertaPct: parseInt(f.alertaPct, 10), checklist: k.itens, ultima: f.ultima || null };
      try {
        if (k.editando) await API.put(`/api/matrizes/${API.u(k.editando)}`, corpo); else await API.post('/api/matrizes', corpo);
        toast(k.editando ? `Matriz ${k.editando} salva` : `Matriz ${f.codigo.toUpperCase()} cadastrada`);
        S.cad = cadVazio(); await carregarListas(); ir('relacao');
      } catch (e) {
        k.salvando = false; k.erros = Object.keys(e.campos || {}).length ? e.campos : { geral: e.message };
        if (e.status !== 401) render();
      }
    },
    /* Equipe */
    'nova-pessoa': () => { S.modal = { tipo: 'pessoa', f: { nome: '', matricula: '', nivel: 3, cargo: 'Técnico de matrizaria', liberado: true } }; render(); },
    'editar-pessoa': (el) => { const p = S.pessoas.find((x) => x.id === el.dataset.id); S.modal = { tipo: 'pessoa', id: p.id, f: { nome: p.nome, matricula: p.matricula, nivel: p.nivel, cargo: p.cargo, liberado: p.liberado } }; render(); },
    'm-nivel': (el) => { S.modal.f.nivel = (NIVEIS.find((x) => x.t === el.dataset.id) || NIVEIS[0]).v; render(); },
    'm-liberado': (el) => { S.modal.f.liberado = el.checked; render(); },
    'salvar-pessoa': () => salvando(async () => {
      const M = S.modal;
      if (M.id) await API.put(`/api/pessoas/${M.id}`, M.f); else await API.post('/api/pessoas', M.f);
      S.modal = null; toast('Pessoa salva'); await recarregar();
    }),
    'definir-pin': (el) => { S.modal = { tipo: 'pin', pessoa: S.pessoas.find((x) => x.id === el.dataset.id), f: { pin: '', pin2: '' } }; render(); },
    'salvar-pin': () => salvando(async () => {
      const M = S.modal;
      if (M.f.pin !== M.f.pin2) { S.modal.erros = { pin: 'Os dois PINs não conferem' }; S.modal.salvando = false; return render(); }
      await API.post(`/api/pessoas/${M.pessoa.id}/pin`, { pin: M.f.pin });
      S.modal = null; toast(`PIN de ${M.pessoa.nome} definido`); await recarregar();
    }),
    'apagar-conta': (el) => { const p = S.pessoas.find((x) => x.id === el.dataset.id); pedirConfirmacao('Apagar conta', `${p.nome} sai do sistema e precisa criar a conta de novo em /entrar (serve para trocar a senha).`, 'Apagar conta', () => API.del(`/api/pessoas/${p.id}/conta`)); },
    'excluir-pessoa': (el) => { const p = S.pessoas.find((x) => x.id === el.dataset.id); pedirConfirmacao('Excluir pessoa', `${p.nome} será excluída da equipe, com conta e PIN. As matrizes dela ficam sem responsável.`, 'Excluir', () => API.del(`/api/pessoas/${p.id}`)); },
    revogar: (el) => { const a = S.aparelhos.find((x) => x.id === el.dataset.id); pedirConfirmacao('Revogar tablet', `${a.nome} deixa de abrir o App do Técnico até ser liberado de novo.`, 'Revogar', () => API.del(`/api/aparelhos/${a.id}`)); },
    /* Configurações */
    'cfg-alerta': (el) => { S.config.alertaPadrao = parseInt(el.dataset.id, 10); render(); },
    'cfg-email-ativo': (el) => { S.config.email.ativo = el.checked; render(); },
    'add-email': () => { const e = S.cfg.novoEmail.trim().toLowerCase(); if (e && !S.config.email.destinatarios.includes(e)) S.config.email.destinatarios.push(e); S.cfg.novoEmail = ''; render(); },
    'rem-email': (el) => { S.config.email.destinatarios = S.config.email.destinatarios.filter((x) => x !== el.dataset.id); render(); },
    'salvar-regra': async () => { try { await API.put('/api/config', { matrizesPorDia: S.config.matrizesPorDia, minPecasAposManutencao: S.config.minPecasAposManutencao, alertaPadrao: S.config.alertaPadrao }); toast('Regra salva'); await recarregar(); } catch (e) { falhou(e); } },
    'salvar-email': async () => { try { await API.put('/api/config', { email: { ativo: S.config.email.ativo, hora: S.config.email.hora, destinatarios: S.config.email.destinatarios } }); toast('E-mail salvo'); await recarregar(); } catch (e) { falhou(e); } },
    'salvar-listas': async () => { try { const C = S.config, l = (k) => (Array.isArray(C[k]) ? C[k] : String(C[k] || '').split('\n')); await API.put('/api/config', { maquinas: l('maquinas'), tiposMatriz: l('tiposMatriz'), materiais: l('materiais'), tiposServico: l('tiposServico'), setores: l('setores') }); toast('Listas salvas'); await recarregar(); } catch (e) { falhou(e); } },
  };

  document.addEventListener('click', (e) => {
    const lab = e.target.closest('label.check, label.radio, label.switch');
    if (lab && e.target.tagName !== 'INPUT') return; // o clique real chega pelo <input>
    const el = e.target.closest('[data-acao]');
    if (!el || el.disabled) return;
    const fn = ACOES[el.dataset.acao];
    if (fn) fn(el, e);
  });
  /* Campos: o valor digitado vai para o estado (assim não se perde quando a tela redesenha) */
  document.addEventListener('input', (e) => {
    const c = e.target.dataset && e.target.dataset.campo;
    if (!c) return;
    const v = e.target.value;
    if (c.startsWith('m:')) { S.modal.f[c.slice(2)] = v; return; }
    if (c.startsWith('cfg:')) { const k = c.slice(4); if (k === 'hora') S.config.email.hora = v; else S.config[k] = v; return; }
    if (c === 'cfg-novo-email') { S.cfg.novoEmail = v; render(); return; }
    if (c === 'busca-rel') { S.rel.busca = v; S.rel.pag = 1; }
    else if (c === 'busca-osm') S.os.busca = v;
    else if (c === 'busca-oss') S.ss.busca = v;
    else if (c === 'osm-tecnico') S.os.tecnico = v;
    else if (c === 'oss-tecnico') S.ss.tecnico = v;
    else if (c === 'novo') S.cad.novo = v;
    else if (c === 'novaRef') S.cad.novaRef = v;
    else if (c === 'tipo-txt') S.cad.f.tipo = v;
    else if (c in S.cad.f) S.cad.f[c] = v;
    render();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.dataset && e.target.dataset.enter) {
      e.preventDefault();
      const k = e.target.dataset.enter;
      if (k === 'busca-global') { S.rel.busca = e.target.value; S.rel.aba = 'todas'; S.rel.pag = 1; e.target.value = ''; ir('relacao'); }
      else if (ACOES[k]) ACOES[k]();
      return;
    }
    if (e.key !== 'Escape') return;
    if (S.modal) S.modal = null; else if (S.aberta) { S.aberta = null; S.detalhe = null; } else if (S.menu) S.menu = false; else return;
    render();
  });
  setInterval(() => { const h = document.getElementById('hora-local'); if (h) h.textContent = agora(); }, 30000);

  API.aoSair = () => { location.href = `/entrar/?volta=${encodeURIComponent('/admin/')}`; };
  (async function iniciar() {
    try {
      S.eu = await API.get('/api/eu');
      if (S.eu.nivel === 3) { location.href = '/tecnico/'; return; }
      await carregarListas();
      await carregarPagina();
    } catch (e) { if (e.status !== 401) { S.eu = S.eu || { nome: '', cargo: '' }; S.erro = e.message; S.carregando = false; render(); } }
  })();
})();
