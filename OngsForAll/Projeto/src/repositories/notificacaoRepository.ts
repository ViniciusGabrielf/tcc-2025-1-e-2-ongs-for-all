import { pool } from "../config/ds";

export async function createNotificacao(params: {
  usuarioId?: number | null;
  ongId?: number | null;
  titulo: string;
  mensagem: string;
  tipo: string;
}) {
  await pool.query(
    `
    INSERT INTO notificacoes (
      usuario_id,
      ong_id,
      titulo,
      mensagem,
      tipo,
      lida,
      criado_em
    )
    VALUES (?, ?, ?, ?, ?, 0, NOW())
    `,
    [
      params.usuarioId ?? null,
      params.ongId ?? null,
      params.titulo,
      params.mensagem,
      params.tipo,
    ]
  );
}

export async function listarNotificacoesUsuario(usuarioId: number) {
  const [rows]: any = await pool.query(
    `
    SELECT
      id,
      titulo,
      mensagem,
      tipo,
      lida,
      DATE_FORMAT(criado_em, '%d/%m/%Y %H:%i') AS criado_em
    FROM notificacoes
    WHERE usuario_id = ?
    ORDER BY criado_em DESC
    `,
    [usuarioId]
  );

  return rows;
}

export async function listarNotificacoesOng(ongId: number) {
  const [rows]: any = await pool.query(
    `
    SELECT
      id,
      titulo,
      mensagem,
      tipo,
      lida,
      DATE_FORMAT(criado_em, '%d/%m/%Y %H:%i') AS criado_em
    FROM notificacoes
    WHERE ong_id = ?
    ORDER BY criado_em DESC
    `,
    [ongId]
  );

  return rows;
}

export async function contarNaoLidasUsuario(usuarioId: number) {
  const [rows]: any = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM notificacoes
    WHERE usuario_id = ? AND lida = 0
    `,
    [usuarioId]
  );

  return rows?.[0]?.total ?? 0;
}

export async function contarNaoLidasOng(ongId: number) {
  const [rows]: any = await pool.query(
    `
    SELECT COUNT(*) AS total
    FROM notificacoes
    WHERE ong_id = ? AND lida = 0
    `,
    [ongId]
  );

  return rows?.[0]?.total ?? 0;
}

export async function createNotificacaoParaTodosUsuarios(params: {
  titulo: string;
  mensagem: string;
  tipo: string;
}) {
  await pool.query(
    `
    INSERT INTO notificacoes (usuario_id, ong_id, titulo, mensagem, tipo, lida, criado_em)
    SELECT id, NULL, ?, ?, ?, 0, NOW()
    FROM usuarios
    `,
    [params.titulo, params.mensagem, params.tipo]
  );
}

export async function marcarComoLida(id: number) {
  await pool.query(
    `
    UPDATE notificacoes
    SET lida = 1
    WHERE id = ?
    `,
    [id]
  );
}

export async function marcarTodasComoLidas(params: {
  destinatarioId: number;
  destinatarioTipo: "usuario" | "ong" | "empresa";
}) {
  const coluna = params.destinatarioTipo === "ong" ? "ong_id" : "usuario_id";
  await pool.query(
    `UPDATE notificacoes SET lida = 1 WHERE ${coluna} = ? AND lida = 0`,
    [params.destinatarioId]
  );
}

export async function listarOngsParaFiltro() {
  const [rows]: any = await pool.query(
    "SELECT ong_id AS id, nome FROM ongs ORDER BY nome ASC"
  );
  return rows;
}

export async function getFeedGlobal(params: {
  limit: number;
  ongId?: number;
  tipo?: string;
  de?: string;
  ate?: string;
}) {
  const conditions: string[] = [];
  const args: any[] = [];

  if (params.ongId) {
    conditions.push("ong_id = ?");
    args.push(params.ongId);
  }
  if (params.tipo) {
    conditions.push("tipo = ?");
    args.push(params.tipo);
  }
  if (params.de) {
    conditions.push("data_evento >= ?");
    args.push(params.de + " 00:00:00");
  }
  if (params.ate) {
    conditions.push("data_evento <= ?");
    args.push(params.ate + " 23:59:59");
  }

  args.push(params.limit);

  const whereClause =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const [rows]: any = await pool.query(
    `
    SELECT
      event_id,
      tipo,
      titulo,
      mensagem,
      DATE_FORMAT(data_evento, '%d/%m/%Y %H:%i') AS data_formatada,
      nome_ong,
      logo_ong,
      necessidade_id
    FROM (
      SELECT
        n.id AS event_id,
        'nova_necessidade' AS tipo,
        CONCAT('Nova necessidade: ', n.titulo) AS titulo,
        CONCAT('A ONG ', o.nome, ' criou uma nova necessidade na categoria ', n.categoria) AS mensagem,
        n.criado_em AS data_evento,
        o.nome AS nome_ong,
        o.logo AS logo_ong,
        n.id AS necessidade_id,
        n.ong_id AS ong_id
      FROM necessidades n
      INNER JOIN ongs o ON o.ong_id = n.ong_id

      UNION ALL

      SELECT
        i.id AS event_id,
        'novo_interesse' AS tipo,
        CONCAT('Interesse em: ', n.titulo) AS titulo,
        CONCAT(u.nome, ' demonstrou interesse em "', n.titulo, '"') AS mensagem,
        i.criado_em AS data_evento,
        o.nome AS nome_ong,
        o.logo AS logo_ong,
        n.id AS necessidade_id,
        n.ong_id AS ong_id
      FROM interesses_doacao i
      INNER JOIN necessidades n ON n.id = i.necessidade_id
      INNER JOIN ongs o ON o.ong_id = n.ong_id
      INNER JOIN usuarios u ON u.id = i.usuario_id

      UNION ALL

      SELECT
        nt.id AS event_id,
        nt.tipo,
        nt.titulo,
        nt.mensagem,
        nt.criado_em AS data_evento,
        o.nome AS nome_ong,
        o.logo AS logo_ong,
        NULL AS necessidade_id,
        nt.ong_id AS ong_id
      FROM notificacoes nt
      INNER JOIN ongs o ON o.ong_id = nt.ong_id
      WHERE nt.tipo = 'meta_atingida' AND nt.ong_id IS NOT NULL

      UNION ALL

      SELECT
        nt.id AS event_id,
        nt.tipo,
        nt.titulo,
        nt.mensagem,
        nt.criado_em AS data_evento,
        NULL AS nome_ong,
        NULL AS logo_ong,
        NULL AS necessidade_id,
        NULL AS ong_id
      FROM notificacoes nt
      WHERE nt.tipo IN ('interesse_aceito', 'interesse_recebido', 'interesse_cancelado')
        AND nt.usuario_id IS NOT NULL
    ) AS feed
    ${whereClause}
    ORDER BY data_evento DESC
    LIMIT ?
    `,
    args
  );

  return rows;
}
