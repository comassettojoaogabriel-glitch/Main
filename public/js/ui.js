/* SCREW · helpers de componentes (geram HTML com as classes de css/app.css).
   Toda tela deve montar a interface com estas funções — não escreva estilos inline de cor/fonte. */
(function () {
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
  const attrs = (o = {}) => Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== false).map(([k, v]) => (v === true ? ` ${k}` : ` ${k}="${esc(v)}"`)).join('');
  const acao = (a, id, extra) => attrs({ 'data-acao': a, 'data-id': id, ...(extra || {}) });

  function icone(nome, tam = 18, cls = '') {
    const svg = (window.ICONES || {})[nome] || '';
    return `<span class="ico ${cls}" style="width:${tam}px;height:${tam}px" aria-hidden="true">${svg}</span>`;
  }

  /* Botão — variante: primary | secondary | dark | soft | neutral | outline | destructive | ghost */
  function botao({ texto = '', variante = 'secondary', tam = 'md', ico, icoDir, bloco, desabilitado, a, id, extra, cls = '', tipo = 'button' } = {}) {
    const bolha = ico && variante === 'primary';
    const isz = tam === 'sm' ? 16 : 18;
    const c = ['btn', variante !== 'secondary' ? `btn--${variante}` : '', tam !== 'md' ? `btn--${tam}` : '', bloco ? 'btn--block' : '', bolha ? 'btn--bubble' : '', cls].filter(Boolean).join(' ');
    const lead = bolha ? `<span class="btn__bubble">${icone(ico, isz - 2)}</span>` : ico ? icone(ico, isz) : '';
    return `<button type="${tipo}" class="${c}"${desabilitado ? ' disabled' : ''}${a ? acao(a, id, extra) : ''}>${lead}${texto}${icoDir ? icone(icoDir, isz) : ''}</button>`;
  }

  /* Botão de ícone — variante: secondary | ghost | neutral | dark | soft · tam: sm | md | lg | xl */
  function botaoIcone({ ico, rotulo, variante = 'secondary', tam = 'md', ponto, a, id, extra, cls = '', desabilitado } = {}) {
    const isz = tam === 'sm' ? 16 : tam === 'md' ? 18 : 20;
    const c = ['icon-btn', variante !== 'secondary' ? `icon-btn--${variante}` : '', tam !== 'md' ? `icon-btn--${tam}` : '', cls].filter(Boolean).join(' ');
    return `<button type="button" class="${c}" aria-label="${esc(rotulo)}" title="${esc(rotulo)}"${desabilitado ? ' disabled' : ''}${a ? acao(a, id, extra) : ''}>${icone(ico, isz)}${ponto ? '<span class="icon-btn__dot"></span>' : ''}</button>`;
  }

  /* Status — presets de manutenção: ok | due | overdue | progress | inactive */
  const STATUS = { ok: ['success', 'Em dia'], due: ['warning', 'Próxima'], overdue: ['danger', 'Vencida'], progress: ['brand', 'Em manutenção'], inactive: ['neutral', 'Inativa'] };
  function status({ st, tom, texto, tam = 'md' } = {}) {
    const p = st ? STATUS[st] : null;
    const t = tom || (p && p[0]) || 'neutral';
    return `<span class="pill pill--${t}${tam === 'sm' ? ' pill--sm' : ''}"><span class="pill__dot"></span>${esc(texto ?? (p && p[1]))}</span>`;
  }

  function chip({ texto, selecionado, a, id, extra, ico } = {}) {
    const lead = selecionado ? icone('check', 13) : ico ? icone(ico, 13) : '';
    return `<button type="button" class="chip${selecionado ? ' is-selected' : ''}"${a ? acao(a, id, extra) : ''}>${lead}${esc(texto)}</button>`;
  }
  function chipFiltro({ texto, a, id }) {
    return `<span class="chip chip--filter">${esc(texto)}<button type="button" class="chip__x" aria-label="Remover filtro"${acao(a, id)}>${icone('x', 12)}</button></span>`;
  }
  const tag = (texto, ico) => `<span class="tag">${ico ? icone(ico, 12) : ''}${esc(texto)}</span>`;
  const badge = (n, tom) => `<span class="badge${tom ? ' badge--' + tom : ''}">${esc(n)}</span>`;
  function delta({ valor, dir = 'up', bom, noAcento } = {}) {
    const ok = bom !== undefined ? bom : dir === 'up';
    return `<span class="delta${noAcento ? ' delta--on-accent' : ok ? '' : ' delta--bad'}">${icone(dir === 'up' ? 'arrow-up' : 'arrow-down', 11)}${esc(valor)}</span>`;
  }

  /* Medidor: verde < 70% · âmbar ≥ 70% · vermelho ≥ 90% */
  function medidor({ valor = 0, max = 100, rotulo, mostrar, bloco, alt, aviso = 70, perigo = 90, cls = '' } = {}) {
    const pct = max > 0 ? Math.max(0, (valor / max) * 100) : 0;
    const tom = pct >= perigo ? ' meter--danger' : pct >= aviso ? ' meter--warn' : '';
    const c = `meter${tom}${bloco ? ' meter--block' : ''}${alt ? ' meter--' + alt : ''} ${cls}`;
    return `<span class="${c}"><span class="meter__track"><span class="meter__fill" style="width:${Math.min(100, pct)}%"></span></span>${mostrar ? `<span class="meter__label">${esc(rotulo ?? Math.round(pct) + '%')}</span>` : ''}</span>`;
  }

  function avatar(nome = '', tam = 32, marca) {
    const p = nome.trim().split(/\s+/).filter(Boolean);
    const ini = p.length ? ((p[0][0] || '') + (p.length > 1 ? p[p.length - 1][0] : p[0][1] || '')).toUpperCase() : '?';
    return `<span class="avatar${tam !== 32 ? ' avatar--' + tam : ''}${marca ? ' avatar--brand' : ''}" title="${esc(nome)}">${esc(ini)}</span>`;
  }

  /* Campos de formulário */
  function campo({ rotulo, obrig, dica, erro, id, valor = '', ph = '', ico, sufixo, tam = 'md', cheio, desabilitado, tipo = 'text', mono, a, cls = '', extra } = {}) {
    const c = ['control', tam !== 'md' ? `control--${tam}` : '', cheio ? 'control--filled' : '', erro ? 'control--error' : '', desabilitado ? 'control--disabled' : '', mono ? 'control--mono' : ''].filter(Boolean).join(' ');
    const input = `<div class="${c}">${ico ? icone(ico, 16) : ''}<input type="${tipo}"${attrs({ id, value: valor, placeholder: ph, disabled: desabilitado, 'aria-invalid': erro ? 'true' : undefined, 'data-campo': a, ...(extra || {}) })}>${sufixo ? `<span class="control__suffix">${esc(sufixo)}</span>` : ''}</div>`;
    return casca({ rotulo, obrig, dica, erro, id, cls, corpo: input });
  }
  function selecao({ rotulo, obrig, dica, erro, id, valor = '', ph, opcoes = [], tam = 'md', a, cls = '' } = {}) {
    /* opcoes: textos simples ou objetos { v: valor, t: texto } */
    const ops = (ph ? `<option value="" disabled${valor === '' || valor == null ? ' selected' : ''}>${esc(ph)}</option>` : '') + opcoes.map((o) => (o && typeof o === 'object' ? `<option value="${esc(o.v)}"${String(o.v) === String(valor) ? ' selected' : ''}>${esc(o.t)}</option>` : `<option${o === valor ? ' selected' : ''}>${esc(o)}</option>`)).join('');
    const corpo = `<div class="control control--select${tam !== 'md' ? ' control--' + tam : ''}${erro ? ' control--error' : ''}"><select${attrs({ id, 'data-campo': a, class: (valor === '' || valor == null) && ph ? 'is-empty' : undefined, 'aria-invalid': erro ? 'true' : undefined })}>${ops}</select>${icone('chevron-down', 16)}</div>`;
    return casca({ rotulo, obrig, dica, erro, id, cls, corpo });
  }
  function areaTexto({ rotulo, obrig, dica, erro, id, ph = '', linhas = 3, valor = '', a, cls = '' } = {}) {
    return casca({ rotulo, obrig, dica, erro, id, cls, corpo: `<textarea class="textarea${erro ? ' textarea--error' : ''}"${attrs({ id, rows: linhas, placeholder: ph, 'data-campo': a, 'aria-invalid': erro ? 'true' : undefined })}>${esc(valor)}</textarea>` });
  }
  function casca({ rotulo, obrig, dica, erro, id, cls = '', corpo }) {
    return `<div class="field ${cls}">${rotulo ? `<label class="field__label"${id ? ` for="${esc(id)}"` : ''}>${esc(rotulo)}${obrig ? '<span class="field__req"> *</span>' : ''}</label>` : ''}${corpo}${erro ? `<span class="field__error">${esc(erro)}</span>` : dica ? `<span class="field__hint">${esc(dica)}</span>` : ''}</div>`;
  }
  function caixa({ rotulo, desc, marcado, misto, desabilitado, a, id, tam } = {}) {
    return `<label class="check${desc ? ' check--top' : ''}${tam ? ' check--' + tam : ''}"><input type="checkbox"${marcado ? ' checked' : ''}${desabilitado ? ' disabled' : ''}${misto ? ' data-misto="1"' : ''}${a ? acao(a, id) : ''}><span class="check__box">${icone('check', (tam === 'lg' ? 22 : tam === 'sm' ? 16 : 18) - 6, 'ico-on')}${icone('minus', 12, 'ico-mixed')}</span>${rotulo || desc ? `<span class="choice__text">${rotulo ? `<span class="choice__label">${esc(rotulo)}</span>` : ''}${desc ? `<span class="choice__desc">${esc(desc)}</span>` : ''}</span>` : ''}</label>`;
  }
  function radio({ nome, valor, rotulo, desc, marcado, desabilitado, a } = {}) {
    return `<label class="radio${desc ? ' radio--top' : ''}"><input type="radio" name="${esc(nome)}" value="${esc(valor)}"${marcado ? ' checked' : ''}${desabilitado ? ' disabled' : ''}${a ? acao(a, valor) : ''}><span class="radio__dot"></span><span class="choice__text"><span class="choice__label">${esc(rotulo)}</span>${desc ? `<span class="choice__desc">${esc(desc)}</span>` : ''}</span></label>`;
  }
  function chave({ rotulo, desc, ligado, tam, desabilitado, a } = {}) {
    return `<label class="switch${desc ? ' switch--top' : ''}${tam === 'sm' ? ' switch--sm' : ''}"><input type="checkbox" role="switch"${ligado ? ' checked' : ''}${desabilitado ? ' disabled' : ''}${a ? acao(a) : ''}><span class="switch__track"></span>${rotulo || desc ? `<span class="choice__text">${rotulo ? `<span class="choice__label">${esc(rotulo)}</span>` : ''}${desc ? `<span class="choice__desc">${esc(desc)}</span>` : ''}</span>` : ''}</label>`;
  }
  function segmentado({ opcoes = [], valor, a, tam, bloco } = {}) {
    return `<div class="segmented${tam === 'sm' ? ' segmented--sm' : ''}${bloco ? ' segmented--block' : ''}" role="radiogroup">${opcoes.map((o) => `<button type="button" role="radio" aria-checked="${o === valor}" class="segmented__opt${o === valor ? ' is-active' : ''}"${acao(a, o)}>${esc(o)}</button>`).join('')}</div>`;
  }
  /* Abas — itens: [{id, rotulo, n}] · variante: track (padrão) | pill */
  function abas({ itens = [], valor, a, pill, cls = '' } = {}) {
    return `<div class="tabs${pill ? ' tabs--pill' : ''} ${cls}" role="tablist">${itens.map((i) => `<button type="button" role="tab" aria-selected="${i.id === valor}" class="tab${i.id === valor ? ' is-active' : ''}"${acao(a, i.id)}>${esc(i.rotulo)}${i.n !== undefined ? `<span class="tab__count">${esc(i.n)}</span>` : ''}</button>`).join('')}</div>`;
  }
  function paginacao({ pagina = 1, total = 1, resumo, a } = {}) {
    let ps;
    if (total <= 5) ps = Array.from({ length: total }, (_, i) => i + 1);
    else if (pagina <= 3) ps = [1, 2, 3, 4, '…', total];
    else if (pagina >= total - 2) ps = [1, '…', total - 3, total - 2, total - 1, total];
    else ps = [1, '…', pagina - 1, pagina, pagina + 1, '…', total];
    const nav = (d) => `<button type="button" class="page-nav"${(d < 0 ? pagina <= 1 : pagina >= total) ? ' disabled' : ''}${acao(a, pagina + d)}>${d < 0 ? icone('chevron-left', 14) + '<span class="page-nav__txt">Anterior</span>' : '<span class="page-nav__txt">Próxima</span>' + icone('chevron-right', 14)}</button>`;
    return `<div class="pagination"><span class="pagination__summary">${resumo ? esc(resumo) : ''}</span><div class="pagination__pages">${nav(-1)}${ps.map((p, i) => (p === '…' ? `<span class="page-gap" data-k="${i}">…</span>` : `<button type="button" class="page-num${p === pagina ? ' is-current' : ''}"${acao(a, p)}>${p}</button>`)).join('')}${nav(1)}</div></div>`;
  }
  function etapas({ passos = [], atual = 0, a } = {}) {
    return `<div class="stepper">${passos.map((p, i) => `<button type="button" class="step${i < atual ? ' is-done' : i === atual ? ' is-active' : ''}"${acao(a, i)}><span class="step__bar"></span><span class="step__row"><span class="step__num">${i < atual ? icone('check', 12) : i + 1}</span><span class="step__label">${esc(p)}</span></span></button>`).join('')}</div>`;
  }
  /* Indicador (KPI) — variante: default | highlight | plain */
  function indicador({ rotulo, valor, unidade, delta: d, dir = 'up', bom, sobre, ico, linhas, variante = 'default', a, id } = {}) {
    const hl = variante === 'highlight';
    const tagN = a ? 'button' : 'div';
    return `<${tagN}${a ? ' type="button"' : ''} class="stat${variante !== 'default' ? ' stat--' + variante : ''}${a ? ' stat--link' : ''}"${a ? acao(a, id) : ''}>
<span class="stat__top"><span class="stat__label">${ico ? icone(ico, 16) : ''}${esc(rotulo)}</span>${sobre ? `<span class="stat__over">${esc(sobre)}</span>` : ''}</span>
<span class="stat__valrow"><span class="stat__value">${esc(valor)}${unidade ? `<span class="stat__unit">${esc(unidade)}</span>` : ''}</span>${d ? delta({ valor: d, dir, bom, noAcento: hl }) : ''}</span>
${linhas && linhas.length ? `<span class="stat__rows">${linhas.map(([k, v]) => `<span class="stat__row"><span>${esc(k)}</span><span>${esc(v)}</span></span>`).join('')}</span>` : ''}</${tagN}>`;
  }
  function cartao({ titulo, sub, acoes, corpo, cls = '', corpoCls = '' } = {}) {
    return `<section class="card ${cls}">${titulo || acoes ? `<header class="card__head"><div>${titulo ? `<h3 class="card__title">${esc(titulo)}</h3>` : ''}${sub ? `<p class="card__sub">${esc(sub)}</p>` : ''}</div>${acoes ? `<div class="card__actions">${acoes}</div>` : ''}</header>` : ''}<div class="card__body ${corpoCls}">${corpo || ''}</div></section>`;
  }

  /* Tema claro/escuro — salvo no navegador */
  function aplicarTema(t) { document.documentElement.dataset.theme = t; try { localStorage.setItem('screw-tema', t); } catch (e) {} }
  function alternarTema() { aplicarTema(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'); }
  function botaoTema(variante = 'secondary', tam = 'md') {
    const escuro = document.documentElement.dataset.theme === 'dark';
    return botaoIcone({ ico: escuro ? 'sun' : 'moon', rotulo: escuro ? 'Tema claro' : 'Tema escuro', variante, tam, a: 'tema' });
  }

  /* Renderização com preservação de foco e rolagem */
  function montar(raiz, html) {
    const ativo = document.activeElement;
    const idAtivo = ativo && ativo.id;
    let sel = null;
    try { if (idAtivo && 'selectionStart' in ativo) sel = [ativo.selectionStart, ativo.selectionEnd]; } catch (e) {}
    const rol = {};
    raiz.querySelectorAll('[data-rolagem]').forEach((el) => { rol[el.dataset.rolagem] = el.scrollTop; });
    raiz.innerHTML = html;
    raiz.querySelectorAll('input[data-misto]').forEach((el) => { el.indeterminate = true; });
    raiz.querySelectorAll('[data-rolagem]').forEach((el) => { if (rol[el.dataset.rolagem]) el.scrollTop = rol[el.dataset.rolagem]; });
    if (idAtivo) {
      const n = document.getElementById(idAtivo);
      if (n) { n.focus(); if (sel) { try { n.setSelectionRange(sel[0], sel[1]); } catch (e) {} } }
    }
  }

  /* Aviso em linha — tom: info | success | warning | danger */
  const ICO_AVISO = { info: 'info', success: 'circle-check', warning: 'triangle-alert', danger: 'circle-alert' };
  function aviso({ tom = 'info', texto, ico, acao = '', cls = '' } = {}) {
    return `<div class="notice notice--${tom} ${cls}" role="${tom === 'danger' ? 'alert' : 'status'}">${icone(ico || ICO_AVISO[tom], 16)}<span class="notice__text">${esc(texto)}</span>${acao}</div>`;
  }
  /* Aviso passageiro no rodapé da tela (some sozinho) */
  function toast(texto, tom = 'success') {
    const velho = document.querySelector('.notice--toast');
    if (velho) velho.remove();
    const el = document.createElement('div');
    el.innerHTML = aviso({ tom, texto, cls: 'notice--toast' });
    const n = el.firstElementChild;
    document.body.appendChild(n);
    setTimeout(() => { n.classList.add('is-leaving'); setTimeout(() => n.remove(), 300); }, 3200);
  }
  /* Teclado de PIN — n: dígitos já digitados */
  function tecladoPin({ n = 0, total = 6, a = 'pin', desabilitado } = {}) {
    const dots = Array.from({ length: total }, (_, i) => `<span class="pin-dot${i < n ? ' is-on' : ''}"></span>`).join('');
    const tecla = (k) => `<button type="button" class="keypad__key" data-acao="${a}" data-id="${k}"${desabilitado ? ' disabled' : ''}>${k}</button>`;
    return `<div class="pin"><div class="pin-dots" aria-label="${n} de ${total} dígitos">${dots}</div><div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(tecla).join('')}<span></span>${tecla(0)}<button type="button" class="keypad__key keypad__key--ghost" data-acao="${a}" data-id="apagar" aria-label="Apagar"${desabilitado ? ' disabled' : ''}>${icone('delete', 22)}</button></div></div>`;
  }

  window.UI = { aviso, toast, tecladoPin, esc, icone, botao, botaoIcone, status, chip, chipFiltro, tag, badge, delta, medidor, avatar, campo, selecao, areaTexto, caixa, radio, chave, segmentado, abas, paginacao, etapas, indicador, cartao, aplicarTema, alternarTema, botaoTema, montar, STATUS };
  /* Números em pt-BR */
  window.fmtNum = (n) => Number(n || 0).toLocaleString('pt-BR');
  window.fmtK = (n) => (n >= 1000000 ? (n / 1000000).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi' : n >= 1000 ? (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k' : String(n || 0));
})();
