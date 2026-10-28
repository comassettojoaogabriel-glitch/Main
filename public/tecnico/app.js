/* SCREW · App do Técnico — tablet da Matrizaria.
   Entrada: aparelho liberado por um gestor + técnico escolhe o nome e digita o PIN (sai sozinho depois de alguns minutos parado).
   Telas: Hoje (matrizes do dia no topo), Matrizes, Ordens (Matrizes · Serviços · Concluídas), Detalhe da matriz,
   Executar manutenção, Concluído, Detalhe da OS de serviço. Mesma base visual do Admin (js/ui.js + css/app.css). */
(function () {
  const { esc, icone, botao, botaoIcone, status, tag, medidor, avatar, campo, areaTexto, caixa, abas, aviso, toast, tecladoPin, montar } = window.UI;
  const fmtNum = window.fmtNum, fmtK = window.fmtK;
  const RAIZES = ['hoje', 'matrizes', 'ordens'];
  const OS_ST = { aberta: { tone: 'neutral', label: 'Aberta' }, andamento: { tone: 'brand', label: 'Em andamento' }, peca: { tone: 'warning', label: 'Aguardando peça' }, concluida: { tone: 'success', label: 'Concluída' }, cancelada: { tone: 'neutral', label: 'Cancelada' } };
  const ABERTA = (o) => ['aberta', 'andamento', 'peca'].includes(o.status);
  document.body.classList.add('is-tecnico');

  const S = {
    fase: 'carregando', eu: null, tablet: null, escolhido: null, pin: '', erro: '', enviando: false, lib: { nome: 'Tablet da Matrizaria' },
    pilha: [{ t: 'hoje' }], matrizes: [], osm: [], oss: [], plano: null, detalhe: null, servicoObs: '',
    abaMatrizes: 'todas', busca: '', abaOrdens: 'matrizes', exec: null,
  };
  const raiz = document.getElementById('app');
  const topo = () => S.pilha[S.pilha.length - 1];
  const render = () => montar(raiz, vApp());
  const falhou = (e) => { if (e && e.status !== 401) toast(e.message || 'Algo deu errado.', 'danger'); };
  const corRel = (m) => (m.status === 'overdue' ? 't-danger' : m.status === 'due' ? 't-warning' : '');
  const valor = (id) => (document.getElementById(id) || {}).value || '';
  const souEu = (id) => S.eu && id === S.eu.id;
  const ehGestor = () => S.eu && S.eu.nivel <= 2;
  const hojeCurto = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const saudacao = () => { const h = new Date().getHours(); return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'; };
  const dataExtenso = () => { const s = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }); return s[0].toUpperCase() + s.slice(1); };

  /* ---------- Dados ---------- */
  async function carregarDados() {
    const [matrizes, osm, oss, plano] = await Promise.all([API.get('/api/matrizes'), API.get('/api/os-matrizes'), API.get('/api/os-servicos'), API.get('/api/plano-do-dia')]);
    Object.assign(S, { matrizes, osm, oss, plano });
  }
  async function atualizar() { try { await carregarDados(); } catch (e) { falhou(e); } render(); }
  const ir = (t, id) => {
    S.pilha = RAIZES.includes(t) ? [{ t }] : [...S.pilha, { t, id }];
    if (t === 'detalhe') carregarDetalhe(id);
    if (t === 'servico') { const o = S.oss.find((x) => x.id === id); S.servicoObs = o ? o.observacoes : ''; }
    if (RAIZES.includes(t)) atualizar();
    render(); window.scrollTo(0, 0);
  };
  const voltar = () => { if (S.pilha.length > 1) S.pilha.pop(); const t = topo(); if (t.t === 'detalhe') carregarDetalhe(t.id); else if (RAIZES.includes(t.t)) atualizar(); render(); window.scrollTo(0, 0); };
  async function carregarDetalhe(id) {
    S.detalhe = null; render();
    try { S.detalhe = await API.get(`/api/matrizes/${API.u(id)}`); } catch (e) { falhou(e); }
    render();
  }

  /* ---------- Componentes da tela ---------- */
  function cabecalho({ titulo, sub, voltar: v, direita = '' }) {
    return `<div class="mhead">${v ? `<div class="mhead__nav">${botaoIcone({ ico: 'chevron-left', rotulo: 'Voltar', tam: 'lg', a: 'voltar' })}<div class="row">${direita}</div></div>` : ''}<div class="mhead__row"><div class="ellipsis-wrap">${sub ? `<div class="mhead__sub">${esc(sub)}</div>` : ''}<h1 class="mhead__title">${esc(titulo)}</h1></div>${!v ? direita : ''}</div></div>`;
  }
  function cartaoOS(o) {
    const st = OS_ST[o.status];
    const prazo = o.prazoHoje ? 'Prazo hoje' : `Prazo ${o.prazo}${o.atrasada ? ' · atrasada' : ''}`;
    const servico = o.grupo === 'servico';
    const dest = servico ? `data-acao="ir" data-id="servico" data-m="${esc(o.id)}"` : `data-acao="ir" data-id="detalhe" data-m="${esc(o.matriz)}"`;
    return `<button type="button" class="mtile" ${dest}><span class="mtile__top"><span><span class="mtile__title">${esc(servico ? o.descricao : o.nome)}</span><span class="cell-code">${servico ? `${esc(o.servico)} · ${esc(o.solicitante)}` : `${esc(o.matriz)} · ${esc(o.maquina)}`}</span></span>${status({ tom: st.tone, texto: st.label, tam: 'sm' })}</span><span class="mtile__foot"><span class="row row--nowrap gap-0">${icone(servico ? 'cog' : o.tipo === 'Corretiva' ? 'hammer' : 'wrench', 14)}${servico ? 'Serviço' : o.tipo} · ${esc(o.id)}</span><span class="${(o.prazoHoje || o.atrasada) && ABERTA(o) ? 't-danger' : ''}">${ABERTA(o) ? prazo : `Concluída ${o.concluidaEm || ''}`}</span></span></button>`;
  }
  const MOTIVO = (it) => (it.feita ? { tom: 'success', texto: 'Feita' } : it.motivo === 'pendente' ? { tom: 'warning', texto: 'Pendente' } : it.motivo === 'vencida' ? { tom: 'danger', texto: 'Vencida' } : { tom: 'brand', texto: 'Maior demanda' });
  function vMatrizesDoDia() {
    const p = S.plano;
    if (!p) return '';
    const sub = p.vazio ? (p.diaUtil ? 'Nenhuma indicação' : 'Sem indicação no fim de semana') : `${p.deHoje ? 'Hoje' : 'Última indicação'}, ${p.dataTexto} · ${p.feitas} de ${p.itens.length} feitas`;
    return `<div class="stack gap-6"><div class="msection-head"><h2 class="msection-title">Matrizes do dia</h2><span class="caption">${esc(sub)}</span></div>
${p.avisoDemanda ? aviso({ tom: 'warning', texto: p.avisoDemanda }) : ''}
<div class="mlist">${p.itens.map((it) => { const mot = MOTIVO(it); return `<button type="button" class="mtile${it.feita ? ' is-done' : ''}" data-acao="ir" data-id="detalhe" data-m="${esc(it.id)}"><span class="mtile__top"><span class="mtile__lead"><span class="num-tile">${it.pos}</span><span><span class="mtile__title">${esc(it.nome)}</span><span class="cell-code">${esc(it.id)} · ${esc(it.maquina)}</span></span></span>${status({ tom: mot.tom, texto: mot.texto, tam: 'sm' })}</span>${it.limite && !it.feita ? medidor({ valor: it.golpes, max: it.limite, bloco: true }) : ''}<span class="mtile__foot"><span>${it.demanda ? `${fmtNum(it.demanda)} peças/mês` : 'Sem demanda'}${it.refMaior ? ` · ref. ${esc(it.refMaior)}` : ''}</span><span class="${it.feita ? '' : corRel(it)}">${it.feita ? 'Manutenção registrada' : it.os ? esc(it.os) : esc(it.rel)}</span></span></button>`; }).join('')}</div></div>`;
  }

  /* ---------- Telas de entrada (tablet) ---------- */
  function vLiberar() {
    return `<div class="mscreen mscreen--flow">${cabecalho({ sub: 'Primeiro acesso deste aparelho', titulo: 'Liberar este tablet', direita: window.UI.botaoTema('ghost', 'lg') })}
<form class="mbody" data-form="liberar" novalidate>
${aviso({ texto: 'Só um gestor ou administrador libera o aparelho. Depois disso, cada técnico entra com o próprio PIN.' })}
${S.erro ? aviso({ tom: 'danger', texto: S.erro }) : ''}
${campo({ rotulo: 'Nome do aparelho', id: 't-nome', valor: S.lib.nome, tam: 'lg', ico: 'tablet-smartphone' })}
${campo({ rotulo: 'Matrícula do gestor', id: 't-matricula', tam: 'lg', ico: 'user', extra: { inputmode: 'numeric', autocomplete: 'off' } })}
${campo({ rotulo: 'Senha', id: 't-senha', tipo: 'password', tam: 'lg', ico: 'key-round', extra: { autocomplete: 'off' } })}
${botao({ texto: S.enviando ? 'Liberando…' : 'Liberar tablet', variante: 'primary', tam: 'lg', bloco: true, tipo: 'submit', ico: 'shield-check', desabilitado: S.enviando })}
<p class="caption">No computador, gestores usam o Admin em /admin/.</p>
</form></div>`;
  }
  function vQuem() {
    const tecs = (S.tablet && S.tablet.tecnicos) || [];
    return `<div class="mscreen mscreen--flow">${cabecalho({ sub: `${S.tablet ? S.tablet.nome : 'Tablet'} · ${dataExtenso()}`, titulo: 'Quem vai usar?', direita: window.UI.botaoTema('ghost', 'lg') })}
<div class="mbody">
${tecs.length ? `<div class="person-grid">${tecs.map((p) => `<button type="button" class="person-tile" data-acao="escolher" data-id="${esc(p.id)}"${p.temPin ? '' : ' disabled'}>${avatar(p.nome, 44)}<span class="person-tile__nome">${esc(p.nome)}</span><span class="person-tile__sub">${p.temPin ? esc(p.cargo) : 'Sem PIN'}</span></button>`).join('')}</div>` : '<p class="t-muted-sm">Nenhum técnico cadastrado. O gestor inclui a equipe em Admin → Equipe.</p>'}
<p class="caption">Sem PIN? Peça ao gestor para definir em Admin → Equipe. A sessão fecha sozinha depois de ${S.tablet ? S.tablet.minutos : 10} minutos sem uso.</p>
</div></div>`;
  }
  function vPin() {
    const p = S.escolhido;
    return `<div class="mscreen mscreen--flow">${cabecalho({ voltar: true, sub: p.nome, titulo: 'Digite seu PIN' })}
<div class="mbody">${S.erro ? aviso({ tom: 'danger', texto: S.erro }) : '<p class="t-muted-sm">6 números, combinados com o gestor.</p>'}${tecladoPin({ n: S.pin.length, desabilitado: S.enviando })}</div></div>`;
  }

  /* ---------- Telas do app ---------- */
  function vHoje() {
    const minhas = [...S.osm, ...S.oss].filter((o) => ABERTA(o) && souEu(o.tecnicoId));
    const equipe = [...S.osm, ...S.oss].filter((o) => ABERTA(o) && !o.tecnicoId);
    const fazendo = S.osm.find((o) => o.status === 'andamento' && souEu(o.tecnicoId));
    const feitasHoje = [...S.osm, ...S.oss].filter((o) => o.status === 'concluida' && souEu(o.tecnicoId) && String(o.concluidaEm || '').startsWith(hojeCurto())).length;
    const nome = S.eu.nome.split(' ')[0];
    return `<div class="mscreen">${cabecalho({ sub: `${dataExtenso()}${S.tablet ? ' · ' + S.tablet.nome : ''}`, titulo: `${saudacao()}, ${nome}`, direita: `<div class="mhead__tools">${window.UI.botaoTema('ghost', 'lg')}${botaoIcone({ ico: 'log-out', rotulo: S.eu.tipo === 'tablet' ? 'Trocar técnico' : 'Sair', variante: 'ghost', tam: 'lg', a: 'sair' })}${avatar(S.eu.nome, 44, true)}</div>` })}
<div class="mbody">
${campo({ ico: 'search', tam: 'lg', ph: 'Buscar matriz por nome, código ou máquina', id: 'busca-hoje', a: 'foco-busca' })}
${vMatrizesDoDia()}
<div class="mkpis"><div class="mkpi"><span class="mkpi__k">Minhas OS</span><span class="mkpi__v">${minhas.length}</span></div><div class="mkpi"><span class="mkpi__k">Vencidas</span><span class="mkpi__v mkpi__v--danger">${S.matrizes.filter((m) => m.status === 'overdue').length}</span></div><div class="mkpi"><span class="mkpi__k">Feitas hoje</span><span class="mkpi__v mkpi__v--success">${feitasHoje}</span></div></div>
${fazendo ? `<div class="mhero"><span class="mhero__over"><span>Em andamento</span><span>${esc(fazendo.id)}</span></span><span><span class="mhero__title">${esc(fazendo.nome)}</span><span class="mhero__sub">${esc(fazendo.matriz)} · ${esc(fazendo.maquina)}</span></span><span class="stack gap-3"><span class="mhero__k"><span>Checklist</span><span>${fazendo.checks.filter(Boolean).length} de ${fazendo.checklistTotal}</span></span><span class="mhero__track"><span class="mhero__fill" style="width:${fazendo.checklistTotal ? (fazendo.checks.filter(Boolean).length / fazendo.checklistTotal) * 100 : 0}%"></span></span></span>${botao({ texto: 'Continuar manutenção', tam: 'lg', bloco: true, icoDir: 'arrow-right', a: 'executar', id: fazendo.matriz })}</div>` : ''}
<div class="msection-head"><h2 class="msection-title">Minhas tarefas</h2>${botao({ texto: 'Ver todas', variante: 'ghost', tam: 'sm', icoDir: 'arrow-right', a: 'ir', id: 'ordens' })}</div>
<div class="mlist">${minhas.filter((o) => o !== fazendo).map(cartaoOS).join('') || '<p class="t-muted-sm">Nenhuma OS com você. Veja as matrizes do dia ou as OS da equipe.</p>'}</div>
${equipe.length ? `<div class="msection-head"><h2 class="msection-title">Da equipe, sem técnico</h2></div><div class="mlist">${equipe.slice(0, 6).map(cartaoOS).join('')}</div>` : ''}
</div></div>`;
  }
  function vMatrizes() {
    const c = (s) => S.matrizes.filter((m) => m.status === s).length, q = S.busca.toLowerCase(), a = S.abaMatrizes;
    const ord = { overdue: 0, due: 1, progress: 2, ok: 3, inactive: 4 };
    const rows = S.matrizes.filter((m) => (a === 'todas' ? m.status !== 'inactive' : m.status === a)).filter((m) => !q || (m.nome + ' ' + m.id + ' ' + m.maquina).toLowerCase().includes(q)).sort((x, y) => ord[x.status] - ord[y.status] || (x.dias ?? 9999) - (y.dias ?? 9999));
    return `<div class="mscreen">${cabecalho({ titulo: 'Matrizes', sub: `${S.matrizes.length - c('inactive')} ativas · ${c('overdue')} vencidas` })}
<div class="mbody gap-6">
${campo({ ico: 'search', tam: 'lg', ph: 'Nome, código ou máquina', id: 'busca-matrizes', valor: S.busca, a: 'busca' })}
${abas({ valor: a, a: 'aba-matrizes', cls: 'tabs--muted', itens: [{ id: 'todas', rotulo: 'Todas', n: S.matrizes.length - c('inactive') }, { id: 'overdue', rotulo: 'Vencidas', n: c('overdue') }, { id: 'due', rotulo: 'Próximas', n: c('due') }, { id: 'progress', rotulo: 'Em manutenção', n: c('progress') }, { id: 'ok', rotulo: 'Em dia', n: c('ok') }] })}
<div class="mlist">${rows.map((m) => `<button type="button" class="mtile" data-acao="ir" data-id="detalhe" data-m="${esc(m.id)}"><span class="mtile__top"><span><span class="mtile__title">${esc(m.nome)}</span><span class="cell-code">${esc(m.id)} · ${esc(m.maquina)}</span></span>${status({ st: m.status, tam: 'sm' })}</span>${m.limite ? medidor({ valor: m.golpes, max: m.limite, bloco: true, mostrar: true }) : ''}<span class="mtile__foot"><span>${m.limite ? `${fmtK(m.golpes)} / ${fmtK(m.limite)} golpes` : `${m.intervalo} dias`}</span><span class="${corRel(m)}">${esc(m.rel)}</span></span></button>`).join('') || '<p class="t-muted-sm">Nenhuma matriz encontrada.</p>'}</div>
</div></div>`;
  }
  function vOrdens() {
    const a = S.abaOrdens;
    const m = S.osm.filter(ABERTA), s = S.oss.filter(ABERTA), feitas = [...S.osm, ...S.oss].filter((o) => o.status === 'concluida').slice(0, 30);
    const rows = a === 'matrizes' ? m : a === 'servicos' ? s : feitas;
    return `<div class="mscreen">${cabecalho({ titulo: 'Ordens de serviço', sub: 'Suas e da equipe' })}
<div class="mbody gap-6">${abas({ valor: a, a: 'aba-ordens', cls: 'tabs--muted tabs--start', itens: [{ id: 'matrizes', rotulo: 'Matrizes', n: m.length }, { id: 'servicos', rotulo: 'Serviços', n: s.length }, { id: 'concluidas', rotulo: 'Concluídas', n: feitas.length }] })}<div class="mlist">${rows.map(cartaoOS).join('') || '<p class="t-muted-sm">Nenhuma OS nesta aba.</p>'}</div></div></div>`;
  }
  function osDaMatriz(id) { return S.osm.find((o) => o.matriz === id && ABERTA(o)); }
  function vDetalhe() {
    const m = S.detalhe;
    if (!m) return `<div class="mscreen mscreen--flow">${cabecalho({ voltar: true, sub: topo().id, titulo: 'Carregando…' })}<div class="loading">Carregando…</div></div>`;
    const pct = m.limite ? Math.round((m.golpes / m.limite) * 100) : 0;
    const os = osDaMatriz(m.id);
    const deOutro = os && os.tecnicoId && !souEu(os.tecnicoId) && !ehGestor();
    const plano = m.criterio === 'golpes' ? `${fmtK(m.limite)} golpes` : m.criterio === 'dias' ? `${m.intervalo} dias` : `${fmtK(m.limite)} golpes ou ${m.intervalo} dias`;
    const textoBotao = m.status === 'inactive' ? 'Matriz inativa' : deOutro ? `Com ${os.tecnico}` : os && os.status !== 'aberta' ? 'Continuar manutenção' : 'Iniciar manutenção';
    return `<div class="mscreen mscreen--flow">${cabecalho({ voltar: true, sub: m.id, titulo: m.nome })}
<div class="mbody mbody--flow">
<div class="row">${status({ st: m.status, texto: m.status === 'overdue' ? m.rel : undefined })}${m.tipo !== '—' ? tag(m.tipo) : ''}${tag(m.maquina)}</div>
${m.limite ? `<div class="mpanel"><span class="row-between t-muted-sm"><span>Golpes desde a última</span><b class="usage-pct ${m.status === 'overdue' ? 't-danger' : 't-strong'}">${pct}%</b></span><span class="mbig">${fmtNum(m.golpes)}<small> / ${fmtNum(m.limite)}</small></span>${medidor({ valor: m.golpes, max: m.limite, bloco: true, alt: '8' })}</div>` : ''}
<div class="mpanel mpanel--rows">${[['Estação', m.estacao], ['Responsável', m.resp], ['Plano', plano], ['Última manutenção', m.ultima], ['Próxima prevista', m.proxima], ['Material', m.material], ['Demanda mensal', m.demanda ? `${fmtNum(m.demanda)} peças` : '—']].map(([k, v]) => `<div class="mrow"><span>${k}</span><span>${esc(v)}</span></div>`).join('')}</div>
<h2 class="msection-title msection-title--gap">Histórico</h2>
<div class="mpanel mpanel--rows">${m.historico.length ? m.historico.slice(0, 8).map((h) => `<div class="mrow mrow--item"><span class="ico-tile ${h.tipo === 'Corretiva' ? 'ico-tile--warn' : 'ico-tile--brand'}">${icone(h.tipo === 'Corretiva' ? 'hammer' : 'wrench', 16)}</span><span class="mrow__txt"><span class="cell-title">${esc(h.tipo)} · ${esc(h.data)}</span><span class="t-muted-sm">${esc(h.tec)} · ${esc(h.nota)}</span></span></div>`).join('') : '<div class="mrow"><span>Nenhuma manutenção registrada</span></div>'}</div>
</div>
<div class="mbar">${botao({ texto: textoBotao, variante: 'primary', tam: 'lg', ico: 'wrench', bloco: true, desabilitado: m.status === 'inactive' || deOutro, a: 'executar', id: m.id })}</div>
</div>`;
  }
  function vExecutar() {
    const X = S.exec;
    if (!X) return `<div class="mscreen mscreen--flow">${cabecalho({ voltar: true, sub: 'Manutenção', titulo: 'Abrindo…' })}<div class="loading">Abrindo a OS…</div></div>`;
    const m = X.matriz, total = m.checklist.length, feitos = X.checks.filter(Boolean).length;
    return `<div class="mscreen mscreen--flow">${cabecalho({ voltar: true, sub: `Manutenção ${X.os.tipo.toLowerCase()} · ${X.os.id}`, titulo: m.nome })}
<div class="mbody mbody--flow">
${total ? `<div class="stack gap-4"><span class="row-between field__label"><span>Checklist</span><span class="t-strong">${feitos} de ${total}</span></span><span class="mprogress${feitos === total ? ' is-complete' : ''}"><span style="width:${(feitos / total) * 100}%"></span></span></div>
<div class="mpanel mpanel--list">${m.checklist.map((c, i) => `<div class="mcheck${X.checks[i] ? ' is-done' : ''}" data-acao="check" data-id="${i}"><span class="no-events">${caixa({ marcado: X.checks[i], tam: 'lg' })}</span><span class="mcheck__txt">${esc(c)}</span></div>`).join('')}</div>` : aviso({ texto: 'Esta matriz não tem checklist cadastrado.' })}
<div class="mpanel gap-7"><div class="form-2">${campo({ rotulo: 'Desgaste medido', valor: X.desgaste, sufixo: 'mm', tam: 'lg', id: 'ex-desgaste', a: 'x:desgaste', extra: { inputmode: 'decimal' } })}${campo({ rotulo: 'Contador', valor: X.contador, sufixo: 'golpes', tam: 'lg', id: 'ex-contador', a: 'x:contador', extra: { inputmode: 'numeric' } })}</div>
<div class="field"><span class="field__label">Fotos</span><div class="photos">${X.fotos.map((f) => `<a class="photo" href="/fotos/${esc(f)}" target="_blank" rel="noopener"><img src="/fotos/${esc(f)}" alt="Foto da manutenção"></a>`).join('')}${X.fotos.length < 6 ? `<label class="photo photo--add">${icone('camera', 20)}${X.subindo ? 'Enviando…' : 'Adicionar'}<input type="file" accept="image/*" capture="environment" data-foto="1"></label>` : ''}</div></div>
${areaTexto({ rotulo: 'Observações', id: 'ex-obs', ph: 'Peças trocadas, anomalias, recomendações…', valor: X.obs, a: 'x:obs' })}</div>
</div>
<div class="mbar">${botao({ texto: X.enviando ? 'Registrando…' : feitos < total ? `Faltam ${total - feitos} ite${total - feitos === 1 ? 'm' : 'ns'}` : 'Concluir manutenção', variante: 'dark', tam: 'lg', ico: 'check', bloco: true, desabilitado: feitos < total || X.enviando || X.subindo, a: 'concluir' })}</div>
</div>`;
  }
  function vConcluido() {
    const m = S.detalhe || { nome: '', id: topo().id, intervalo: 0 };
    return `<div class="done"><div class="done__main"><span class="done__icon">${icone('circle-check', 40)}</span><h1 class="done__title">Manutenção registrada</h1><p class="done__text">${esc(m.nome)} (${esc(m.id)}) voltou para <b>Em dia</b>. Contador zerado${m.intervalo ? `; próxima prevista em ${m.intervalo} dias` : ''}.</p></div><div class="stack gap-4">${botao({ texto: 'Voltar para Hoje', variante: 'dark', tam: 'lg', bloco: true, a: 'ir', id: 'hoje' })}</div></div>`;
  }
  function vServico() {
    const o = S.oss.find((x) => x.id === topo().id);
    if (!o) return `<div class="mscreen mscreen--flow">${cabecalho({ voltar: true, titulo: 'OS não encontrada' })}</div>`;
    const deOutro = o.tecnicoId && !souEu(o.tecnicoId) && !ehGestor();
    const st = OS_ST[o.status];
    let acoes = '';
    if (!deOutro && o.status === 'aberta') acoes = botao({ texto: 'Iniciar serviço', variante: 'primary', tam: 'lg', ico: 'play', bloco: true, a: 'oss', id: 'andamento' });
    if (!deOutro && o.status === 'andamento') acoes = botaoIcone({ ico: 'circle-pause', rotulo: 'Aguardando peça', tam: 'xl', a: 'oss', id: 'peca' }) + botao({ texto: 'Concluir serviço', variante: 'dark', tam: 'lg', ico: 'check', bloco: true, a: 'oss', id: 'concluida' });
    if (!deOutro && o.status === 'peca') acoes = botao({ texto: 'Peça recebida', variante: 'dark', tam: 'lg', bloco: true, a: 'oss', id: 'andamento' });
    return `<div class="mscreen mscreen--flow">${cabecalho({ voltar: true, sub: `OS - Serviço · ${o.id}`, titulo: o.servico })}
<div class="mbody mbody--flow">
<div class="row">${status({ tom: st.tone, texto: st.label })}${tag(`${o.quantidade} peça${o.quantidade > 1 ? 's' : ''}`)}</div>
<div class="mpanel"><span class="t-body-sm">${esc(o.descricao)}</span></div>
<div class="mpanel mpanel--rows">${[['Solicitante', o.solicitante], ['Setor', o.setor], ['Técnico', o.tecnico], ['Abertura', o.abertura], ['Prazo', o.prazoHoje ? 'Hoje' : o.prazo]].map(([k, v]) => `<div class="mrow"><span>${k}</span><span>${esc(v)}</span></div>`).join('')}</div>
${deOutro ? aviso({ texto: `Esta OS está com ${o.tecnico}.` }) : ABERTA(o) ? `<div class="mpanel">${areaTexto({ rotulo: 'Observações', id: 'oss-obs', ph: 'Medidas, material usado, pendências…', valor: S.servicoObs, a: 'x:servicoObs' })}</div>` : o.observacoes ? `<div class="mpanel"><span class="t-muted-sm">${esc(o.observacoes)}</span></div>` : ''}
</div>
${acoes ? `<div class="mbar">${acoes}</div>` : ''}
</div>`;
  }
  function vBarraAbas() {
    const raizAtual = S.pilha[0].t;
    return `<nav class="tabbar">${[['hoje', 'house', 'Hoje'], ['matrizes', 'layers', 'Matrizes'], ['ordens', 'clipboard-list', 'Ordens']].map(([id, ico, rot]) => `<button type="button" class="tabbar__btn${raizAtual === id ? ' is-active' : ''}" data-acao="ir" data-id="${id}"><span class="tabbar__pill">${icone(ico, 20)}</span>${rot}</button>`).join('')}</nav>`;
  }
  function vApp() {
    if (S.fase === 'carregando') return '<div class="mapp"><div class="loading">Carregando…</div></div>';
    if (S.fase === 'liberar') return `<div class="mapp" data-screen-label="liberar">${vLiberar()}</div>`;
    if (S.fase === 'quem') return `<div class="mapp" data-screen-label="quem">${vQuem()}</div>`;
    if (S.fase === 'pin') return `<div class="mapp" data-screen-label="pin">${vPin()}</div>`;
    const t = topo();
    const tela = { hoje: vHoje, matrizes: vMatrizes, ordens: vOrdens, detalhe: vDetalhe, executar: vExecutar, concluido: vConcluido, servico: vServico }[t.t]();
    return `<div class="mapp" data-screen-label="${t.t}">${tela}${RAIZES.includes(t.t) ? vBarraAbas() : ''}</div>`;
  }

  /* ---------- Entrada e saída ---------- */
  async function telaDeEntrada() {
    API.aoSair = null; S.eu = null; S.pilha = [{ t: 'hoje' }]; S.exec = null; S.detalhe = null; S.pin = ''; S.erro = '';
    try { S.tablet = await API.get('/api/tablet'); } catch (e) { S.tablet = null; }
    S.fase = S.tablet && S.tablet.liberado ? 'quem' : 'liberar';
    render();
  }
  async function entrou(eu) {
    S.eu = eu; S.fase = 'app'; S.pin = ''; S.erro = ''; S.escolhido = null;
    API.aoSair = () => { API.aoSair = null; toast('Sua sessão terminou. Entre de novo.', 'info'); telaDeEntrada(); };
    try { if (!S.tablet) S.tablet = await API.get('/api/tablet'); if (S.tablet && !S.tablet.liberado) S.tablet = null; } catch (e) { S.tablet = null; }
    await atualizar();
    ultimoToque = Date.now();
  }
  async function tentarPin() {
    S.enviando = true; render();
    try { const eu = await API.post('/api/tablet/entrar', { pessoaId: S.escolhido.id, pin: S.pin }); S.enviando = false; await entrou(eu); return; } catch (e) { S.erro = e.message; S.pin = ''; }
    S.enviando = false; render();
  }
  /* Sai sozinho depois de alguns minutos sem uso (só no tablet) */
  let ultimoToque = Date.now();
  ['pointerdown', 'keydown'].forEach((ev) => document.addEventListener(ev, () => { ultimoToque = Date.now(); }, { passive: true }));
  setInterval(async () => {
    if (S.fase !== 'app' || !S.eu || S.eu.tipo !== 'tablet') return;
    if (Date.now() - ultimoToque > (S.eu.minutosTablet || 10) * 60000) { try { await API.post('/api/sair'); } catch (e) { /* segue */ } toast('Sessão encerrada por inatividade', 'info'); telaDeEntrada(); }
  }, 20000);

  /* ---------- Ações ---------- */
  async function abrirExecucao(id) {
    S.exec = null; ir('executar', id);
    try {
      const [m, os] = await Promise.all([API.get(`/api/matrizes/${API.u(id)}`), API.post('/api/os-matrizes/iniciar', { matriz: id })]);
      S.detalhe = m;
      S.exec = { matriz: m, os, checks: m.checklist.map((_, i) => !!os.checks[i]), desgaste: '', contador: String(m.golpes || ''), obs: '', fotos: [], enviando: false, subindo: false };
    } catch (e) { falhou(e); S.pilha.pop(); }
    render();
  }
  let salvarChecks = null;
  const ACOES = {
    nada() {},
    ir: (el) => ir(el.dataset.id, el.dataset.m),
    voltar: () => { if (S.fase === 'pin') { S.fase = 'quem'; S.pin = ''; S.erro = ''; render(); } else voltar(); },
    tema: () => { window.UI.alternarTema(); render(); },
    sair: async () => { try { await API.post('/api/sair'); } catch (e) { /* segue */ } if (S.eu && S.eu.tipo === 'admin') { location.href = '/entrar/?volta=/tecnico/'; return; } telaDeEntrada(); },
    escolher: (el) => { S.escolhido = S.tablet.tecnicos.find((p) => p.id === el.dataset.id); S.pin = ''; S.erro = ''; S.fase = 'pin'; render(); },
    pin: (el) => {
      if (S.enviando) return;
      const k = el.dataset.id;
      if (k === 'apagar') S.pin = S.pin.slice(0, -1); else if (S.pin.length < 6) S.pin += k;
      S.erro = '';
      if (S.pin.length === 6) return tentarPin();
      render();
    },
    'aba-matrizes': (el) => { S.abaMatrizes = el.dataset.id; render(); },
    'aba-ordens': (el) => { S.abaOrdens = el.dataset.id; render(); },
    executar: (el) => abrirExecucao(el.dataset.id),
    check: (el) => {
      const X = S.exec, i = Number(el.dataset.id);
      X.checks[i] = !X.checks[i]; render();
      clearTimeout(salvarChecks);
      salvarChecks = setTimeout(() => API.patch(`/api/os-matrizes/${API.u(X.os.id)}`, { checks: X.checks }).catch(falhou), 600);
    },
    concluir: async () => {
      const X = S.exec;
      X.enviando = true; render();
      try {
        const r = await API.post('/api/manutencoes', { matriz: X.matriz.id, os: X.os.id, checklist: X.checks, desgasteMm: X.desgaste, golpesContador: X.contador, obs: X.obs, fotos: X.fotos });
        S.detalhe = r.matriz; S.exec = null;
        S.pilha = [{ t: 'hoje' }, { t: 'concluido', id: X.matriz.id }];
        carregarDados().catch(() => {});
        render(); window.scrollTo(0, 0);
      } catch (e) { X.enviando = false; falhou(e); render(); }
    },
    oss: async (el) => {
      const o = S.oss.find((x) => x.id === topo().id);
      try {
        await API.patch(`/api/os-servicos/${API.u(o.id)}`, { status: el.dataset.id, observacoes: S.servicoObs });
        toast(el.dataset.id === 'concluida' ? 'Serviço concluído' : el.dataset.id === 'peca' ? 'Aguardando peça' : 'Serviço em andamento');
        await carregarDados();
        if (el.dataset.id === 'concluida') return voltar();
      } catch (e) { falhou(e); }
      render();
    },
  };
  document.addEventListener('click', (e) => {
    const lab = e.target.closest('label.check, label.radio, label.switch');
    if (lab && e.target.tagName !== 'INPUT' && !lab.closest('[data-acao]')) return;
    const el = e.target.closest('[data-acao]');
    if (!el || el.disabled) return;
    const fn = ACOES[el.dataset.acao];
    if (fn) fn(el, e);
  });
  document.addEventListener('input', (e) => {
    const c = e.target.dataset && e.target.dataset.campo;
    if (!c) return;
    if (c === 'busca') { S.busca = e.target.value; render(); }
    else if (c === 'x:servicoObs') S.servicoObs = e.target.value;
    else if (c.startsWith('x:') && S.exec) S.exec[c.slice(2)] = e.target.value;
  });
  document.addEventListener('change', async (e) => {
    if (!e.target.dataset || !e.target.dataset.foto || !e.target.files[0] || !S.exec) return;
    const X = S.exec;
    X.subindo = true; render();
    try { const dataUrl = await API.reduzirFoto(e.target.files[0]); const r = await API.post('/api/fotos', { dataUrl }); X.fotos.push(r.nome); } catch (err) { falhou(err); }
    X.subindo = false; render();
  });
  document.addEventListener('focusin', (e) => {
    if (e.target.dataset && e.target.dataset.campo === 'foco-busca') { S.pilha = [{ t: 'matrizes' }]; render(); const n = document.getElementById('busca-matrizes'); if (n) n.focus(); }
  });
  document.addEventListener('keydown', (e) => {
    if (S.fase === 'pin' && /^\d$/.test(e.key)) { ACOES.pin({ dataset: { id: e.key } }); return; }
    if (S.fase === 'pin' && e.key === 'Backspace') ACOES.pin({ dataset: { id: 'apagar' } });
  });
  document.addEventListener('submit', async (e) => {
    if (!e.target.closest('[data-form="liberar"]')) return;
    e.preventDefault();
    S.lib.nome = valor('t-nome') || S.lib.nome;
    const cred = { nome: S.lib.nome, matricula: valor('t-matricula'), senha: valor('t-senha') }; /* lê antes de redesenhar */
    S.enviando = true; S.erro = ''; render();
    try { await API.post('/api/tablet/liberar', cred); S.enviando = false; toast('Tablet liberado'); await telaDeEntrada(); return; } catch (err) { S.erro = err.message; }
    S.enviando = false; render();
  });

  API.get('/api/eu').then(entrou).catch((e) => { if (e.status === 401 || e.status === 0) telaDeEntrada(); });
})();
