/* Datas em horário local do servidor. Datas de calendário são guardadas como 'YYYY-MM-DD'. */
const pad = (n) => String(n).padStart(2, '0');

function isoDe(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function hoje() { return isoDe(new Date()); }
function dataDe(iso) { const [a, m, d] = iso.split('-').map(Number); return new Date(a, m - 1, d); }
function somarDias(iso, n) { const d = dataDe(iso); d.setDate(d.getDate() + n); return isoDe(d); }
/* dias de a até b (positivo se b é depois de a) */
function diferencaDias(a, b) { return Math.round((dataDe(b) - dataDe(a)) / 86400000); }
function valido(iso) { return typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) && !isNaN(dataDe(iso)); }

const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function br(iso) { if (!iso) return '—'; const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}`; }
function brCurto(iso) { if (!iso) return '—'; const [, m, d] = iso.split('-'); return `${d}/${m}`; }
function brHora(ts) { if (!ts) return '—'; const d = new Date(ts); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function hora(ts) { const d = ts ? new Date(ts) : new Date(); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function diaSemana(iso) { return dataDe(iso).getDay(); }
function extenso(iso) { const d = dataDe(iso); const s = DIAS[d.getDay()]; return `${s[0].toUpperCase()}${s.slice(1)}, ${d.getDate()} de ${MESES[d.getMonth()]}`; }
function curtoComDia(iso) { return `${DIAS_CURTOS[diaSemana(iso)]}, ${brCurto(iso)}`; }
function diaUtil(iso, dias = [1, 2, 3, 4, 5]) { return dias.includes(diaSemana(iso)); }

/* Semana ISO 8601: 'YYYY-Www' */
function semanaISO(iso) {
  const d = dataDe(iso);
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dia = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dia);
  const ini = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const n = Math.ceil(((t - ini) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${pad(n)}`;
}
function segundaDaSemana(iso) { const d = diaSemana(iso) || 7; return somarDias(iso, 1 - d); }

/* Prazo relativo para próxima manutenção: 'Vence hoje', 'Vencida há 3 dias', 'em 2 dias' */
function prazoRelativo(dias) {
  if (dias === 0) return 'Vence hoje';
  if (dias < 0) return `Vencida há ${-dias} dia${dias === -1 ? '' : 's'}`;
  return `em ${dias} dia${dias === 1 ? '' : 's'}`;
}
/* Tempo relativo no passado: 'hoje', 'ontem', 'há 3 dias' */
function haQuanto(iso, ref = hoje()) {
  const d = diferencaDias(iso, ref);
  if (d <= 0) return 'hoje';
  if (d === 1) return 'ontem';
  return `há ${d} dias`;
}

module.exports = { hoje, isoDe, dataDe, somarDias, diferencaDias, valido, br, brCurto, brHora, hora, diaSemana, extenso, curtoComDia, diaUtil, semanaISO, segundaDaSemana, prazoRelativo, haQuanto };
