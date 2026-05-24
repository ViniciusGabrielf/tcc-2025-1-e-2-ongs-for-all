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
    `SELECT id
     FROM usuarios
     WHERE nome = ?
       AND email = ?
       AND REPLACE(REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', ''), '/', '') = ?
     LIMIT 1`,
    [nome, email, cpf]
  );
  return rows?.[0]?.id ?? null;
}

// ---- Funções unificadas para reset de senha (usuário, ONG e empresa) ----

const INIT_PASSWORD_RESETS = `
  CREATE TABLE IF NOT EXISTS password_resets (
    account_tipo ENUM('usuario','ong','empresa') NOT NULL,
    account_id   INT NOT NULL,
    token_hash   VARCHAR(255) NOT NULL,
    expires_at   DATETIME NOT NULL,
    PRIMARY KEY (account_tipo, account_id)
  )
`;

let _tableReady = false;
async function ensurePasswordResetsTable() {
  if (_tableReady) return;
  await pool.query(INIT_PASSWORD_RESETS);
  _tableReady = true;
}

export async function findAccountByNomeEmailDocumento(
  nome: string,
  email: string,
  documento: string
): Promise<{ id: number; tipo: "usuario" | "ong" | "empresa" } | null> {
  const norm = `REPLACE(REPLACE(REPLACE(REPLACE(?, '.', ''), '-', ''), ' ', ''), '/', '')`;

  const [r1]: any = await pool.query(
    `SELECT id FROM usuarios
     WHERE nome = ? AND email = ?
       AND REPLACE(REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', ''), '/', '') = ${norm}
     LIMIT 1`,
    [nome, email, documento]
  );
  if (r1?.[0]) return { id: r1[0].id, tipo: "usuario" };

  const [r2]: any = await pool.query(
    `SELECT ong_id AS id FROM ongs
     WHERE nome = ? AND email = ?
       AND REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '-', ''), ' ', ''), '/', '') = ${norm}
     LIMIT 1`,
    [nome, email, documento]
  );
  if (r2?.[0]) return { id: r2[0].id, tipo: "ong" };

  const [r3]: any = await pool.query(
    `SELECT id FROM empresas
     WHERE nome_fantasia = ? AND email = ?
       AND REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '-', ''), ' ', ''), '/', '') = ${norm}
     LIMIT 1`,
    [nome, email, documento]
  );
  if (r3?.[0]) return { id: r3[0].id, tipo: "empresa" };

  return null;
}

export async function setPasswordResetToken(
  account: { id: number; tipo: string },
  tokenHash: string
) {
  await ensurePasswordResetsTable();
  await pool.query(
    `INSERT INTO password_resets (account_tipo, account_id, token_hash, expires_at)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))
     ON DUPLICATE KEY UPDATE token_hash = VALUES(token_hash), expires_at = VALUES(expires_at)`,
    [account.tipo, account.id, tokenHash]
  );
}

export async function findAccountByValidResetToken(
  tokenHash: string
): Promise<{ id: number; tipo: string } | null> {
  await ensurePasswordResetsTable();
  const [rows]: any = await pool.query(
    `SELECT account_tipo AS tipo, account_id AS id
     FROM password_resets
     WHERE token_hash = ? AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );
  return rows?.[0] ?? null;
}

export async function updatePasswordByAccount(
  account: { id: number; tipo: string },
  passwordHash: string
) {
  await ensurePasswordResetsTable();
  if (account.tipo === "usuario") {
    await pool.query(`UPDATE usuarios SET senha = ? WHERE id = ?`, [passwordHash, account.id]);
  } else if (account.tipo === "ong") {
    await pool.query(`UPDATE ongs SET senha = ? WHERE ong_id = ?`, [passwordHash, account.id]);
  } else if (account.tipo === "empresa") {
    await pool.query(`UPDATE empresas SET senha = ? WHERE id = ?`, [passwordHash, account.id]);
  }
  await pool.query(
    `DELETE FROM password_resets WHERE account_tipo = ? AND account_id = ?`,
    [account.tipo, account.id]
  );
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
