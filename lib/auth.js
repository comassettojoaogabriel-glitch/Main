/* Senhas, PIN e códigos com crypto.scrypt (sem bibliotecas nativas: roda no Windows sem compilar).
   Tokens de sessão e de aparelho: aleatórios; no banco fica só o SHA-256. */
const crypto = require('crypto');

function hash(segredo) {
  const salt = crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(String(segredo), salt, 64).toString('hex');
  return { salt, hash: h };
}
function confere(segredo, guardado) {
  if (!guardado || !guardado.salt) return false;
  const h = crypto.scryptSync(String(segredo), guardado.salt, 64);
  const g = Buffer.from(guardado.hash, 'hex');
  return g.length === h.length && crypto.timingSafeEqual(g, h);
}
const token = () => crypto.randomBytes(32).toString('hex');
const sha = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');
const id = () => crypto.randomBytes(8).toString('hex');
const codigo6 = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');

function lerCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function cookie(res, nome, valor, maxAgeSeg) {
  const partes = [`${nome}=${encodeURIComponent(valor)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  partes.push(`Max-Age=${maxAgeSeg}`);
  const atual = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', [...(Array.isArray(atual) ? atual : atual ? [atual] : []), partes.join('; ')]);
}
const apagarCookie = (res, nome) => cookie(res, nome, '', 0);

/* Bloqueio simples por tentativas erradas (em memória): 5 erros = 15 minutos */
const tentativas = new Map();
function bloqueado(chave) {
  const t = tentativas.get(chave);
  return !!(t && t.ate && t.ate > Date.now());
}
function errou(chave) {
  const t = tentativas.get(chave) || { n: 0, ate: 0 };
  t.n += 1;
  if (t.n >= 5) { t.ate = Date.now() + 15 * 60000; t.n = 0; }
  tentativas.set(chave, t);
}
const acertou = (chave) => tentativas.delete(chave);

module.exports = { hash, confere, token, sha, id, codigo6, lerCookies, cookie, apagarCookie, bloqueado, errou, acertou };
