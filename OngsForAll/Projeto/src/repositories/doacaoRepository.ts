import { pool } from "../config/ds";

export async function userExists(userId: number) {
  const [rows]: any = await pool.query(
    "SELECT id FROM usuarios WHERE id = ? LIMIT 1",
    [userId]
  );
  return !!rows?.length;
}

export async function buscarUsuarioPorId(usuarioId: number) {
  const [rows]: any = await pool.query(
    "SELECT nome, email FROM usuarios WHERE id = ? LIMIT 1",
    [usuarioId]
  );
  return rows?.[0] ?? null;
}
