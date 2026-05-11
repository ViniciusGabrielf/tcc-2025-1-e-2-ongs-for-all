import { pool } from "../config/ds";

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

  if (existing.length > 0) {
    return existing[0].id as number;
  }

  const [result]: any = await pool.query(
    `INSERT INTO conversas (usuario_id, ong_id, necessidade_id) VALUES (?, ?, ?)`,
    [params.usuarioId, params.ongId, necessidadeId]
  );

  return result.insertId as number;
}

export async function buscarConversaPorId(id: number) {
  const [rows]: any = await pool.query(
    `SELECT c.id, c.usuario_id, c.ong_id, c.necessidade_id,
            u.nome AS nome_usuario,
            o.nome AS nome_ong,
            o.logo AS logo_ong,
            n.titulo AS titulo_necessidade
     FROM conversas c
     INNER JOIN usuarios u ON u.id = c.usuario_id
     INNER JOIN ongs o ON o.ong_id = c.ong_id
     LEFT JOIN necessidades n ON n.id = c.necessidade_id
     WHERE c.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function listarConversasDoUsuario(usuarioId: number) {
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
     WHERE c.usuario_id = ?
     ORDER BY ultima_em DESC`,
    [usuarioId]
  );
  return rows as any[];
}

export async function listarConversasDaOng(ongId: number) {
  const [rows]: any = await pool.query(
    `SELECT c.id, c.usuario_id, c.ong_id, c.necessidade_id,
            u.nome AS nome_usuario,
            n.titulo AS titulo_necessidade,
            (SELECT m.conteudo FROM mensagens m WHERE m.conversa_id = c.id ORDER BY m.criado_em DESC LIMIT 1) AS ultima_mensagem,
            (SELECT DATE_FORMAT(m.criado_em, '%d/%m/%Y %H:%i') FROM mensagens m WHERE m.conversa_id = c.id ORDER BY m.criado_em DESC LIMIT 1) AS ultima_em,
            (SELECT COUNT(*) FROM mensagens m WHERE m.conversa_id = c.id AND m.lida = 0 AND m.remetente_tipo = 'usuario') AS nao_lidas
     FROM conversas c
     INNER JOIN usuarios u ON u.id = c.usuario_id
     LEFT JOIN necessidades n ON n.id = c.necessidade_id
     WHERE c.ong_id = ?
     ORDER BY ultima_em DESC`,
    [ongId]
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
  remetenteTipo: "usuario" | "ong";
  remetenteId: number;
  conteudo: string;
}): Promise<number> {
  const [result]: any = await pool.query(
    `INSERT INTO mensagens (conversa_id, remetente_tipo, remetente_id, conteudo) VALUES (?, ?, ?, ?)`,
    [params.conversaId, params.remetenteTipo, params.remetenteId, params.conteudo]
  );
  return result.insertId as number;
}

export async function marcarMensagensComoLidas(params: {
  conversaId: number;
  remetenteTipo: "usuario" | "ong";
}) {
  await pool.query(
    `UPDATE mensagens SET lida = 1 WHERE conversa_id = ? AND remetente_tipo = ?`,
    [params.conversaId, params.remetenteTipo]
  );
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

export async function contarNaoLidasOng(ongId: number): Promise<number> {
  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM mensagens m
     INNER JOIN conversas c ON c.id = m.conversa_id
     WHERE c.ong_id = ? AND m.remetente_tipo = 'usuario' AND m.lida = 0`,
    [ongId]
  );
  return Number(rows[0]?.total ?? 0);
}
