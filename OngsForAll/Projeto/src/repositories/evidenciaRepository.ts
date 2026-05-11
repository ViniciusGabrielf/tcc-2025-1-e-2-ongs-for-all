import { pool } from "../config/ds";

export async function createEvidencia(params: {
  interesseId: number;
  ongId: number;
  imagemUrl: string;
  legenda?: string;
}) {
  await pool.query(
    `INSERT INTO evidencias (interesse_id, ong_id, imagem_url, legenda, criado_em)
     VALUES (?, ?, ?, ?, NOW())`,
    [params.interesseId, params.ongId, params.imagemUrl, params.legenda ?? null]
  );
}

export async function findByInteresseId(interesseId: number) {
  const [rows]: any = await pool.query(
    `SELECT id, interesse_id, ong_id, imagem_url, legenda,
       DATE_FORMAT(criado_em, '%d/%m/%Y') AS criado_em
     FROM evidencias WHERE interesse_id = ? ORDER BY criado_em ASC`,
    [interesseId]
  );
  return rows;
}

export async function buscarInteressePorId(id: number) {
  const [rows]: any = await pool.query(
    `SELECT i.id, i.ong_id, i.status, n.titulo AS titulo_necessidade
     FROM interesses_doacao i
     INNER JOIN necessidades n ON n.id = i.necessidade_id
     WHERE i.id = ? LIMIT 1`,
    [id]
  );
  return rows?.[0] ?? null;
}
