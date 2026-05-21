import { pool } from "../config/ds";

const USUARIO_CPF_CONTROLES_TABLE = "usuario_cpf_controles";
const ONG_CNPJ_CONTROLES_TABLE = "ong_cnpj_controles";

async function ensureUsuarioCpfControlesTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ${USUARIO_CPF_CONTROLES_TABLE} (
      usuario_id INT NOT NULL PRIMARY KEY,
      status_atual VARCHAR(20) NOT NULL DEFAULT 'validado',
      cpf_pendente VARCHAR(14) NULL,
      status_solicitacao VARCHAR(20) NULL,
      observacao_admin VARCHAR(255) NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  );
}

async function ensureOngCnpjControlesTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ${ONG_CNPJ_CONTROLES_TABLE} (
      ong_id INT NOT NULL PRIMARY KEY,
      status_atual VARCHAR(20) NOT NULL DEFAULT 'validado',
      cnpj_pendente VARCHAR(18) NULL,
      status_solicitacao VARCHAR(20) NULL,
      observacao_admin VARCHAR(255) NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  );
}

export async function findUserById(id: number) {
  const [rows]: any = await pool.query(
    "SELECT id, nome, email, cpf, telefone FROM usuarios WHERE id = ? LIMIT 1",
    [id]
  );
  return rows?.[0] ?? null;
}

export async function updateUserProfile(
  id: number,
  nome: string,
  email: string,
  telefone?: string | null,
  passwordHash?: string | null
) {
  let query = "UPDATE usuarios SET nome = ?, email = ?, telefone = ?";
  const params: any[] = [nome, email, telefone ?? null];

  if (passwordHash) {
    query += ", senha = ?";
    params.push(passwordHash);
  }

  query += " WHERE id = ?";
  params.push(id);

  await pool.query(query, params);
}

export async function findUserCpfControle(userId: number) {
  await ensureUsuarioCpfControlesTable();

  const [rows]: any = await pool.query(
    `SELECT usuario_id, status_atual, cpf_pendente, status_solicitacao, observacao_admin
     FROM ${USUARIO_CPF_CONTROLES_TABLE}
     WHERE usuario_id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0] ?? null;
}

export async function upsertUserCpfControle(params: {
  userId: number;
  statusAtual: "validado" | "invalido";
  cpfPendente?: string | null;
  statusSolicitacao?: "pendente" | "rejeitado" | null;
  observacaoAdmin?: string | null;
}) {
  await ensureUsuarioCpfControlesTable();

  await pool.query(
    `INSERT INTO ${USUARIO_CPF_CONTROLES_TABLE} (usuario_id, status_atual, cpf_pendente, status_solicitacao, observacao_admin)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status_atual = VALUES(status_atual),
       cpf_pendente = VALUES(cpf_pendente),
       status_solicitacao = VALUES(status_solicitacao),
       observacao_admin = VALUES(observacao_admin)`,
    [
      params.userId,
      params.statusAtual,
      params.cpfPendente ?? null,
      params.statusSolicitacao ?? null,
      params.observacaoAdmin ?? null,
    ]
  );
}

export async function findUserByNormalizedCpfExcludingId(normalizedCpf: string, userId: number) {
  const [rows]: any = await pool.query(
    `SELECT id, nome
     FROM usuarios
     WHERE REPLACE(REPLACE(REPLACE(REPLACE(cpf, '.', ''), '/', ''), '-', ''), ' ', '') = ?
       AND id <> ?
     LIMIT 1`,
    [normalizedCpf, userId]
  );

  return rows[0] ?? null;
}

export async function findUserByPendingNormalizedCpfExcludingId(normalizedCpf: string, userId: number) {
  await ensureUsuarioCpfControlesTable();

  const [rows]: any = await pool.query(
    `SELECT c.usuario_id, u.nome
     FROM ${USUARIO_CPF_CONTROLES_TABLE} c
     INNER JOIN usuarios u ON u.id = c.usuario_id
     WHERE REPLACE(REPLACE(REPLACE(REPLACE(c.cpf_pendente, '.', ''), '/', ''), '-', ''), ' ', '') = ?
       AND c.usuario_id <> ?
       AND c.status_solicitacao = 'pendente'
     LIMIT 1`,
    [normalizedCpf, userId]
  );

  return rows[0] ?? null;
}

export async function aprovarCpfPendente(userId: number) {
  await ensureUsuarioCpfControlesTable();

  await pool.query(
    `UPDATE usuarios u
     INNER JOIN ${USUARIO_CPF_CONTROLES_TABLE} c ON c.usuario_id = u.id
     SET u.cpf = c.cpf_pendente
     WHERE u.id = ?
       AND c.cpf_pendente IS NOT NULL
       AND c.status_solicitacao = 'pendente'`,
    [userId]
  );

  await pool.query(
    `UPDATE ${USUARIO_CPF_CONTROLES_TABLE}
     SET status_atual = 'validado',
         cpf_pendente = NULL,
         status_solicitacao = NULL,
         observacao_admin = NULL
     WHERE usuario_id = ?`,
    [userId]
  );
}

export async function rejeitarCpfPendente(userId: number, observacaoAdmin?: string | null) {
  await ensureUsuarioCpfControlesTable();

  await pool.query(
    `UPDATE ${USUARIO_CPF_CONTROLES_TABLE}
     SET cpf_pendente = NULL,
         status_solicitacao = 'rejeitado',
         observacao_admin = ?
     WHERE usuario_id = ?`,
    [observacaoAdmin ?? null, userId]
  );
}

export async function findOngById(id: number) {
  const [rows]: any = await pool.query(
    "SELECT ong_id AS id, nome, email, cnpj, area_atuacao, telefone, logo FROM ongs WHERE ong_id = ? LIMIT 1",
    [id]
  );
  return rows?.[0] ?? null;
}

export async function updateOngProfile(
  id: number,
  nome: string,
  email: string,
  telefone?: string | null,
  areaAtuacao?: string | null,
  passwordHash?: string | null
) {
  let query = "UPDATE ongs SET nome = ?, email = ?, telefone = ?, area_atuacao = ?";
  const params: any[] = [nome, email, telefone ?? null, areaAtuacao ?? null];

  if (passwordHash) {
    query += ", senha = ?";
    params.push(passwordHash);
  }

  query += " WHERE ong_id = ?";
  params.push(id);

  await pool.query(query, params);
}

export async function findOngCnpjControle(ongId: number) {
  await ensureOngCnpjControlesTable();

  const [rows]: any = await pool.query(
    `SELECT ong_id, status_atual, cnpj_pendente, status_solicitacao, observacao_admin
     FROM ${ONG_CNPJ_CONTROLES_TABLE}
     WHERE ong_id = ?
     LIMIT 1`,
    [ongId]
  );

  return rows[0] ?? null;
}

export async function upsertOngCnpjControle(params: {
  ongId: number;
  statusAtual: "validado" | "invalido";
  cnpjPendente?: string | null;
  statusSolicitacao?: "pendente" | "rejeitado" | null;
  observacaoAdmin?: string | null;
}) {
  await ensureOngCnpjControlesTable();

  await pool.query(
    `INSERT INTO ${ONG_CNPJ_CONTROLES_TABLE} (ong_id, status_atual, cnpj_pendente, status_solicitacao, observacao_admin)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status_atual = VALUES(status_atual),
       cnpj_pendente = VALUES(cnpj_pendente),
       status_solicitacao = VALUES(status_solicitacao),
       observacao_admin = VALUES(observacao_admin)`,
    [
      params.ongId,
      params.statusAtual,
      params.cnpjPendente ?? null,
      params.statusSolicitacao ?? null,
      params.observacaoAdmin ?? null,
    ]
  );
}

export async function findOngByNormalizedCnpjExcludingId(normalizedCnpj: string, ongId: number) {
  const [rows]: any = await pool.query(
    `SELECT ong_id, nome
     FROM ongs
     WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
       AND ong_id <> ?
     LIMIT 1`,
    [normalizedCnpj, ongId]
  );

  return rows[0] ?? null;
}

export async function findOngByPendingNormalizedCnpjExcludingId(normalizedCnpj: string, ongId: number) {
  await ensureOngCnpjControlesTable();

  const [rows]: any = await pool.query(
    `SELECT c.ong_id, o.nome
     FROM ${ONG_CNPJ_CONTROLES_TABLE} c
     INNER JOIN ongs o ON o.ong_id = c.ong_id
     WHERE REPLACE(REPLACE(REPLACE(REPLACE(c.cnpj_pendente, '.', ''), '/', ''), '-', ''), ' ', '') = ?
       AND c.ong_id <> ?
       AND c.status_solicitacao = 'pendente'
     LIMIT 1`,
    [normalizedCnpj, ongId]
  );

  return rows[0] ?? null;
}

export async function aprovarOngCnpjPendente(ongId: number) {
  await ensureOngCnpjControlesTable();

  await pool.query(
    `UPDATE ongs o
     INNER JOIN ${ONG_CNPJ_CONTROLES_TABLE} c ON c.ong_id = o.ong_id
     SET o.cnpj = c.cnpj_pendente
     WHERE o.ong_id = ?
       AND c.cnpj_pendente IS NOT NULL
       AND c.status_solicitacao = 'pendente'`,
    [ongId]
  );

  await pool.query(
    `UPDATE ${ONG_CNPJ_CONTROLES_TABLE}
     SET status_atual = 'validado',
         cnpj_pendente = NULL,
         status_solicitacao = NULL,
         observacao_admin = NULL
     WHERE ong_id = ?`,
    [ongId]
  );
}

export async function rejeitarOngCnpjPendente(ongId: number, observacaoAdmin?: string | null) {
  await ensureOngCnpjControlesTable();

  await pool.query(
    `UPDATE ${ONG_CNPJ_CONTROLES_TABLE}
     SET cnpj_pendente = NULL,
         status_solicitacao = 'rejeitado',
         observacao_admin = ?
     WHERE ong_id = ?`,
    [observacaoAdmin ?? null, ongId]
  );
}

export async function updateOngLogo(ongId: number, logoPath: string) {
  await pool.query("UPDATE ongs SET logo = ? WHERE ong_id = ?", [logoPath, ongId]);
}

export async function listAllOngs(params: {
  search?: string;
  limit: number;
  offset: number;
  excludeOngId?: number;
}) {
  let fromClause = " FROM ongs";
  const queryParams: any[] = [];

  if (params.excludeOngId) {
    fromClause += " WHERE ong_id <> ?";
    queryParams.push(params.excludeOngId);
  }

  if (params.search && params.search.trim()) {
    fromClause += queryParams.length ? " AND" : " WHERE";
    fromClause += " (nome LIKE ? OR area_atuacao LIKE ?)";
    const term = `%${params.search.trim()}%`;
    queryParams.push(term, term);
  }

  const [countRows]: any = await pool.query(
    `SELECT COUNT(*) AS total${fromClause}`,
    queryParams
  );

  const [rows]: any = await pool.query(
    `SELECT ong_id AS id, nome, email, area_atuacao, telefone, logo${fromClause} ORDER BY nome ASC LIMIT ? OFFSET ?`,
    [...queryParams, params.limit, params.offset]
  );

  return {
    items: rows,
    total: Number(countRows?.[0]?.total ?? 0),
  };
}

export async function listarDocumentosPendentesParaAdmin() {
  await ensureUsuarioCpfControlesTable();
  await ensureOngCnpjControlesTable();

  const [usuarios]: any = await pool.query(
    `SELECT u.id, u.nome, u.email, u.cpf AS documento_atual, c.cpf_pendente AS documento_pendente,
            c.status_solicitacao, c.observacao_admin, DATE_FORMAT(c.atualizado_em, '%d/%m/%Y') AS atualizado_em
     FROM usuarios u
     INNER JOIN ${USUARIO_CPF_CONTROLES_TABLE} c ON c.usuario_id = u.id
     WHERE c.status_solicitacao = 'pendente'
     ORDER BY c.atualizado_em DESC`
  );

  const [ongs]: any = await pool.query(
    `SELECT o.ong_id AS id, o.nome, o.email, o.cnpj AS documento_atual, c.cnpj_pendente AS documento_pendente,
            c.status_solicitacao, c.observacao_admin, DATE_FORMAT(c.atualizado_em, '%d/%m/%Y') AS atualizado_em
     FROM ongs o
     INNER JOIN ${ONG_CNPJ_CONTROLES_TABLE} c ON c.ong_id = o.ong_id
     WHERE c.status_solicitacao = 'pendente'
     ORDER BY c.atualizado_em DESC`
  );

  return {
    usuarios: usuarios.map((u: any) => ({ ...u, tipo: "usuario", tipoLabel: "Pessoa fisica" })),
    ongs: ongs.map((o: any) => ({ ...o, tipo: "ong", tipoLabel: "ONG" })),
  };
}
