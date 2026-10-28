/* Banco em arquivo JSON (data/db.json) com gravação atômica e backup diário em data/backups/.
   O banco inteiro fica em memória; salvar() grava no disco. */
const fs = require('fs');
const path = require('path');
const datas = require('./datas');

const PASTA = path.join(__dirname, '..', 'data');
const ARQ = path.join(PASTA, 'db.json');
const BACKUPS = path.join(PASTA, 'backups');
const FOTOS = path.join(PASTA, 'fotos');
const MANTER_BACKUPS = 30;

/* Estrutura completa — qualquer coleção que faltar num banco antigo é criada ao carregar */
function vazio() {
  return {
    versao: 1,
    criadoEm: new Date().toISOString(),
    exemplo: false,
    pessoas: [],
    contas: [],
    pins: [],
    pendentes: [],
    sessoes: [],
    aparelhos: [],
    matrizes: [],
    referencias: [],
    demanda: {},
    importacoes: [],
    osMatrizes: [],
    osServicos: [],
    manutencoes: [],
    planos: {},
    instantaneos: {},
    contadores: { osm: {}, oss: {} },
    config: configPadrao(),
  };
}

function configPadrao() {
  return {
    matrizesPorDia: 3,
    minPecasAposManutencao: 10000,
    alertaPadrao: 70,
    email: { ativo: true, hora: '06:30', dias: [1, 2, 3, 4, 5], destinatarios: [] },
    maquinas: [],
    tiposMatriz: [],
    materiais: [],
    tiposServico: ['Usinagem', 'Retífica', 'Fresa', 'Torno', 'Solda', 'Ajuste', 'Outro'],
    setores: ['Produção', 'Manutenção', 'Ferramentaria', 'Engenharia', 'Qualidade'],
  };
}

let db = null;
let ultimoBackup = null;

function carregar(semear) {
  for (const p of [PASTA, BACKUPS, FOTOS]) fs.mkdirSync(p, { recursive: true });
  if (fs.existsSync(ARQ)) {
    db = JSON.parse(fs.readFileSync(ARQ, 'utf8'));
    const base = vazio();
    for (const k of Object.keys(base)) if (db[k] === undefined) db[k] = base[k];
    db.config = { ...configPadrao(), ...db.config, email: { ...configPadrao().email, ...(db.config && db.config.email) } };
  } else {
    db = vazio();
    if (semear) semear(db);
    salvar();
  }
  return db;
}

function backupDiario() {
  const dia = datas.hoje();
  if (ultimoBackup === dia) return;
  const destino = path.join(BACKUPS, `db-${dia}.json`);
  if (!fs.existsSync(destino) && fs.existsSync(ARQ)) fs.copyFileSync(ARQ, destino);
  ultimoBackup = dia;
  const lista = fs.readdirSync(BACKUPS).filter((f) => /^db-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  for (const f of lista.slice(0, Math.max(0, lista.length - MANTER_BACKUPS))) fs.unlinkSync(path.join(BACKUPS, f));
}

function salvar() {
  backupDiario();
  const tmp = ARQ + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
  fs.renameSync(tmp, ARQ);
}

/* Gravação adiada para atualizações frequentes e pouco importantes (ex.: último uso da sessão) */
let timer = null;
function salvarDepois(ms = 60000) {
  if (timer) return;
  timer = setTimeout(() => { timer = null; salvar(); }, ms);
}

/* Próximo número de OS do ano: 'OSM 2026-0001' / 'OSS 2026-0001' */
function proximoNumero(tipo) {
  const ano = String(new Date().getFullYear());
  const c = db.contadores[tipo] || (db.contadores[tipo] = {});
  c[ano] = (c[ano] || 0) + 1;
  return `${tipo.toUpperCase()} ${ano}-${String(c[ano]).padStart(4, '0')}`;
}

module.exports = { carregar, salvar, salvarDepois, proximoNumero, configPadrao, get db() { return db; }, PASTA, FOTOS };
