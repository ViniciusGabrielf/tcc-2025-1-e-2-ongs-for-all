import { pool } from "../config/ds";

export type UserRow = {
  id: number;
  nome: string;
  email: string;
  senha: string;
  reset_token?: string | null;
  reset_token_expires?: Date | null;
};

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const [rows]: any = await pool.query(
    "SELECT id, nome, email, senha FROM usuarios WHERE email = ? LIMIT 1",
    [email]
  );
  return rows?.[0] ?? null;
}

export async function findUserIdByNomeEmailCpf(nome: string, email: string, cpf: string): Promise<number | null> {
  const [rows]: any = await pool.query(
    "SELECT id FROM usuarios WHERE nome = ? AND email = ? AND cpf = ? LIMIT 1",
    [nome, email, cpf]
  );
  return rows?.[0]?.id ?? null;
}

export async function insertLoginLog(email: string, ip: string, dataHora: Date, sucesso: boolean) {
  await pool.query(
    "INSERT INTO login_logs (email, ip_address, data_hora, sucesso) VALUES (?, ?, ?, ?)",
    [email, ip, dataHora, sucesso]
  );
}

export async function setResetTokenHash(userId: number, tokenHash: string) {
  await pool.query(
    `UPDATE usuarios
     SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 15 MINUTE)
     WHERE id = ?`,
    [tokenHash, userId]
  );
}

export async function findUserIdByValidResetTokenHash(tokenHash: string): Promise<number | null> {
  const [rows]: any = await pool.query(
    `SELECT id FROM usuarios
     WHERE reset_token = ?
       AND reset_token_expires > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return rows?.[0]?.id ?? null;
}

export async function updatePasswordAndClearReset(userId: number, passwordHash: string) {
  await pool.query(
    `UPDATE usuarios
     SET senha = ?, reset_token = NULL, reset_token_expires = NULL
     WHERE id = ?`,
    [passwordHash, userId]
  );
}
export async function findOngByEmail(email: string) {
  const [rows]: any = await pool.query(
    "SELECT ong_id, nome, email, senha, logo FROM ongs WHERE email = ? LIMIT 1",
    [email]
  );
  return rows?.[0] ?? null;
}

export async function findEmpresaByEmailAuth(email: string) {
  const [rows]: any = await pool.query(
    "SELECT id, nome_fantasia AS nome, email, senha, logo, plano, plano_valido_ate FROM empresas WHERE email = ? LIMIT 1",
    [email]
  );
  return rows?.[0] ?? null;
}
