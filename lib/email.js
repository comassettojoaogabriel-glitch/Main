/* E-mail pelo Gmail (nodemailer + senha de app em config.json).
   Sem Gmail configurado = MODO TESTE: a mensagem aparece no terminal.
   E-mail não aceita var(--token); as cores são lidas de design/tokens.json para seguir o DESIGN.md. */
const path = require('path');
const nodemailer = require('nodemailer');

let transporte = null;
let remetente = null;
let config = {};

function iniciar(cfg) {
  config = cfg || {};
  const g = config.gmail || {};
  if (g.usuario && g.senhaDeApp) {
    transporte = nodemailer.createTransport({ service: 'gmail', auth: { user: g.usuario, pass: g.senhaDeApp } });
    remetente = `"${config.nomeRemetente || 'SCREW · Matrizaria'}" <${g.usuario}>`;
  }
  return !!transporte;
}
const modoTeste = () => !transporte;

/* Cores do tema claro resolvidas a partir de tokens.json */
let cores = null;
function cor(nome) {
  if (!cores) {
    const t = require(path.join(__dirname, '..', 'design', 'tokens.json')).claro;
    cores = { ...t.cores_base, ...t.cores_semanticas };
  }
  let v = cores[nome];
  for (let i = 0; i < 5 && typeof v === 'string' && v.startsWith('var(--'); i++) v = cores[v.slice(6, -1)];
  return v || '';
}

function moldura(titulo, corpoHtml) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;padding:24px;background:${cor('bg-app')};font-family:Geist,'Segoe UI',Arial,sans-serif;color:${cor('text-body')}">
<div style="max-width:520px;margin:0 auto;background:${cor('surface-card')};border-radius:20px;padding:24px">
<div style="font:500 10px/1 'Geist Mono',Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;color:${cor('text-subtle')};margin-bottom:8px">SCREW · Matrizaria</div>
<h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:${cor('text-strong')}">${titulo}</h1>${corpoHtml}</div></body></html>`;
}

async function enviar({ para, assunto, texto, html }) {
  if (modoTeste()) {
    console.log(`\n[MODO TESTE] E-mail para ${para}\nAssunto: ${assunto}\n${texto}\n`);
    return { modoTeste: true };
  }
  await transporte.sendMail({ from: remetente, to: para, subject: assunto, text: texto, html });
  return { modoTeste: false };
}

function enviarCodigo(para, nomePessoa, codigo) {
  const texto = `Olá, ${nomePessoa}.\n\nSeu código para criar a conta no sistema de manutenção das matrizes: ${codigo}\nEle vale por 15 minutos.\n\nSe não foi você, ignore este e-mail.`;
  const html = moldura('Código de acesso', `<p style="margin:0 0 16px;font-size:14px">Olá, ${nomePessoa}. Use o código abaixo para criar sua conta. Ele vale por 15 minutos.</p>
<div style="font:600 28px/1 'Geist Mono',Consolas,monospace;letter-spacing:.12em;color:${cor('text-strong')};background:${cor('surface-sunken')};border-radius:14px;padding:16px;text-align:center">${codigo}</div>
<p style="margin:16px 0 0;font-size:12px;color:${cor('text-muted')}">Se não foi você, ignore este e-mail.</p>`);
  return enviar({ para, assunto: `Código de acesso: ${codigo}`, texto, html });
}

/* Fase 2: e-mail diário com as matrizes do dia (enviarPlanoDoDia) entra aqui. */

module.exports = { iniciar, modoTeste, enviar, enviarCodigo, cor, moldura };
