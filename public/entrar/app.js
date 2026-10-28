/* SCREW · Entrada do Admin (níveis 1 e 2): entrar, criar conta e confirmar o código de 6 dígitos.
   Técnicos não usam esta tela: entram pelo tablet da Matrizaria (/tecnico/) com o PIN. */
(function () {
  const { esc, icone, botao, campo, aviso, montar } = window.UI;
  const raiz = document.getElementById('app');
  const S = { modo: 'entrar', erro: '', campos: {}, enviando: false, matricula: '', para: '', modoTeste: false, espera: 0 };
  const volta = () => { const v = new URLSearchParams(location.search).get('volta'); return v && v.startsWith('/') && !v.startsWith('//') ? v : '/admin/'; };
  const valor = (id) => (document.getElementById(id) || {}).value || '';
  const render = () => montar(raiz, vApp());

  function cabeca(titulo, sub) {
    return `<div class="auth__head"><span class="overline t-subtle">Matrizaria · Manutenção preventiva</span><h1 class="auth__title">${esc(titulo)}</h1><p class="auth__sub">${sub}</p></div>`;
  }
  const erroGeral = () => (S.erro ? aviso({ tom: 'danger', texto: S.erro }) : '');
  const errCampo = (k) => S.campos[k];

  function vEntrar() {
    return `<form class="stack gap-8" data-form="entrar" novalidate>
${cabeca('Entrar', 'Use sua matrícula e senha.')}
${erroGeral()}
${campo({ rotulo: 'Matrícula', id: 'f-matricula', ico: 'user', valor: S.matricula, tam: 'lg', extra: { autocomplete: 'username', inputmode: 'numeric', name: 'matricula' } })}
${campo({ rotulo: 'Senha', id: 'f-senha', ico: 'key-round', tipo: 'password', tam: 'lg', extra: { autocomplete: 'current-password', name: 'senha' } })}
${botao({ texto: S.enviando ? 'Entrando…' : 'Entrar', variante: 'primary', tam: 'lg', bloco: true, tipo: 'submit', desabilitado: S.enviando })}
<div class="auth__alt"><span>Primeiro acesso?</span>${botao({ texto: 'Criar conta', variante: 'ghost', tam: 'sm', a: 'modo', id: 'criar' })}</div>
</form>`;
  }
  function vCriar() {
    return `<form class="stack gap-8" data-form="criar" novalidate>
${cabeca('Criar conta', 'Para gestores e administradores já cadastrados na Equipe. Você recebe um código por e-mail.')}
${erroGeral()}
${campo({ rotulo: 'Matrícula', obrig: true, id: 'f-matricula', ico: 'user', valor: S.matricula, erro: errCampo('matricula'), extra: { autocomplete: 'username', inputmode: 'numeric' } })}
${campo({ rotulo: 'E-mail', obrig: true, id: 'f-email', ico: 'mail', tipo: 'email', valor: S.email || '', erro: errCampo('email'), extra: { autocomplete: 'email' } })}
${campo({ rotulo: 'Senha', obrig: true, id: 'f-senha', ico: 'key-round', tipo: 'password', dica: 'Mínimo de 8 caracteres', erro: errCampo('senha'), extra: { autocomplete: 'new-password' } })}
${campo({ rotulo: 'Confirmar senha', obrig: true, id: 'f-confirmar', ico: 'key-round', tipo: 'password', erro: errCampo('confirmar'), extra: { autocomplete: 'new-password' } })}
${botao({ texto: S.enviando ? 'Enviando…' : 'Enviar código', variante: 'primary', tam: 'lg', bloco: true, tipo: 'submit', desabilitado: S.enviando })}
<div class="auth__alt"><span>Já tem conta?</span>${botao({ texto: 'Entrar', variante: 'ghost', tam: 'sm', a: 'modo', id: 'entrar' })}</div>
</form>`;
  }
  function vCodigo() {
    return `<form class="stack gap-8" data-form="codigo" novalidate>
${cabeca('Confirme o código', `Enviamos 6 números para <b class="t-strong">${esc(S.para)}</b>. O código vale por 15 minutos.`)}
${S.modoTeste ? aviso({ tom: 'warning', texto: 'Modo teste: o Gmail não está configurado e o código aparece no terminal do servidor.' }) : ''}
${erroGeral()}
${campo({ rotulo: 'Código', id: 'f-codigo', tam: 'lg', cls: 'code-input', ph: '000000', valor: S.codigo || '', extra: { inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: 6 } })}
${botao({ texto: S.enviando ? 'Confirmando…' : 'Confirmar e entrar', variante: 'primary', tam: 'lg', bloco: true, tipo: 'submit', desabilitado: S.enviando })}
<div class="auth__alt">${botao({ texto: S.espera > 0 ? `Reenviar código em ${S.espera} s` : 'Reenviar código', variante: 'ghost', tam: 'sm', desabilitado: S.espera > 0, a: 'reenviar' })}${botao({ texto: 'Voltar', variante: 'ghost', tam: 'sm', a: 'modo', id: 'criar' })}</div>
</form>`;
  }
  function vApp() {
    const corpo = S.modo === 'codigo' ? vCodigo() : S.modo === 'criar' ? vCriar() : vEntrar();
    return `<div class="auth"><main class="auth__card"><img class="auth__banner" src="/design/assets/marca/screw-banner.jpg" alt="SCREW"><div class="auth__body">${corpo}</div></main>
<div class="auth__foot"><span>Técnicos entram pelo tablet da Matrizaria, com o PIN.</span>${window.UI.botaoTema('ghost', 'sm')}</div></div>`;
  }

  let relogio = null;
  /* guarda o código digitado: a contagem do Reenviar redesenha a tela a cada segundo */
  document.addEventListener('input', (e) => { if (e.target.id === 'f-codigo') S.codigo = e.target.value; });
  function contar() {
    S.espera = 60; clearInterval(relogio);
    relogio = setInterval(() => { S.espera -= 1; if (S.espera <= 0) clearInterval(relogio); render(); }, 1000);
  }
  async function enviar(tipo) {
    S.erro = ''; S.campos = {};
    S.matricula = valor('f-matricula') || S.matricula;
    /* lê tudo antes de redesenhar a tela (redesenhar limpa as senhas) */
    const v = { senha: valor('f-senha'), email: valor('f-email'), confirmar: valor('f-confirmar'), codigo: valor('f-codigo').replace(/\D/g, '') };
    S.email = v.email || S.email;
    S.enviando = true; render();
    try {
      if (tipo === 'entrar') {
        await API.post('/api/entrar', { matricula: S.matricula, senha: v.senha });
        location.href = volta(); return;
      }
      if (tipo === 'criar') {
        const r = await API.post('/api/cadastro', { matricula: S.matricula, email: v.email, senha: v.senha, confirmar: v.confirmar });
        Object.assign(S, { modo: 'codigo', para: r.para, modoTeste: r.modoTeste, codigo: '' }); contar();
      }
      if (tipo === 'codigo') {
        await API.post('/api/cadastro/confirmar', { matricula: S.matricula, codigo: v.codigo });
        location.href = volta(); return;
      }
    } catch (e) {
      S.campos = { ...(e.campos || {}) };
      if (e.dados && e.dados.campo) S.campos[e.dados.campo] = e.message;
      S.erro = Object.keys(S.campos).length ? '' : e.message;
    }
    S.enviando = false; render();
    const foco = document.querySelector('[aria-invalid="true"]') || document.getElementById(tipo === 'codigo' ? 'f-codigo' : 'f-senha');
    if (foco) foco.focus();
  }

  const ACOES = {
    modo: (el) => { S.modo = el.dataset.id; S.erro = ''; S.campos = {}; render(); const f = document.getElementById('f-matricula'); if (f) f.focus(); },
    tema: () => { window.UI.alternarTema(); render(); },
    reenviar: async () => {
      S.erro = '';
      try { const r = await API.post('/api/cadastro/reenviar', { matricula: S.matricula }); S.para = r.para; S.modoTeste = r.modoTeste; contar(); window.UI.toast('Código reenviado'); } catch (e) { S.erro = e.message; }
      render();
    },
  };
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-acao]');
    if (!el || el.disabled) return;
    const fn = ACOES[el.dataset.acao];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form]');
    if (!f) return;
    e.preventDefault();
    if (!S.enviando) enviar(f.dataset.form);
  });

  API.get('/api/eu').then((eu) => { location.href = eu.nivel === 3 ? '/tecnico/' : volta(); }).catch(() => { render(); const f = document.getElementById('f-matricula'); if (f) f.focus(); });
})();
