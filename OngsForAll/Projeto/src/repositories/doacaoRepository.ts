import { pool } from "../config/ds";

export async function listOngs() {
  const [rows]: any = await pool.query("SELECT ong_id, nome FROM ongs");
  return rows;
}

export async function buscarNomeUsuarioPorId(usuarioId: number) {
  const [rows]: any = await pool.query(
    "SELECT nome FROM usuarios WHERE id = ? LIMIT 1",
    [usuarioId]
  );
  return rows?.[0] ?? null;
}

export async function userExists(userId: number) {
  const [rows]: any = await pool.query(
    "SELECT id FROM usuarios WHERE id = ? LIMIT 1",
    [userId]
  );
  return !!rows?.length;
}

export async function buscarNecessidadePorId(necessidadeId: number) {
  const [rows]: any = await pool.query(
    `
    SELECT
      n.id,
      n.ong_id,
      n.titulo,
      n.descricao,
      n.categoria,
      n.quantidade,
      n.status,
      o.nome AS nome_ong
    FROM necessidades n
    INNER JOIN ongs o ON n.ong_id = o.ong_id
    WHERE n.id = ?
    LIMIT 1
    `,
    [necessidadeId]
  );

  return rows?.[0] ?? null;
}

export async function createDoacao(params: {
  usuarioId: number;
  valor: number;
  tipo: string;
  ongId: number;
  necessidadeId?: number | null;
}) {
  await pool.query(
    `
    INSERT INTO doacoes (usuario_id, valor, tipo, ong_id, necessidade_id, data)
    VALUES (?, ?, ?, ?, ?, NOW())
    `,
    [
      params.usuarioId,
      params.valor,
      params.tipo,
      params.ongId,
      params.necessidadeId ?? null,
    ]
  );
}

export async function listHistoricoByUser(usuarioId: number) {
  const [rows]: any = await pool.query(
    `
    SELECT 
      d.valor, 
      d.tipo, 
      DATE_FORMAT(d.data, '%d/%m/%Y') AS data,
      o.nome AS nome_ong
    FROM doacoes d
    LEFT JOIN ongs o ON d.ong_id = o.ong_id
    WHERE d.usuario_id = ?
    ORDER BY d.data DESC
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