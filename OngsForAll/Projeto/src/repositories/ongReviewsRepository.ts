import { pool } from "../config/ds";

export async function upsertReview(params: {
  ongId: number;
  userId: number;
  userTipo: string;
  rating: number;
  comment?: string | null;
}): Promise<void> {
  await pool.query(
    `INSERT INTO ong_reviews (ong_id, user_id, user_tipo, rating, comment)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       rating     = VALUES(rating),
       comment    = VALUES(comment),
       updated_at = CURRENT_TIMESTAMP`,
    [params.ongId, params.userId, params.userTipo, params.rating, params.comment ?? null]
  );
}

export async function findUserReview(ongId: number, userId: number, userTipo: string) {
  const [rows]: any = await pool.query(
    `SELECT id, ong_id, user_id, user_tipo, rating, comment, created_at, updated_at
     FROM ong_reviews
     WHERE ong_id = ? AND user_id = ? AND user_tipo = ?
     LIMIT 1`,
    [ongId, userId, userTipo]
  );
  return rows?.[0] ?? null;
}

export async function getOngStats(ongId: number) {
  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS total, AVG(rating) AS media
     FROM ong_reviews
     WHERE ong_id = ?`,
    [ongId]
  );
  return {
    total: Number(rows?.[0]?.total ?? 0),
    media: parseFloat(Number(rows?.[0]?.media ?? 0).toFixed(1)),
  };
}
