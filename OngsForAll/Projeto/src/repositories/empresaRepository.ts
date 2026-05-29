import { pool } from "../config/ds";
import { ensureEmailVerificadoColumns } from "./authRepository";

const EMPRESA_CNPJ_CONTROLES_TABLE = "empresa_cnpj_controles";

async function ensureEmpresaCnpjControlesTable() {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS ${EMPRESA_CNPJ_CONTROLES_TABLE} (
      empresa_id INT NOT NULL PRIMARY KEY,
      status_atual VARCHAR(20) NOT NULL DEFAULT 'invalido',
      cnpj_pendente VARCHAR(18) NULL,
      status_solicitacao VARCHAR(20) NULL,
      observacao_admin VARCHAR(255) NULL,
      criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`
  );
}

// ----------------------------------------------------------
// Auth
// ----------------------------------------------------------
export async function findEmpresaByEmail(email: string) {
  const [rows]: any = await pool.query(
    `SELECT id, nome_fantasia AS nome, email, senha, logo, status_marketplace, plano, plano_valido_ate FROM empresas WHERE email = ? LIMIT 1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function createEmpresa(params: {
  nome_fantasia: string;
  razao_social?: string;
  email: string;
  cnpj: string;
  telefone?: string;
  descricao?: string;
  setor?: string;
  senhaHash: string;
  termosVersao: string;
}): Promise<number> {
  await ensureEmailVerificadoColumns();
  const [result]: any = await pool.query(
    `INSERT INTO empresas (nome_fantasia, razao_social, email, cnpj, telefone, descricao, setor, senha, email_verificado, termos_aceitos_em, termos_versao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), ?)`,
    [
      params.nome_fantasia,
      params.razao_social ?? null,
      params.email,
      params.cnpj,
      params.telefone ?? null,
      params.descricao ?? null,
      params.setor ?? null,
      params.senhaHash,
      params.termosVersao,
    ]
  );
  return result.insertId as number;
}

// ----------------------------------------------------------
// Perfil
// ----------------------------------------------------------
export async function findEmpresaById(id: number) {
  const [rows]: any = await pool.query(
    `SELECT id, nome_fantasia, razao_social, email, cnpj, telefone, descricao, setor, logo, status_marketplace,
            plano, DATE_FORMAT(plano_valido_ate, '%d/%m/%Y') AS plano_valido_ate,
            DATE_FORMAT(criado_em, '%d/%m/%Y') AS criado_em
     FROM empresas WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function updateEmpresaLogo(id: number, logoUrl: string) {
  await pool.query(`UPDATE empresas SET logo = ? WHERE id = ?`, [logoUrl, id]);
}

export async function updateEmpresaPerfil(
  id: number,
  params: { nome_fantasia: string; razao_social?: string; email: string; telefone?: string; descricao?: string; setor?: string }
) {
  await pool.query(
    `UPDATE empresas SET nome_fantasia = ?, razao_social = ?, email = ?, telefone = ?, descricao = ?, setor = ? WHERE id = ?`,
    [params.nome_fantasia, params.razao_social ?? null, params.email, params.telefone ?? null, params.descricao ?? null, params.setor ?? null, id]
  );
}

export async function findEmpresaCnpjControle(empresaId: number) {
  await ensureEmpresaCnpjControlesTable();

  const [rows]: any = await pool.query(
    `SELECT empresa_id, status_atual, cnpj_pendente, status_solicitacao, observacao_admin
     FROM ${EMPRESA_CNPJ_CONTROLES_TABLE}
     WHERE empresa_id = ?
     LIMIT 1`,
    [empresaId]
  );

  return rows[0] ?? null;
}

export async function upsertEmpresaCnpjControle(params: {
  empresaId: number;
  statusAtual: "validado" | "invalido";
  cnpjPendente?: string | null;
  statusSolicitacao?: "pendente" | "rejeitado" | null;
  observacaoAdmin?: string | null;
}) {
  await ensureEmpresaCnpjControlesTable();

  await pool.query(
    `INSERT INTO ${EMPRESA_CNPJ_CONTROLES_TABLE} (empresa_id, status_atual, cnpj_pendente, status_solicitacao, observacao_admin)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status_atual = VALUES(status_atual),
       cnpj_pendente = VALUES(cnpj_pendente),
       status_solicitacao = VALUES(status_solicitacao),
       observacao_admin = VALUES(observacao_admin)`,
    [
      params.empresaId,
      params.statusAtual,
      params.cnpjPendente ?? null,
      params.statusSolicitacao ?? null,
      params.observacaoAdmin ?? null,
    ]
  );
}

export async function findEmpresaByNormalizedCnpjExcludingId(normalizedCnpj: string, empresaId: number) {
  const [rows]: any = await pool.query(
    `SELECT id, nome_fantasia
     FROM empresas
     WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '/', ''), '-', ''), ' ', '') = ?
       AND id <> ?
     LIMIT 1`,
    [normalizedCnpj, empresaId]
  );

  return rows[0] ?? null;
}

export async function findEmpresaByPendingNormalizedCnpjExcludingId(normalizedCnpj: string, empresaId: number) {
  await ensureEmpresaCnpjControlesTable();

  const [rows]: any = await pool.query(
    `SELECT c.empresa_id, e.nome_fantasia
     FROM ${EMPRESA_CNPJ_CONTROLES_TABLE} c
     INNER JOIN empresas e ON e.id = c.empresa_id
     WHERE REPLACE(REPLACE(REPLACE(REPLACE(c.cnpj_pendente, '.', ''), '/', ''), '-', ''), ' ', '') = ?
       AND c.empresa_id <> ?
       AND c.status_solicitacao = 'pendente'
     LIMIT 1`,
    [normalizedCnpj, empresaId]
  );

  return rows[0] ?? null;
}

export async function aprovarCnpjPendente(empresaId: number) {
  await ensureEmpresaCnpjControlesTable();

  await pool.query(
    `UPDATE empresas e
     INNER JOIN ${EMPRESA_CNPJ_CONTROLES_TABLE} c ON c.empresa_id = e.id
     SET e.cnpj = c.cnpj_pendente
     WHERE e.id = ?
       AND c.cnpj_pendente IS NOT NULL
       AND c.status_solicitacao = 'pendente'`,
    [empresaId]
  );

  await pool.query(
    `UPDATE ${EMPRESA_CNPJ_CONTROLES_TABLE}
     SET status_atual = 'validado',
         cnpj_pendente = NULL,
         status_solicitacao = NULL,
         observacao_admin = NULL
     WHERE empresa_id = ?`,
    [empresaId]
  );
}

export async function rejeitarCnpjPendente(empresaId: number, observacaoAdmin?: string | null) {
  await ensureEmpresaCnpjControlesTable();

  await pool.query(
    `UPDATE ${EMPRESA_CNPJ_CONTROLES_TABLE}
     SET cnpj_pendente = NULL,
         status_solicitacao = 'rejeitado',
         observacao_admin = ?
     WHERE empresa_id = ?`,
    [observacaoAdmin ?? null, empresaId]
  );
}

export async function updatePlanoEmpresa(id: number, plano: "starter" | "parceiro" | "premium") {
  await pool.query(
    `UPDATE empresas
     SET plano = ?,
         plano_valido_ate = CASE WHEN ? = 'starter' THEN NULL ELSE DATE_ADD(CURDATE(), INTERVAL 30 DAY) END
     WHERE id = ?`,
    [plano, plano, id]
  );
}

// ----------------------------------------------------------
// Apoios (métrica de impacto)
// ----------------------------------------------------------
export async function createApoio(params: {
  empresaId: number;
  necessidadeId: number;
  ongId: number;
  observacao?: string;
}) {
  await pool.query(
    `INSERT IGNORE INTO empresa_apoios (empresa_id, necessidade_id, ong_id, observacao) VALUES (?, ?, ?, ?)`,
    [params.empresaId, params.necessidadeId, params.ongId, params.observacao ?? null]
  );
}

export async function listarApoiosDaEmpresa(empresaId: number) {
  const [rows]: any = await pool.query(
    `SELECT ea.id, ea.observacao, DATE_FORMAT(ea.criado_em, '%d/%m/%Y') AS criado_em,
            n.id AS necessidade_id, n.titulo AS titulo_necessidade, n.tipo_necessidade, n.status AS status_necessidade,
            o.nome AS nome_ong, o.ong_id
     FROM empresa_apoios ea
     INNER JOIN necessidades n ON n.id = ea.necessidade_id
     INNER JOIN ongs o ON o.ong_id = ea.ong_id
     WHERE ea.empresa_id = ?
     ORDER BY ea.criado_em DESC`,
    [empresaId]
  );
  return rows as any[];
}

export async function jaApoiou(empresaId: number, necessidadeId: number): Promise<boolean> {
  const [rows]: any = await pool.query(
    `SELECT 1 FROM empresa_apoios WHERE empresa_id = ? AND necessidade_id = ? LIMIT 1`,
    [empresaId, necessidadeId]
  );
  return rows.length > 0;
}

export async function getMetricas(empresaId: number) {
  const [rows]: any = await pool.query(
    `SELECT
       COUNT(*) AS total_apoios,
       COUNT(DISTINCT ea.ong_id) AS ongs_apoiadas,
       COUNT(DISTINCT n.tipo_necessidade) AS tipos_apoiados
     FROM empresa_apoios ea
     INNER JOIN necessidades n ON n.id = ea.necessidade_id
     WHERE ea.empresa_id = ?`,
    [empresaId]
  );
  return rows[0] ?? { total_apoios: 0, ongs_apoiadas: 0, tipos_apoiados: 0 };
}

// ----------------------------------------------------------
// Status marketplace
// ----------------------------------------------------------
export async function atualizarStatusMarketplace(
  empresaId: number,
  status: "bloqueada" | "elegivel" | "ativa"
) {
  await pool.query(`UPDATE empresas SET status_marketplace = ? WHERE id = ?`, [status, empresaId]);
}

// Verifica e atualiza automaticamente para elegível se atingiu mínimo
export async function verificarElegibilidade(empresaId: number): Promise<boolean> {
  const metricas = await getMetricas(empresaId);
  if (Number(metricas.total_apoios) >= 3) {
    await pool.query(
      `UPDATE empresas SET status_marketplace = 'elegivel' WHERE id = ? AND status_marketplace = 'bloqueada'`,
      [empresaId]
    );
    return true;
  }
  return false;
}

// ----------------------------------------------------------
// Necessidades abertas (para empresa apoiar)
// ----------------------------------------------------------
export async function listarNecessidadesAbertas(empresaId: number, tipo?: string, categoria?: string) {
  let query = `
    SELECT n.id, n.titulo, n.descricao, n.tipo_necessidade, n.categoria, n.quantidade, n.quantidade_recebida, n.status,
           n.local_atividade, n.data_inicio, n.data_fim,
           o.nome AS nome_ong, o.ong_id,
           (SELECT 1 FROM empresa_apoios ea WHERE ea.empresa_id = ? AND ea.necessidade_id = n.id LIMIT 1) AS ja_apoiou
    FROM necessidades n
    INNER JOIN ongs o ON o.ong_id = n.ong_id
    WHERE n.status = 'aberta'
  `;
  const params: any[] = [empresaId];

  if (tipo && ["bem", "servico", "voluntariado"].includes(tipo)) {
    query += ` AND n.tipo_necessidade = ?`;
    params.push(tipo);
  }

  if (categoria) {
    query += ` AND n.categoria = ?`;
    params.push(categoria);
  }
  query += ` ORDER BY n.criado_em DESC LIMIT 30`;

  const [rows]: any = await pool.query(query, params);
  return rows as any[];
}

export async function findNecessidadeOngId(necessidadeId: number): Promise<number | null> {
  const [rows]: any = await pool.query(
    `SELECT ong_id FROM necessidades WHERE id = ? LIMIT 1`,
    [necessidadeId]
  );
  return rows.length ? Number(rows[0].ong_id) : null;
}

// ----------------------------------------------------------
// Admin
// ----------------------------------------------------------
export async function listarEmpresasParaAdmin() {
  await ensureEmpresaCnpjControlesTable();

  const [rows]: any = await pool.query(
    `SELECT e.id, e.nome_fantasia, e.razao_social, e.email, e.cnpj, e.setor, e.status_marketplace, e.logo,
            e.plano, DATE_FORMAT(e.plano_valido_ate, '%d/%m/%Y') AS plano_valido_ate,
            DATE_FORMAT(e.criado_em, '%d/%m/%Y') AS criado_em,
            (SELECT COUNT(*) FROM empresa_apoios WHERE empresa_id = e.id) AS total_apoios,
            c.status_atual, c.cnpj_pendente, c.status_solicitacao, c.observacao_admin
     FROM empresas e
     LEFT JOIN ${EMPRESA_CNPJ_CONTROLES_TABLE} c ON c.empresa_id = e.id
     ORDER BY FIELD(e.status_marketplace,'elegivel','bloqueada','ativa'), e.criado_em DESC`
  );
  return rows as any[];
}
