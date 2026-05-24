import { pool } from "../config/ds";

export interface FiltrosGerencial {
  de?: string;
  ate?: string;
  tipo?: string;
  categoria?: string;
  status?: string;
  busca?: string;
  limite?: number;
}

function df(params: any[], col: string, de?: string, ate?: string): string {
  let s = "";
  if (de)  { s += ` AND ${col} >= ?`; params.push(de); }
  if (ate) { s += ` AND ${col} <= ?`; params.push(ate); }
  return s;
}

function busca(params: any[], col: string, termo?: string): string {
  if (!termo) return "";
  params.push(`%${termo}%`);
  return ` AND ${col} LIKE ?`;
}

// ─── Visão geral ─────────────────────────────────────────────────────────────

export async function buscarResumoGerencial(ongId: number) {
  const [[necRow], [intRow], [volRow], [evRow]] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)                                           AS total,
         SUM(status = 'aberta')                            AS abertas,
         SUM(status = 'concluida')                         AS concluidas,
         SUM(status = 'cancelada')                         AS canceladas
       FROM necessidades WHERE ong_id = ?`,
      [ongId]
    ),
    pool.query(
      `SELECT
         COUNT(*)                   AS total,
         SUM(status = 'pendente')   AS pendentes,
         SUM(status = 'aceito')     AS aceitos,
         SUM(status = 'recebido')   AS recebidos,
         SUM(status = 'cancelado')  AS cancelados
       FROM interesses_doacao WHERE ong_id = ?`,
      [ongId]
    ),
    pool.query(
      `SELECT
         COUNT(DISTINCT n.id)               AS atividades,
         COALESCE(SUM(ins.inscritos), 0)    AS inscritos,
         COALESCE(SUM(ins.aceitos), 0)      AS aceitos,
         COALESCE(SUM(ins.confirmados), 0)  AS confirmados
       FROM necessidades n
       LEFT JOIN (
         SELECT necessidade_id,
                COUNT(*)                        AS inscritos,
                SUM(status = 'aceito')          AS aceitos,
                SUM(status = 'recebido')        AS confirmados
         FROM interesses_doacao
         GROUP BY necessidade_id
       ) ins ON ins.necessidade_id = n.id
       WHERE n.ong_id = ? AND n.tipo_necessidade = 'voluntariado'`,
      [ongId]
    ),
    pool.query(
      `SELECT COUNT(*) AS total FROM evidencias WHERE ong_id = ?`,
      [ongId]
    ),
  ]) as any[];

  const nec = (necRow as any[])[0] ?? {};
  const int = (intRow as any[])[0] ?? {};
  const vol = (volRow as any[])[0] ?? {};
  const ev  = (evRow  as any[])[0] ?? {};

  const totalNec    = Number(nec.total      ?? 0);
  const concluidas  = Number(nec.concluidas ?? 0);
  const taxaConcl   = totalNec > 0 ? Math.round((concluidas / totalNec) * 100) : 0;

  const totalVol    = Number(vol.inscritos   ?? 0);
  const confirmados = Number(vol.confirmados ?? 0);
  const taxaConf    = totalVol > 0 ? Math.round((confirmados / totalVol) * 100) : 0;

  return {
    necessidades: {
      total:        totalNec,
      abertas:      Number(nec.abertas     ?? 0),
      concluidas,
      canceladas:   Number(nec.canceladas  ?? 0),
      taxaConclusao: taxaConcl,
    },
    interesses: {
      total:     Number(int.total     ?? 0),
      pendentes: Number(int.pendentes ?? 0),
      aceitos:   Number(int.aceitos   ?? 0),
      recebidos: Number(int.recebidos ?? 0),
    },
    voluntariado: {
      atividades:  Number(vol.atividades  ?? 0),
      inscritos:   totalVol,
      aceitos:     Number(vol.aceitos     ?? 0),
      confirmados,
      taxaConfirmacao: taxaConf,
    },
    impacto: {
      evidencias:           Number(ev.total    ?? 0),
    },
  };
}

// ─── Necessidades ─────────────────────────────────────────────────────────────

export async function buscarNecessidades(ongId: number, f: FiltrosGerencial = {}) {
  const params: any[] = [ongId];
  let where = df(params, "n.criado_em", f.de, f.ate);
  if (f.tipo)      { where += " AND n.tipo_necessidade = ?"; params.push(f.tipo); }
  if (f.categoria) { where += " AND n.categoria = ?";       params.push(f.categoria); }
  if (f.status)    { where += " AND n.status = ?";          params.push(f.status); }
  where += busca(params, "n.titulo", f.busca);

  const [rows]: any = await pool.query(
    `SELECT
       n.id,
       n.titulo,
       n.tipo_necessidade,
       n.categoria,
       n.quantidade,
       n.quantidade_recebida,
       GREATEST(0, n.quantidade - n.quantidade_recebida)          AS pendente,
       ROUND((n.quantidade_recebida / NULLIF(n.quantidade,0))*100) AS percentual,
       n.status,
       DATE_FORMAT(n.criado_em,    '%d/%m/%Y') AS criado_em,
       DATE_FORMAT(n.atualizado_em,'%d/%m/%Y') AS atualizado_em
     FROM necessidades n
     WHERE n.ong_id = ?${where}
     ORDER BY n.criado_em DESC
     LIMIT ?`,
    [...params, f.limite ?? 500]
  );
  return rows as any[];
}

export async function buscarCategoriasNecessidades(ongId: number): Promise<string[]> {
  const [rows]: any = await pool.query(
    `SELECT DISTINCT categoria FROM necessidades WHERE ong_id = ? AND categoria IS NOT NULL AND categoria != '' ORDER BY categoria`,
    [ongId]
  );
  return (rows as any[]).map((r: any) => r.categoria);
}

export async function buscarResumoNecessidades(ongId: number, f: FiltrosGerencial = {}) {
  const params: any[] = [ongId];
  const where = df(params, "criado_em", f.de, f.ate);
  const [[row]]: any = await pool.query(
    `SELECT
       COUNT(*)                   AS total,
       SUM(status = 'aberta')     AS abertas,
       SUM(status = 'concluida')  AS concluidas,
       SUM(status = 'cancelada')  AS canceladas
     FROM necessidades WHERE ong_id = ?${where}`,
    params
  );
  const total     = Number(row?.total      ?? 0);
  const concluidas = Number(row?.concluidas ?? 0);
  return {
    total,
    abertas:      Number(row?.abertas    ?? 0),
    concluidas,
    canceladas:   Number(row?.canceladas ?? 0),
    taxaConclusao: total > 0 ? Math.round((concluidas / total) * 100) : 0,
  };
}

// ─── Doações / Interesses ─────────────────────────────────────────────────────

export async function buscarDoacoes(ongId: number, f: FiltrosGerencial = {}) {
  const params: any[] = [ongId];
  let where = df(params, "i.criado_em", f.de, f.ate);
  if (f.status) { where += " AND i.status = ?"; params.push(f.status); }
  if (f.tipo)   { where += " AND n.tipo_necessidade = ?"; params.push(f.tipo); }
  where += busca(params, "n.titulo", f.busca);

  const [rows]: any = await pool.query(
    `SELECT
       i.id,
       i.status,
       i.quantidade,
       i.quantidade_confirmada,
       i.observacao,
       DATE_FORMAT(i.criado_em,     '%d/%m/%Y') AS criado_em,
       DATE_FORMAT(i.data_prevista, '%d/%m/%Y') AS data_prevista,
       n.titulo        AS necessidade_titulo,
       n.tipo_necessidade,
       n.categoria,
       n.id            AS necessidade_id,
       u.nome          AS doador_nome
     FROM interesses_doacao i
     JOIN necessidades n ON n.id = i.necessidade_id
     JOIN usuarios u     ON u.id = i.usuario_id
     WHERE i.ong_id = ?${where}
     ORDER BY i.criado_em DESC
     LIMIT ?`,
    [...params, f.limite ?? 500]
  );
  return rows as any[];
}

export async function buscarResumoDoacoes(ongId: number, f: FiltrosGerencial = {}) {
  const params: any[] = [ongId];
  const where = df(params, "i.criado_em", f.de, f.ate);
  const [[row]]: any = await pool.query(
    `SELECT
       COUNT(*)                        AS total,
       SUM(i.status = 'recebido')      AS confirmadas,
       COALESCE(SUM(CASE WHEN i.status = 'recebido' THEN i.quantidade_confirmada END), 0) AS itens_recebidos,
       SUM(i.status = 'pendente')      AS pendentes,
       SUM(i.status = 'aceito')        AS aceitas
     FROM interesses_doacao i
     WHERE i.ong_id = ?${where}`,
    params
  );
  const [catRow]: any = await pool.query(
    `SELECT n.categoria, COUNT(*) AS total
     FROM interesses_doacao i
     JOIN necessidades n ON n.id = i.necessidade_id
     WHERE i.ong_id = ? AND i.status = 'recebido'
     GROUP BY n.categoria
     ORDER BY total DESC
     LIMIT 1`,
    [ongId]
  );
  return {
    total:         Number(row?.total          ?? 0),
    confirmadas:   Number(row?.confirmadas    ?? 0),
    itensRecebidos:Number(row?.itens_recebidos ?? 0),
    pendentes:     Number(row?.pendentes      ?? 0),
    aceitas:       Number(row?.aceitas        ?? 0),
    categoriaMaisAtendida: (catRow as any[])[0]?.categoria ?? null,
  };
}

// ─── Voluntariado ─────────────────────────────────────────────────────────────

export async function buscarVoluntariados(ongId: number, f: FiltrosGerencial = {}) {
  const params: any[] = [ongId];
  let where = df(params, "n.criado_em", f.de, f.ate);
  if (f.status) { where += " AND n.status = ?"; params.push(f.status); }
  where += busca(params, "n.titulo", f.busca);

  const [rows]: any = await pool.query(
    `SELECT
       n.id,
       n.titulo,
       n.categoria,
       n.local_atividade,
       n.turno,
       n.status,
       n.quantidade                                    AS vagas,
       DATE_FORMAT(n.data_inicio, '%d/%m/%Y')          AS data_inicio,
       DATE_FORMAT(n.data_fim,    '%d/%m/%Y')          AS data_fim,
       COALESCE(SUM(i.id IS NOT NULL), 0)              AS inscritos,
       COALESCE(SUM(i.status = 'aceito'), 0)           AS aceitos,
       COALESCE(SUM(i.status = 'recebido'), 0)         AS confirmados,
       COALESCE(SUM(i.status = 'cancelado'), 0)        AS cancelados
     FROM necessidades n
     LEFT JOIN interesses_doacao i ON i.necessidade_id = n.id
     WHERE n.ong_id = ? AND n.tipo_necessidade = 'voluntariado'${where}
     GROUP BY n.id
     ORDER BY n.criado_em DESC
     LIMIT ?`,
    [...params, f.limite ?? 500]
  );
  return rows as any[];
}

export async function buscarResumoVoluntariado(ongId: number) {
  const [[row]]: any = await pool.query(
    `SELECT
       COUNT(DISTINCT n.id)                             AS atividades,
       COALESCE(SUM(sub.inscritos), 0)                  AS inscritos,
       COALESCE(SUM(sub.aceitos), 0)                    AS aceitos,
       COALESCE(SUM(sub.confirmados), 0)                AS confirmados,
       SUM(n.status = 'aberta' AND (n.data_inicio IS NULL OR n.data_inicio >= CURDATE())) AS futuras,
       SUM(n.status = 'concluida')                      AS encerradas
     FROM necessidades n
     LEFT JOIN (
       SELECT necessidade_id,
              COUNT(*)               AS inscritos,
              SUM(status = 'aceito') AS aceitos,
              SUM(status = 'recebido') AS confirmados
       FROM interesses_doacao GROUP BY necessidade_id
     ) sub ON sub.necessidade_id = n.id
     WHERE n.ong_id = ? AND n.tipo_necessidade = 'voluntariado'`,
    [ongId]
  );
  const inscritos   = Number(row?.inscritos   ?? 0);
  const confirmados = Number(row?.confirmados ?? 0);
  return {
    atividades:      Number(row?.atividades  ?? 0),
    inscritos,
    aceitos:         Number(row?.aceitos     ?? 0),
    confirmados,
    futuras:         Number(row?.futuras     ?? 0),
    encerradas:      Number(row?.encerradas  ?? 0),
    taxaConfirmacao: inscritos > 0 ? Math.round((confirmados / inscritos) * 100) : 0,
  };
}

// ─── Atividades ───────────────────────────────────────────────────────────────

export async function buscarAtividades(ongId: number, f: FiltrosGerencial = {}) {
  const lim = f.limite ?? 200;

  // Build date filters per sub-query
  const p1: any[] = [ongId]; const d1 = df(p1, "n.criado_em",    f.de, f.ate);
  const p2: any[] = [ongId]; const d2 = df(p2, "i.criado_em",    f.de, f.ate);
  const p3: any[] = [ongId]; const d3 = df(p3, "e.criado_em",    f.de, f.ate);

  let tipoFilter1 = "", tipoFilter2 = "", tipoFilter3 = "";

  const tipoMap: Record<string, number> = {
    necessidade_criada:   1,
    interesse_pendente:   2,
    interesse_aceito:     3,
    entrega_recebida:     4,
    interesse_cancelado:  5,
    evidencia_registrada: 6,
  };

  // Filter by tipo de atividade — only include sub-queries relevant to selected tipo
  if (f.tipo) {
    const t = f.tipo;
    if (!["necessidade_criada"].includes(t))                           tipoFilter1 = " AND 1=0";
    if (!["interesse_pendente","interesse_aceito","entrega_recebida","interesse_cancelado"].includes(t)) tipoFilter2 = " AND 1=0";
    if (!["evidencia_registrada"].includes(t))                         tipoFilter3 = " AND 1=0";

    if (t === "interesse_pendente")  { tipoFilter2 += " AND i.status = 'pendente'"; }
    if (t === "interesse_aceito")    { tipoFilter2 += " AND i.status = 'aceito'"; }
    if (t === "entrega_recebida")    { tipoFilter2 += " AND i.status = 'recebido'"; }
    if (t === "interesse_cancelado") { tipoFilter2 += " AND i.status = 'cancelado'"; }
  }

  const [rows]: any = await pool.query(
    `SELECT * FROM (
       SELECT
         n.id                                  AS ref_id,
         n.titulo                              AS titulo,
         'necessidade_criada'                  AS tipo,
         NULL                                  AS doador_nome,
         n.status,
         CONCAT('/necessidades/', n.id)        AS link,
         n.criado_em                           AS data_evento
       FROM necessidades n
       WHERE n.ong_id = ?${d1}${tipoFilter1}

       UNION ALL

       SELECT
         i.id,
         n.titulo,
         CASE i.status
           WHEN 'pendente'  THEN 'interesse_pendente'
           WHEN 'aceito'    THEN 'interesse_aceito'
           WHEN 'recebido'  THEN 'entrega_recebida'
           WHEN 'cancelado' THEN 'interesse_cancelado'
         END,
         u.nome,
         i.status,
         '/ong/interesses',
         i.criado_em
       FROM interesses_doacao i
       JOIN necessidades n ON n.id = i.necessidade_id
       JOIN usuarios u     ON u.id = i.usuario_id
       WHERE i.ong_id = ?${d2}${tipoFilter2}

       UNION ALL

       SELECT
         e.id,
         COALESCE(e.legenda, n.titulo),
         'evidencia_registrada',
         NULL,
         NULL,
         '/ong/interesses',
         e.criado_em
       FROM evidencias e
       JOIN interesses_doacao i ON i.id = e.interesse_id
       JOIN necessidades n      ON n.id = i.necessidade_id
       WHERE e.ong_id = ?${d3}${tipoFilter3}
     ) AS ativ
     ORDER BY data_evento DESC
     LIMIT ?`,
    [...p1, ...p2, ...p3, lim]
  );

  return (rows as any[]).map((r: any) => ({
    ...r,
    data_evento: r.data_evento
      ? new Date(r.data_evento).toLocaleDateString("pt-BR")
      : null,
  }));
}

// ─── Impacto ──────────────────────────────────────────────────────────────────

export async function buscarImpactoConsolidado(ongId: number, f: FiltrosGerencial = {}) {
  const params: any[] = [ongId];
  const where = df(params, "i.criado_em", f.de, f.ate);

  const [[resumo], [evolucao], [categorias], [extraRow]] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)                                                                       AS total_apoios,
         SUM(i.status = 'recebido')                                                    AS confirmadas,
         COALESCE(SUM(CASE WHEN i.status = 'recebido' THEN i.quantidade_confirmada END), 0) AS itens_recebidos
       FROM interesses_doacao i
       WHERE i.ong_id = ?${where}`,
      params
    ),
    pool.query(
      `SELECT
         DATE_FORMAT(i.criado_em, '%Y-%m')                    AS mes,
         DATE_FORMAT(MIN(i.criado_em), '%m/%Y')               AS mes_label,
         COUNT(*)                                             AS total,
         SUM(i.status = 'recebido')                          AS confirmadas
       FROM interesses_doacao i
       WHERE i.ong_id = ?
         AND i.criado_em >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(i.criado_em, '%Y-%m')
       ORDER BY mes`,
      [ongId]
    ),
    pool.query(
      `SELECT n.categoria, COUNT(*) AS total
       FROM interesses_doacao i
       JOIN necessidades n ON n.id = i.necessidade_id
       WHERE i.ong_id = ? AND i.status = 'recebido'
         AND n.categoria IS NOT NULL AND n.categoria != ''
       GROUP BY n.categoria
       ORDER BY total DESC
       LIMIT 8`,
      [ongId]
    ),
    pool.query(
      `SELECT
         (SELECT COUNT(*) FROM evidencias WHERE ong_id = ?) AS evidencias,
         (SELECT COUNT(*) FROM necessidades WHERE ong_id = ? AND status = 'concluida') AS nec_concluidas`,
      [ongId, ongId]
    ),
  ]) as any[];

  const r = (resumo  as any[])[0] ?? {};
  const er = (extraRow as any[])[0] ?? {};
  return {
    totalApoios:          Number(r.total_apoios    ?? 0),
    confirmadas:          Number(r.confirmadas     ?? 0),
    itensRecebidos:       Number(r.itens_recebidos ?? 0),
    evidencias:           Number(er.evidencias     ?? 0),
    necConcluidas:        Number(er.nec_concluidas ?? 0),
    evolucaoMensal:       evolucao as any[],
    categoriasAtendidas:  categorias as any[],
  };
}
