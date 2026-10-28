/* SCREW · comunicação com o servidor (fetch) e utilidades de dados.
   API.aoSair é chamada quando a sessão termina (401); cada tela define o que fazer. */
(function () {
  async function req(metodo, url, corpo) {
    let r;
    try {
      r = await fetch(url, { method: metodo, credentials: 'same-origin', headers: corpo ? { 'Content-Type': 'application/json' } : {}, body: corpo ? JSON.stringify(corpo) : undefined });
    } catch (e) {
      throw Object.assign(new Error('Sem conexão com o servidor. Confira a rede e tente de novo.'), { status: 0 });
    }
    let dados = null;
    try { dados = await r.json(); } catch (e) { dados = null; }
    if (!r.ok) {
      const err = Object.assign(new Error((dados && dados.erro) || `Erro ${r.status}`), { status: r.status, campos: (dados && dados.campos) || {}, dados });
      if (r.status === 401 && typeof API.aoSair === 'function' && !url.startsWith('/api/entrar') && !url.startsWith('/api/tablet/')) API.aoSair(err);
      throw err;
    }
    return dados;
  }
  /* Reduz a foto no próprio aparelho antes de enviar (lado maior até 1600 px, JPEG) */
  function reduzirFoto(arquivo, lado = 1600) {
    return new Promise((ok, falha) => {
      const leitor = new FileReader();
      leitor.onerror = () => falha(new Error('Não foi possível ler a foto.'));
      leitor.onload = () => {
        const img = new Image();
        img.onerror = () => falha(new Error('Arquivo não é uma imagem.'));
        img.onload = () => {
          const k = Math.min(1, lado / Math.max(img.width, img.height));
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          ok(c.toDataURL('image/jpeg', 0.82));
        };
        img.src = leitor.result;
      };
      leitor.readAsDataURL(arquivo);
    });
  }
  /* Baixa uma lista como CSV (separador ; para abrir direto no Excel em pt-BR) */
  function baixarCSV(nomeArquivo, cabecalho, linhas) {
    const cel = (v) => { const s = String(v ?? ''); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const txt = '\ufeff' + [cabecalho, ...linhas].map((l) => l.map(cel).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
    a.download = nomeArquivo;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  const u = (s) => encodeURIComponent(s);
  window.API = {
    get: (url) => req('GET', url), post: (url, c) => req('POST', url, c || {}), put: (url, c) => req('PUT', url, c || {}),
    patch: (url, c) => req('PATCH', url, c || {}), del: (url) => req('DELETE', url), u, reduzirFoto, baixarCSV, aoSair: null,
  };
})();
