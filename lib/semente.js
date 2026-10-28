/* Semente do banco — roda só quando data/db.json não existe.
   1) Pessoas de pessoas-iniciais.json (sempre).
   2) Dados de EXEMPLO (se config.dadosDeExemplo = true): as matrizes dos protótipos, com datas
      relativas ao dia da instalação, para as telas terem o que mostrar até a carga real.
      Os técnicos de exemplo entram com PIN 123456. Apague tudo pela tela Equipe antes de usar de verdade. */
const fs = require('fs');
const path = require('path');
const d = require('./datas');
const auth = require('./auth');

function pessoasIniciais(db) {
  const arq = path.join(__dirname, '..', 'pessoas-iniciais.json');
  const lista = fs.existsSync(arq) ? JSON.parse(fs.readFileSync(arq, 'utf8')).pessoas || [] : [];
  for (const p of lista) db.pessoas.push({ id: auth.id(), nome: p.nome, matricula: String(p.matricula), nivel: Number(p.nivel) || 3, cargo: p.cargo || '', liberado: true });
}

function exemplo(db) {
  const hoje = d.hoje();
  const atras = (n) => d.somarDias(hoje, -n);
  const agora = (diasAtras, h = 7, min = 30) => { const x = d.dataDe(atras(diasAtras)); x.setHours(h, min, 0, 0); return x.toISOString(); };
  db.exemplo = true;
  db.config.maquinas = ['Formadora F-01', 'Formadora F-02', 'Formadora F-03', 'Prensa P-03', 'Prensa P-04', 'Laminadora L-01', 'Laminadora L-02'];
  db.config.tiposMatriz = ['Forjamento', 'Punção', 'Corte', 'Pente de rosca', 'Extrusão'];
  db.config.materiais = ['Metal duro K30', 'Metal duro K40', 'Aço D2', 'Aço M2'];

  const tecnicos = ['Carlos Menezes', 'Ana Ribeiro', 'João Prado', 'Marcos Lima', 'Fernanda Costa'];
  const pid = {};
  tecnicos.forEach((nome, i) => {
    const p = { id: auth.id(), nome, matricula: String(2001 + i), nivel: 3, cargo: 'Técnico de matrizaria', liberado: true, exemplo: true };
    db.pessoas.push(p);
    db.pins.push({ pessoaId: p.id, pin: auth.hash('123456'), definidoEm: new Date().toISOString(), erros: 0 });
    pid[nome] = p.id;
  });

  const refs = [
    ['10.0412', 'Parafuso sextavado M8 x 30', 18000], ['10.0415', 'Parafuso sextavado M8 x 45', 9500], ['10.0610', 'Parafuso flangeado M10 x 25', 14200],
    ['10.0606', 'Parafuso M6 x 20', 22000], ['10.0911', 'Parafuso Phillips 4,8 x 19', 6000], ['10.0930', 'Parafuso Torx M6 x 16', 4300],
    ['10.1210', 'Parafuso M12 x 60', 3100], ['10.0820', 'Bucha Ø8,4', 7800],
  ];
  for (const [codigo, descricao, mensal] of refs) {
    db.referencias.push({ codigo, descricao });
    db.demanda[codigo] = { mensal, atualizadaEm: hoje };
  }
  db.importacoes.push({ id: auth.id(), quando: new Date().toISOString(), arquivo: 'dados de exemplo', linhas: refs.length, referencias: refs.length, por: 'sistema', ok: true, mensagem: 'Demanda de exemplo' });

  const CHECK = ['Inspecionar trincas e lascamentos', 'Medir desgaste do perfil (paquímetro / projetor)', 'Polir cavidade e raios', 'Verificar pino ejetor e mola', 'Limpar e aplicar protetivo'];
  /* [código, descrição, tipo, máquina, estação, material, golpes, limite, intervalo, dias desde a última, responsável, referências, situação] */
  const M = [
    ['MTZ-0142', 'Punção sextavado M8', 'Punção', 'Formadora F-02', 'Estação 2', 'Metal duro K40', 206400, 200000, 90, 93, 'Carlos Menezes', ['10.0412', '10.0415']],
    ['MTZ-0118', 'Matriz de 1º golpe M10', 'Forjamento', 'Formadora F-01', 'Estação 1', 'Metal duro K30', 201100, 200000, 90, 91, 'Ana Ribeiro', ['10.0610']],
    ['MTZ-0207', 'Pente de rosca M6 (par)', 'Pente de rosca', 'Laminadora L-01', '', 'Aço D2', 461000, 500000, 120, 118, 'João Prado', ['10.0606']],
    ['MTZ-0098', 'Matriz de corte Ø6,2', 'Corte', 'Prensa P-03', 'Estação 1', 'Aço M2', 151300, 180000, 60, 55, 'Marcos Lima', ['10.0820']],
    ['MTZ-0233', 'Matriz de cabeça flangeada M8', 'Forjamento', 'Formadora F-02', 'Estação 3', 'Metal duro K40', 152000, 200000, 90, 84, 'Carlos Menezes', ['10.0610', '10.0412']],
    ['MTZ-0154', 'Punção Phillips PH2', 'Punção', 'Formadora F-03', 'Estação 2', 'Metal duro K40', 158000, 160000, 60, 61, 'Fernanda Costa', ['10.0911']],
    ['MTZ-0301', 'Matriz de 2º golpe M6', 'Forjamento', 'Formadora F-02', 'Estação 2', 'Metal duro K30', 97800, 200000, 90, 71, 'Ana Ribeiro', ['10.0606']],
    ['MTZ-0189', 'Punção Torx T30', 'Punção', 'Formadora F-03', 'Estação 3', 'Metal duro K40', 61000, 160000, 60, 38, 'Fernanda Costa', ['10.0930']],
    ['MTZ-0211', 'Matriz de redução M12', 'Forjamento', 'Formadora F-01', 'Estação 2', 'Metal duro K30', 52400, 250000, 120, 86, 'João Prado', ['10.1210']],
    ['MTZ-0076', 'Pente de rosca M10 (par)', 'Pente de rosca', 'Laminadora L-02', '', 'Aço D2', 120500, 500000, 120, 79, 'Marcos Lima', ['10.0610']],
    ['MTZ-0045', 'Matriz de corte Ø8,4', 'Corte', 'Prensa P-03', 'Estação 2', 'Aço M2', 3000, 180000, 60, 2, 'Marcos Lima', ['10.0820']],
    ['MTZ-0012', 'Matriz sextavada M16', 'Forjamento', 'Prensa P-04', '', 'Metal duro K30', 0, 200000, 90, 238, null, [], 'inativa'],
  ];
  const notas = ['Polimento da cavidade, troca do pino ejetor.', 'Desgaste dentro da tolerância (0,02 mm).', 'Polimento dos raios e limpeza geral.'];
  M.forEach(([codigo, descricao, tipo, maquina, estacao, material, golpes, limite, intervalo, diasUltima, resp, referencias, situacao], i) => {
    const ultima = atras(diasUltima);
    db.matrizes.push({
      codigo, descricao, tipo, maquina, estacao, material, situacao: situacao || 'ativa', criterio: 'ambos', limiteGolpes: limite, intervaloDias: intervalo,
      alertaPct: 70, responsavel: resp ? pid[resp] : null, notificar: true, checklist: CHECK.slice(), golpes, ultima, proximaManual: null, referencias,
      criadaEm: new Date().toISOString(), atualizadaEm: new Date().toISOString(),
    });
    for (let k = 0; k < (situacao ? 1 : 2); k++) {
      db.manutencoes.push({
        id: auth.id(), matriz: codigo, data: d.somarDias(ultima, -intervalo * k), tipo: 'Preventiva', tecnico: resp ? pid[resp] : pid['Carlos Menezes'],
        golpesContador: limite - 4000 * (i % 3), tempoMin: 70 + ((i * 17 + k * 23) % 90), desgasteMm: '0,02', checklist: CHECK.map((item) => ({ item, ok: true })),
        obs: notas[(i + k) % notas.length], fotos: [], os: null, registradaPor: null, registradaEm: new Date().toISOString(),
      });
    }
  });

  const osm = (matriz, tipo, tec, aberturaDias, prazoDias, status, extra = {}) => {
    db.osMatrizes.push({ id: proximo(db, 'osm'), tipo, matriz, tecnico: tec ? pid[tec] : null, abertura: agora(aberturaDias), prazo: d.somarDias(hoje, prazoDias), status, origem: 'manual', checks: [], descricao: '', ...extra });
  };
  osm('MTZ-0154', 'Preventiva', 'Fernanda Costa', 1, 0, 'andamento', { checks: [true, true, false, false, false] });
  osm('MTZ-0098', 'Corretiva', 'Marcos Lima', 3, 1, 'peca', { descricao: 'Lascamento na aresta de corte — aguardando inserto.' });

  const oss = (servico, descricao, solicitante, setor, quantidade, tec, aberturaDias, prazoDias, status) => {
    db.osServicos.push({ id: proximo(db, 'oss'), servico, descricao, solicitante, setor, quantidade, tecnico: tec ? pid[tec] : null, abertura: agora(aberturaDias, 9, 15), prazo: d.somarDias(hoje, prazoDias), status, observacoes: '', concluidaEm: status === 'concluida' ? agora(aberturaDias - 1, 15, 40) : null });
  };
  oss('Usinagem', 'Usinar 4 buchas guia Ø20 para dispositivo de solda', 'Ricardo Alves', 'Engenharia', 4, 'João Prado', 2, 1, 'andamento');
  oss('Retífica', 'Retificar face do porta-matriz da prensa P-03', 'Paulo Nunes', 'Manutenção', 1, null, 1, 2, 'aberta');
  oss('Fresa', 'Fresar rasgo de chaveta de 8 mm em eixo de transmissão', 'Paulo Nunes', 'Manutenção', 1, 'Ana Ribeiro', 6, -2, 'concluida');
}

function proximo(db, tipo) {
  const ano = String(new Date().getFullYear());
  const c = db.contadores[tipo] || (db.contadores[tipo] = {});
  c[ano] = (c[ano] || 0) + 1;
  return `${tipo.toUpperCase()} ${ano}-${String(c[ano]).padStart(4, '0')}`;
}

module.exports = function semear(comExemplo) {
  return (db) => { pessoasIniciais(db); if (comExemplo) exemplo(db); };
};
