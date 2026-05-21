import { pool } from "../config/ds";

export async function createNecessidade(params: {
  ongId: number;
  titulo: string;
  descricao: string;
  categoria: string;
  quantidade: number;
  tipo_necessidade: "bem" | "servico" | "voluntariado";
  local_atividade?: string | null;
  turno?: string | null;
  data_inicio?: string | null;
  data_fim?: string | null;
}) {
  await pool.query(
    `
    INSERT INTO necessidades (
      ong_id,
      titulo,
      descricao,
      categoria,
      quantidade,
      tipo_necessidade,
      local_atividade,
      turno,
      data_inicio,
      data_fim,
      quantidade_recebida,
      status,
      criado_em,
      atualizado_em
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'aberta', NOW(), NOW())
    `,
    [
      params.ongId,
      params.titulo,
      params.descricao,
      params.categoria,
      params.quantidade,
      params.tipo_necessidade,
      params.local_atividade ?? null,
      params.turno ?? null,
      params.data_inicio ?? null,
      params.data_fim ?? null,
    ]
  );
}

export async function findAllAbertas(
  params: {
    ongId?: number;
    tipoNecessidade?: string;
    categoria?: string;
    busca?: string;
    limit: number;
    offset: number;
  }
) {
  let fromClause = `
    FROM necessidades n
    INNER JOIN ongs o ON o.ong_id = n.ong_id
    WHERE n.status = 'aberta'`;
  const queryParams: any[] = [];

  if (params.ongId) {
    fromClause += ` AND n.ong_id = ?`;
    queryParams.push(params.ongId);
  }

  if (params.tipoNecessidade && ["bem", "servico", "voluntariado"].includes(params.tipoNecessidade)) {
    fromClause += ` AND n.tipo_necessidade = ?`;
    queryParams.push(params.tipoNecessidade);
  }

  if (params.categoria) {
    fromClause += ` AND n.categoria = ?`;
    queryParams.push(params.categoria);
  }

  if (params.busca) {
    fromClause += ` AND (n.titulo LIKE ? OR n.descricao LIKE ?)`;
    queryParams.push(`%${params.busca}%`, `%${params.busca}%`);
  }

  const [countRows]: any = await pool.query(
    `SELECT COUNT(*) AS total ${fromClause}`,
    queryParams
  );

  const query = `
    SELECT
      n.id,
      n.titulo,
      n.descricao,
      n.categoria,
      n.quantidade,
      n.quantidade_recebida,
      n.status,
      n.criado_em,
      n.ong_id,
      n.tipo_necessidade,
      n.local_atividade,
      n.turno,
      n.data_inicio,
      n.data_fim,
      o.nome AS nome_ong,
      GREATEST(n.quantidade - n.quantidade_recebida, 0) AS faltante,
      LEAST(
        ROUND((n.quantidade_recebida / NULLIF(n.quantidade, 0)) * 100, 0),
        100
      ) AS percentual,
      CASE
        WHEN n.quantidade_recebida >= n.quantidade THEN 1
        ELSE 0
      END AS meta_atingida,
      CASE
        WHEN n.quantidade_recebida < n.quantidade
          AND LEAST(
            ROUND((n.quantidade_recebida / NULLIF(n.quantidade, 0)) * 100, 0),
            100
          ) >= 80
        THEN 1
        ELSE 0
      END AS quase_completa
    ${fromClause}
    ORDER BY n.criado_em DESC
    LIMIT ? OFFSET ?`;

  const [rows]: any = await pool.query(query, [...queryParams, params.limit, params.offset]);
  return {
    items: rows,
    total: Number(countRows?.[0]?.total ?? 0),
  };
}

export async function findById(id: number) {
  const [rows]: any = await pool.query(
    `
    SELECT 
      n.id,
      n.ong_id,
      n.titulo,
      n.descricao,
      n.categoria,
      n.quantidade,
      n.quantidade_recebida,
      n.status,
      n.criado_em,
      n.atualizado_em,
      n.tipo_necessidade,
      n.local_atividade,
      n.turno,
      n.data_inicio,
      n.data_fim,
      o.nome AS nome_ong,
      o.email AS email_ong,
      GREATEST(n.quantidade - n.quantidade_recebida, 0) AS faltante,
      LEAST(
        ROUND((n.quantidade_recebida / NULLIF(n.quantidade, 0)) * 100, 0),
        100
      ) AS percentual,
      CASE
        WHEN n.quantidade_recebida >= n.quantidade THEN 1
        ELSE 0
      END AS meta_atingida,
      CASE
        WHEN n.quantidade_recebida < n.quantidade
          AND LEAST(
            ROUND((n.quantidade_recebida / NULLIF(n.quantidade, 0)) * 100, 0),
            100
          ) >= 80
        THEN 1
        ELSE 0
      END AS quase_completa
    FROM necessidades n
    INNER JOIN ongs o ON o.ong_id = n.ong_id
    WHERE n.id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows?.[0] ?? null;
}

export async function findByOngId(ongId: number, status?: string) {
  const params: any[] = [ongId];
  let filtroClause = "";

  if (status && status !== "todos") {
    filtroClause = "AND n.status = ?";
    params.push(status);
  }

  const [rows]: any = await pool.query(
    `
    SELECT
      n.id,
      n.titulo,
      n.descricao,
      n.categoria,
      n.quantidade,
      n.quantidade_recebida,
      n.status,
      n.criado_em,
      n.atualizado_em,
      n.tipo_necessidade,
      n.local_atividade,
      n.turno,
      n.data_inicio,
      n.data_fim,
      GREATEST(n.quantidade - n.quantidade_recebida, 0) AS faltante,
      LEAST(
        ROUND((n.quantidade_recebida / NULLIF(n.quantidade, 0)) * 100, 0),
        100
      ) AS percentual,
      CASE
        WHEN n.quantidade_recebida >= n.quantidade THEN 1
        ELSE 0
      END AS meta_atingida,
      CASE
        WHEN n.quantidade_recebida < n.quantidade
          AND LEAST(
            ROUND((n.quantidade_recebida / NULLIF(n.quantidade, 0)) * 100, 0),
            100
          ) >= 80
        THEN 1
        ELSE 0
      END AS quase_completa
    FROM necessidades n
    WHERE n.ong_id = ? ${filtroClause}
    ORDER BY n.criado_em DESC
    `,
    params
  );

  return rows;
}

export async function buscarNomeOngPorId(ongId: number) {
  const [rows]: any = await pool.query(
    "SELECT nome FROM ongs WHERE ong_id = ? LIMIT 1",
    [ongId]
  );
  return rows?.[0] ?? null;
}

export async function updateStatus(id: number, ongId: number, status: string) {
  await pool.query(
    `
    UPDATE necessidades
    SET status = ?, atualizado_em = NOW()
    WHERE id = ? AND ong_id = ?
    `,
    [status, id, ongId]
  );
}
