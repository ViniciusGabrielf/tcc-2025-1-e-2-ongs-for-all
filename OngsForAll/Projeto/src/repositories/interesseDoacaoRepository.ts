import { pool } from "../config/ds";

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
      n.quantidade_recebida,
      n.status,
      n.tipo_necessidade,
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

export async function createInteresse(params: {
    usuarioId: number;
    ongId: number;
    necessidadeId: number;
    quantidade: number | null;
    observacao: string | null;
    dataPrevista: string | null;
}) {
    await pool.query(
        `
    INSERT INTO interesses_doacao
      (usuario_id, ong_id, necessidade_id, quantidade, observacao, status, criado_em, data_prevista)
    VALUES
      (?, ?, ?, ?, ?, 'pendente', NOW(), ?)
    `,
        [
            params.usuarioId,
            params.ongId,
            params.necessidadeId,
            params.quantidade,
            params.observacao,
            params.dataPrevista,
        ]
    );
}

export async function listarInteressesPorOng(
    ongId: number,
    status?: string
) {
    let query = `
    SELECT
      i.id,
      i.usuario_id,
      i.ong_id,
      i.necessidade_id,
      i.quantidade,
      i.observacao,
      i.status,
      DATE_FORMAT(i.criado_em, '%d/%m/%Y %H:%i') AS criado_em,
      DATE_FORMAT(i.data_prevista, '%d/%m/%Y') AS data_prevista,
      u.nome AS nome_usuario,
      u.email AS email_usuario,
      n.titulo AS titulo_necessidade,
      n.quantidade AS meta,
      n.quantidade_recebida,
      n.tipo_necessidade
    FROM interesses_doacao i
    INNER JOIN usuarios u ON u.id = i.usuario_id
    INNER JOIN necessidades n ON n.id = i.necessidade_id
    WHERE i.ong_id = ?
  `;

    const params: any[] = [ongId];

    if (status && status !== "todos") {
        query += ` AND i.status = ? `;
        params.push(status);
    }

    query += ` ORDER BY i.criado_em DESC `;

    const [rows]: any = await pool.query(query, params);
    return rows;
}

export async function buscarInteressePorId(id: number) {
    const [rows]: any = await pool.query(
        `
    SELECT
      i.id,
      i.usuario_id,
      i.ong_id,
      i.necessidade_id,
      i.quantidade,
      i.observacao,
      i.status,
      i.criado_em,
      i.data_prevista,
      n.titulo AS titulo_necessidade,
      n.quantidade AS meta,
      n.quantidade_recebida,
      n.status AS necessidade_status,
      o.nome AS nome_ong,
      u.nome AS nome_usuario
    FROM interesses_doacao i
    INNER JOIN necessidades n ON n.id = i.necessidade_id
    INNER JOIN ongs o ON o.ong_id = i.ong_id
    INNER JOIN usuarios u ON u.id = i.usuario_id
    WHERE i.id = ?
    LIMIT 1
    `,
        [id]
    );

    return rows?.[0] ?? null;
}

export async function atualizarStatusInteresse(id: number, status: string) {
    await pool.query(
        `
    UPDATE interesses_doacao
    SET status = ?
    WHERE id = ?
    `,
        [status, id]
    );
}

export async function atualizarQuantidadeRecebidaNecessidade(params: {
    necessidadeId: number;
    quantidade: number;
}) {
    await pool.query(
        `
    UPDATE necessidades
    SET
      quantidade_recebida = quantidade_recebida + ?,
      atualizado_em = NOW()
    WHERE id = ?
    `,
        [params.quantidade, params.necessidadeId]
    );
}

export async function concluirNecessidadeSeMetaAtingida(necessidadeId: number): Promise<boolean> {
    const [result]: any = await pool.query(
        `
    UPDATE necessidades
    SET
      status = 'concluida',
      atualizado_em = NOW()
    WHERE id = ?
      AND quantidade_recebida >= quantidade
      AND status != 'concluida'
    `,
        [necessidadeId]
    );

    return result.affectedRows > 0;
}