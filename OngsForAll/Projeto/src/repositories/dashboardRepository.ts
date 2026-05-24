import { pool } from "../config/ds";

export async function totalDoadoPorMes(usuarioId: number) {
  const [rows]: any = await pool.query(
    `
    SELECT MONTH(data) AS mes, SUM(valor) AS total
    FROM doacoes
    WHERE usuario_id = ?
    GROUP BY MONTH(data)
    ORDER BY mes
    `,
    [usuarioId]
  );
  return rows;
}

export async function totalDoadoPorTipo(usuarioId: number) {
  const [rows]: any = await pool.query(
    `
    SELECT tipo, SUM(valor) AS total
    FROM doacoes
    WHERE usuario_id = ?
    GROUP BY tipo
    ORDER BY tipo
    `,
    [usuarioId]
  );
  return rows;
}

export async function totalPorOng() {
  const [rows]: any = await pool.query(
    `
    SELECT ongs.nome AS nome, SUM(doacoes.valor) AS total
    FROM doacoes
    JOIN ongs ON doacoes.ong_id = ongs.ong_id
    GROUP BY ongs.nome
    ORDER BY total DESC
    `
  );
  return rows;
}

export async function getTotalPorOng() {
  const [rows]: any = await pool.query(`
    SELECT o.nome AS nome, COALESCE(SUM(d.valor), 0) AS total
    FROM ongs o
    LEFT JOIN doacoes d ON d.ong_id = o.ong_id
    GROUP BY o.ong_id, o.nome
    ORDER BY total DESC
  `);

  // garante total como number (MySQL costuma devolver string)
  return rows.map((r: any) => ({
    nome: r.nome,
    total: Number(r.total ?? 0),
  }));
}

function buildDateFilter(params: any[], de?: string, ate?: string, col = "data"): string {
  let clause = "";
  if (de) {
    clause += ` AND ${col} >= ?`;
    params.push(de);
  }
  if (ate) {
    clause += ` AND ${col} <= ?`;
    params.push(ate);
  }
  return clause;
}

export async function getTotalRecebido(ongId: number, de?: string, ate?: string) {
  const params: any[] = [ongId];
  const dateFilter = buildDateFilter(params, de, ate);
  const [rows]: any = await pool.query(
    `SELECT COALESCE(SUM(valor), 0) AS total
     FROM doacoes
     WHERE ong_id = ?${dateFilter}`,
    params
  );
  return rows[0]?.total ?? 0;
}

export async function getQtdDoacoes(ongId: number, de?: string, ate?: string) {
  const params: any[] = [ongId];
  const dateFilter = buildDateFilter(params, de, ate);
  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS qtd
     FROM doacoes
     WHERE ong_id = ?${dateFilter}`,
    params
  );
  return rows[0]?.qtd ?? 0;
}

export async function getQtdDoadores(ongId: number, de?: string, ate?: string) {
  const params: any[] = [ongId];
  const dateFilter = buildDateFilter(params, de, ate);
  const [rows]: any = await pool.query(
    `SELECT COUNT(DISTINCT usuario_id) AS qtd
     FROM doacoes
     WHERE ong_id = ?${dateFilter}`,
    params
  );
  return rows[0]?.qtd ?? 0;
}

export async function getDoacoesPorMesOng(ongId: number, de?: string, ate?: string) {
  const params: any[] = [ongId];
  const dateFilter = buildDateFilter(params, de, ate);
  const [rows]: any = await pool.query(
    `SELECT MONTH(data) AS mes, SUM(valor) AS total
     FROM doacoes
     WHERE ong_id = ?${dateFilter}
     GROUP BY MONTH(data)
     ORDER BY mes`,
    params
  );
  return rows;
}

export async function getDoacoesPorTipoOng(ongId: number, de?: string, ate?: string) {
  const params: any[] = [ongId];
  const dateFilter = buildDateFilter(params, de, ate);
  const [rows]: any = await pool.query(
    `SELECT tipo, SUM(valor) AS total
     FROM doacoes
     WHERE ong_id = ?${dateFilter}
     GROUP BY tipo
     ORDER BY tipo`,
    params
  );
  return rows;
}

// ==========================================
// MÉTRICAS DE IMPACTO — USUÁRIO
// ==========================================

export async function getNecessidadesApoiadasUsuario(userId: number, de?: string, ate?: string) {
  const params: any[] = [userId];
  let dateFilterInteresses = "";
  if (de) {
    dateFilterInteresses += " AND i.criado_em >= ?";
    params.push(de);
  }
  if (ate) {
    dateFilterInteresses += " AND i.criado_em <= ?";
    params.push(ate);
  }
  const [rows]: any = await pool.query(
    `SELECT COUNT(DISTINCT i.necessidade_id) AS total
     FROM interesses_doacao i
     WHERE i.usuario_id = ? AND i.status IN ('aceito','recebido')${dateFilterInteresses}`,
    params
  );
  return Number(rows[0]?.total ?? 0);
}

export async function getOngsApoiadasUsuario(userId: number, de?: string, ate?: string) {
  const params: any[] = [userId];
  let dateFilterInteresses = "";
  if (de) {
    dateFilterInteresses += " AND i.criado_em >= ?";
    params.push(de);
  }
  if (ate) {
    dateFilterInteresses += " AND i.criado_em <= ?";
    params.push(ate);
  }
  const [rows]: any = await pool.query(
    `SELECT COUNT(DISTINCT i.ong_id) AS total
     FROM interesses_doacao i
     WHERE i.usuario_id = ?${dateFilterInteresses}`,
    params
  );
  return Number(rows[0]?.total ?? 0);
}

export async function getInteressesCriadosUsuario(userId: number, de?: string, ate?: string) {
  const params: any[] = [userId];
  const dateFilter = buildDateFilter(params, de, ate, "criado_em");
  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM interesses_doacao WHERE usuario_id = ?${dateFilter}`,
    params
  );
  return Number(rows[0]?.total ?? 0);
}

export async function getInteressesRecebidosUsuario(userId: number, de?: string, ate?: string) {
  const params: any[] = [userId];
  const dateFilter = buildDateFilter(params, de, ate, "criado_em");
  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM interesses_doacao WHERE usuario_id = ? AND status = 'recebido'${dateFilter}`,
    params
  );
  return Number(rows[0]?.total ?? 0);
}

export async function getInteressesAceitosUsuario(userId: number, de?: string, ate?: string) {
  const params: any[] = [userId];
  const dateFilter = buildDateFilter(params, de, ate, "criado_em");
  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM interesses_doacao WHERE usuario_id = ? AND status = 'aceito'${dateFilter}`,
    params
  );
  return Number(rows[0]?.total ?? 0);
}

export async function getAtividadesRecentesUsuario(userId: number, de?: string, ate?: string, limite = 10) {
  const params: any[] = [userId];
  let dateFilterInteresses = "";
  if (de) {
    dateFilterInteresses += " AND i.criado_em >= ?";
    params.push(de);
  }
  if (ate) {
    dateFilterInteresses += " AND i.criado_em <= ?";
    params.push(ate);
  }
  params.push(limite);
  const [rows]: any = await pool.query(
    `SELECT
         CASE i.status
           WHEN 'pendente' THEN 'interesse_pendente'
           WHEN 'aceito' THEN 'interesse_aceito'
           WHEN 'recebido' THEN 'interesse_recebido'
           WHEN 'cancelado' THEN 'interesse_cancelado'
         END AS tipo_atividade,
         CASE i.status
           WHEN 'pendente' THEN CONCAT('Demonstrou interesse em entregar "', n.titulo, '"')
           WHEN 'aceito' THEN CONCAT('Interesse aceito pela ONG em "', n.titulo, '"')
           WHEN 'recebido' THEN CONCAT('Entrega confirmada de "', n.titulo, '"')
           WHEN 'cancelado' THEN CONCAT('Interesse cancelado em "', n.titulo, '"')
         END AS descricao,
         i.criado_em AS data_atividade
       FROM interesses_doacao i
       JOIN necessidades n ON i.necessidade_id = n.id
       WHERE i.usuario_id = ?${dateFilterInteresses}
     ORDER BY data_atividade DESC
     LIMIT ?`,
    params
  );
  return rows;
}

// ==========================================
// MÉTRICAS DE IMPACTO — ONG
// ==========================================

export async function getNecessidadesCriadasOng(ongId: number, de?: string, ate?: string) {
  const params: any[] = [ongId];
  const dateFilter = buildDateFilter(params, de, ate, "criado_em");
  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM necessidades WHERE ong_id = ?${dateFilter}`,
    params
  );
  return Number(rows[0]?.total ?? 0);
}

export async function getNecessidadesConcluidasOng(ongId: number, de?: string, ate?: string) {
  const params: any[] = [ongId];
  const dateFilter = buildDateFilter(params, de, ate, "atualizado_em");
  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM necessidades WHERE ong_id = ? AND status = 'concluida'${dateFilter}`,
    params
  );
  return Number(rows[0]?.total ?? 0);
}

export async function getInteressesPorStatusOng(ongId: number, status: string, de?: string, ate?: string) {
  const params: any[] = [ongId, status];
  const dateFilter = buildDateFilter(params, de, ate, "i.criado_em");
  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM interesses_doacao i WHERE i.ong_id = ? AND i.status = ?${dateFilter}`,
    params
  );
  return Number(rows[0]?.total ?? 0);
}

export async function getNecessidadesQuaseCompletasOng(ongId: number) {
  const [rows]: any = await pool.query(
    `SELECT id, titulo, quantidade, quantidade_recebida,
       ROUND((quantidade_recebida / quantidade) * 100) AS percentual
     FROM necessidades
     WHERE ong_id = ? AND status != 'concluida' AND quantidade > 0
       AND (quantidade_recebida / quantidade) >= 0.8
       AND (quantidade_recebida / quantidade) < 1
     ORDER BY percentual DESC`,
    [ongId]
  );
  return rows;
}

export async function getNecessidadeMaisAvancadaOng(ongId: number) {
  const [rows]: any = await pool.query(
    `SELECT id, titulo, quantidade, quantidade_recebida,
       ROUND((quantidade_recebida / quantidade) * 100) AS percentual
     FROM necessidades
     WHERE ong_id = ? AND status != 'concluida' AND quantidade > 0
     ORDER BY (quantidade_recebida / quantidade) DESC
     LIMIT 1`,
    [ongId]
  );
  return rows[0] ?? null;
}

export async function getAtividadesRecentesOng(ongId: number, de?: string, ate?: string, limite = 10) {
  const params: any[] = [ongId, ongId, ongId];
  let dateFilterInteresses = "";
  let dateFilterNecessidades = "";
  let dateFilterDoacoes = "";
  if (de) {
    dateFilterInteresses += " AND i.criado_em >= ?";
    dateFilterNecessidades += " AND n.atualizado_em >= ?";
    dateFilterDoacoes += " AND d.data >= ?";
    params.push(de, de, de);
  }
  if (ate) {
    dateFilterInteresses += " AND i.criado_em <= ?";
    dateFilterNecessidades += " AND n.atualizado_em <= ?";
    dateFilterDoacoes += " AND d.data <= ?";
    params.push(ate, ate, ate);
  }
  params.push(limite);
  const [rows]: any = await pool.query(
    `SELECT * FROM (
       SELECT
         CASE i.status
           WHEN 'pendente' THEN 'interesse_pendente'
           WHEN 'aceito' THEN 'interesse_aceito'
           WHEN 'recebido' THEN 'interesse_recebido'
           WHEN 'cancelado' THEN 'interesse_cancelado'
         END AS tipo_atividade,
         CASE i.status
           WHEN 'pendente' THEN CONCAT(u.nome, ' demonstrou interesse em "', ne.titulo, '"')
           WHEN 'aceito' THEN CONCAT('Interesse de ', u.nome, ' em "', ne.titulo, '" foi aceito')
           WHEN 'recebido' THEN CONCAT('Recebimento confirmado de ', u.nome, ' em "', ne.titulo, '"')
           WHEN 'cancelado' THEN CONCAT('Interesse de ', u.nome, ' em "', ne.titulo, '" foi cancelado')
         END AS descricao,
         i.criado_em AS data_atividade
       FROM interesses_doacao i
       JOIN usuarios u ON i.usuario_id = u.id
       JOIN necessidades ne ON i.necessidade_id = ne.id
       WHERE i.ong_id = ?${dateFilterInteresses}

       UNION ALL

       SELECT
         'necessidade_concluida' AS tipo_atividade,
         CONCAT('Necessidade "', n.titulo, '" foi concluída') AS descricao,
         n.atualizado_em AS data_atividade
       FROM necessidades n
       WHERE n.ong_id = ? AND n.status = 'concluida'${dateFilterNecessidades}

       UNION ALL

       SELECT
         'doacao_recebida' AS tipo_atividade,
         CONCAT(u.nome, ' doou R$ ', FORMAT(d.valor, 2, 'pt_BR')) AS descricao,
         d.data AS data_atividade
       FROM doacoes d
       JOIN usuarios u ON d.usuario_id = u.id
       WHERE d.ong_id = ?${dateFilterDoacoes}
     ) AS atividades
     ORDER BY data_atividade DESC
     LIMIT ?`,
    params
  );
  return rows;
}

export async function getUltimasDoacoesOng(ongId: number, de?: string, ate?: string) {
  const params: any[] = [ongId];
  const dateFilter = buildDateFilter(params, de, ate);
  const [rows]: any = await pool.query(
    `SELECT
        d.valor,
        d.tipo,
        DATE_FORMAT(d.data, '%d/%m/%Y') AS data,
        u.nome AS doador
     FROM doacoes d
     LEFT JOIN usuarios u ON d.usuario_id = u.id
     WHERE d.ong_id = ?${dateFilter}
     ORDER BY d.data DESC
     LIMIT 10`,
    params
  );
  return rows;
}
