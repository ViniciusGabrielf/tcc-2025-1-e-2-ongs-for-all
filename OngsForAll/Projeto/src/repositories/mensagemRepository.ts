import { pool } from "../config/ds";

let _empresaColEnsured = false;
async function ensureEmpresaIdColumn() {
  if (_empresaColEnsured) return;
  try { await pool.query(`ALTER TABLE conversas ADD COLUMN empresa_id INT NULL DEFAULT NULL`); } catch (_) {}
  try { await pool.query(`ALTER TABLE conversas MODIFY COLUMN usuario_id INT NULL DEFAULT NULL`); } catch (_) {}
  try { await pool.query(`ALTER TABLE mensagens MODIFY COLUMN remetente_tipo ENUM('usuario','ong','empresa') NOT NULL`); } catch (_) {}
  _empresaColEnsured = true;
}

let _arquivadoColEnsured = false;
async function ensureArquivadoColumns() {
  if (_arquivadoColEnsured) return;
  await ensureEmpresaIdColumn();
  try { await pool.query(`ALTER TABLE conversas ADD COLUMN arquivado_ong     TINYINT(1) NOT NULL DEFAULT 0`); } catch (_) {}
  try { await pool.query(`ALTER TABLE conversas ADD COLUMN arquivado_usuario TINYINT(1) NOT NULL DEFAULT 0`); } catch (_) {}
  try { await pool.query(`ALTER TABLE conversas ADD COLUMN arquivado_empresa TINYINT(1) NOT NULL DEFAULT 0`); } catch (_) {}
  _arquivadoColEnsured = true;
}

export async function encontrarOuCriarConversa(params: {
  usuarioId: number;
  ongId: number;
  necessidadeId?: number;
}): Promise<number> {
  const necessidadeId = params.necessidadeId ?? null;

  const [existing]: any = await pool.query(
    `SELECT id FROM conversas WHERE usuario_id = ? AND ong_id = ? AND (necessidade_id = ? OR (necessidade_id IS NULL AND ? IS NULL)) LIMIT 1`,
    [params.usuarioId, params.ongId, necessidadeId, necessidadeId]
  );

  if (existing.length > 0) return existing[0].id as number;

  const [result]: any = await pool.query(
    `INSERT INTO conversas (usuario_id, ong_id, necessidade_id) VALUES (?, ?, ?)`,
    [params.usuarioId, params.ongId, necessidadeId]
  );

  return result.insertId as number;
}

export async function encontrarOuCriarConversaEmpresa(params: {
  empresaId: number;
  ongId: number;
  necessidadeId?: number;
}): Promise<number> {
  await ensureEmpresaIdColumn();
  const necessidadeId = params.necessidadeId ?? null;

  const [existing]: any = await pool.query(
    `SELECT id FROM conversas WHERE empresa_id = ? AND ong_id = ? AND (necessidade_id = ? OR (necessidade_id IS NULL AND ? IS NULL)) LIMIT 1`,
    [params.empresaId, params.ongId, necessidadeId, necessidadeId]
  );

  if (existing.length > 0) return existing[0].id as number;

  const [result]: any = await pool.query(
    `INSERT INTO conversas (empresa_id, ong_id, necessidade_id) VALUES (?, ?, ?)`,
    [params.empresaId, params.ongId, necessidadeId]
  );
  return result.insertId as number;
}

export async function buscarConversaPorId(id: number) {
  await ensureArquivadoColumns();
  const [rows]: any = await pool.query(
    `SELECT c.id, c.usuario_id, c.empresa_id, c.ong_id, c.necessidade_id,
            c.arquivado_ong, c.arquivado_usuario, c.arquivado_empresa,
            u.nome AS nome_usuario,
            e.nome_fantasia AS nome_empresa,
            o.nome AS nome_ong,
            o.logo AS logo_ong,
            n.titulo AS titulo_necessidade
     FROM conversas c
     LEFT JOIN usuarios u ON u.id = c.usuario_id
     LEFT JOIN empresas e ON e.id = c.empresa_id
     INNER JOIN ongs o ON o.ong_id = c.ong_id
     LEFT JOIN necessidades n ON n.id = c.necessidade_id
     WHERE c.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function listarConversasDoUsuario(usuarioId: number, arquivado: 0 | 1 = 0) {
  await ensureArquivadoColumns();
  const [rows]: any = await pool.query(
    `SELECT c.id, c.usuario_id, c.ong_id, c.necessidade_id,
            o.nome AS nome_ong,
            o.logo AS logo_ong,
            n.titulo AS titulo_necessidade,
            (SELECT m.conteudo FROM mensagens m WHERE m.conversa_id = c.id ORDER BY m.criado_em DESC LIMIT 1) AS ultima_mensagem,
            (SELECT DATE_FORMAT(m.criado_em, '%d/%m/%Y %H:%i') FROM mensagens m WHERE m.conversa_id = c.id ORDER BY m.criado_em DESC LIMIT 1) AS ultima_em,
            (SELECT COUNT(*) FROM mensagens m WHERE m.conversa_id = c.id AND m.lida = 0 AND m.remetente_tipo = 'ong') AS nao_lidas
     FROM conversas c
     INNER JOIN ongs o ON o.ong_id = c.ong_id
     LEFT JOIN necessidades n ON n.id = c.necessidade_id
     WHERE c.usuario_id = ? AND c.arquivado_usuario = ?
     ORDER BY ultima_em DESC`,
    [usuarioId, arquivado]
  );
  return rows as any[];
}

export async function listarConversasDaOng(ongId: number, arquivado: 0 | 1 = 0) {
  await ensureArquivadoColumns();
  const [rows]: any = await pool.query(
    `SELECT c.id, c.usuario_id, c.empresa_id, c.ong_id, c.necessidade_id,
            u.nome AS nome_usuario,
            e.nome_fantasia AS nome_empresa,
            n.titulo AS titulo_necessidade,
            COALESCE(u.nome, e.nome_fantasia) AS nome_remetente,
            IF(c.empresa_id IS NOT NULL, 'empresa', 'usuario') AS tipo_remetente,
            (SELECT m.conteudo FROM mensagens m WHERE m.conversa_id = c.id ORDER BY m.criado_em DESC LIMIT 1) AS ultima_mensagem,
            (SELECT DATE_FORMAT(m.criado_em, '%d/%m/%Y %H:%i') FROM mensagens m WHERE m.conversa_id = c.id ORDER BY m.criado_em DESC LIMIT 1) AS ultima_em,
            (SELECT COUNT(*) FROM mensagens m WHERE m.conversa_id = c.id AND m.lida = 0 AND m.remetente_tipo IN ('usuario','empresa')) AS nao_lidas
     FROM conversas c
     LEFT JOIN usuarios u ON u.id = c.usuario_id
     LEFT JOIN empresas e ON e.id = c.empresa_id
     LEFT JOIN necessidades n ON n.id = c.necessidade_id
     WHERE c.ong_id = ? AND c.arquivado_ong = ?
     ORDER BY ultima_em DESC`,
    [ongId, arquivado]
  );
  return rows as any[];
}

export async function listarConversasDaEmpresa(empresaId: number, arquivado: 0 | 1 = 0) {
  await ensureArquivadoColumns();
  const [rows]: any = await pool.query(
    `SELECT c.id, c.empresa_id, c.ong_id, c.necessidade_id,
            o.nome AS nome_ong,
            o.logo AS logo_ong,
            n.titulo AS titulo_necessidade,
            (SELECT m.conteudo FROM mensagens m WHERE m.conversa_id = c.id ORDER BY m.criado_em DESC LIMIT 1) AS ultima_mensagem,
            (SELECT DATE_FORMAT(m.criado_em, '%d/%m/%Y %H:%i') FROM mensagens m WHERE m.conversa_id = c.id ORDER BY m.criado_em DESC LIMIT 1) AS ultima_em,
            (SELECT COUNT(*) FROM mensagens m WHERE m.conversa_id = c.id AND m.lida = 0 AND m.remetente_tipo = 'ong') AS nao_lidas
     FROM conversas c
     INNER JOIN ongs o ON o.ong_id = c.ong_id
     LEFT JOIN necessidades n ON n.id = c.necessidade_id
     WHERE c.empresa_id = ? AND c.arquivado_empresa = ?
     ORDER BY ultima_em DESC`,
    [empresaId, arquivado]
  );
  return rows as any[];
}

export async function listarMensagensDaConversa(conversaId: number) {
  const [rows]: any = await pool.query(
    `SELECT id, conversa_id, remetente_tipo, remetente_id, conteudo, lida,
            DATE_FORMAT(criado_em, '%d/%m/%Y %H:%i') AS criado_em
     FROM mensagens
     WHERE conversa_id = ?
     ORDER BY criado_em ASC`,
    [conversaId]
  );
  return rows as any[];
}

export async function criarMensagem(params: {
  conversaId: number;
  remetenteTipo: "usuario" | "ong" | "empresa";
  remetenteId: number;
  conteudo: string;
}): Promise<number> {
  await ensureArquivadoColumns();
  const [result]: any = await pool.query(
    `INSERT INTO mensagens (conversa_id, remetente_tipo, remetente_id, conteudo) VALUES (?, ?, ?, ?)`,
    [params.conversaId, params.remetenteTipo, params.remetenteId, params.conteudo]
  );
  return result.insertId as number;
}

export async function marcarMensagensComoLidas(params: {
  conversaId: number;
  remetenteTipo: "usuario" | "ong" | "empresa";
}) {
  await pool.query(
    `UPDATE mensagens SET lida = 1 WHERE conversa_id = ? AND remetente_tipo = ?`,
    [params.conversaId, params.remetenteTipo]
  );
}

export async function arquivarConversa(
  conversaId: number,
  tipo: "ong" | "usuario" | "empresa",
  valor: 0 | 1
) {
  await ensureArquivadoColumns();
  const colMap = {
    ong: "arquivado_ong",
    usuario: "arquivado_usuario",
    empresa: "arquivado_empresa",
  } as const;
  const col = colMap[tipo];
  await pool.query(`UPDATE conversas SET \`${col}\` = ? WHERE id = ?`, [valor, conversaId]);
}

export async function contarNaoLidasUsuario(usuarioId: number): Promise<number> {
  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM mensagens m
     INNER JOIN conversas c ON c.id = m.conversa_id
     WHERE c.usuario_id = ? AND m.remetente_tipo = 'ong' AND m.lida = 0`,
    [usuarioId]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function contarNaoLidasEmpresa(empresaId: number): Promise<number> {
  await ensureEmpresaIdColumn();
  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM mensagens m
     INNER JOIN conversas c ON c.id = m.conversa_id
     WHERE c.empresa_id = ? AND m.remetente_tipo = 'ong' AND m.lida = 0`,
    [empresaId]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function contarNaoLidasOng(ongId: number): Promise<number> {
  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM mensagens m
     INNER JOIN conversas c ON c.id = m.conversa_id
     WHERE c.ong_id = ? AND m.remetente_tipo = 'usuario' AND m.lida = 0`,
    [ongId]
  );
  return Number(rows[0]?.total ?? 0);
}
