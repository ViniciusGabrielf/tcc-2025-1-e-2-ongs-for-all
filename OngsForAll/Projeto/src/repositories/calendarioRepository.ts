import { pool } from "../config/ds";

export interface EventoBruto {
  id: number;
  data: string;
  titulo: string;
  tipo: string;
  link: string;
  destaque: number;
  entidade_nome: string | null;
}

export async function buscarEventosUsuario(usuarioId: number, mes: string): Promise<EventoBruto[]> {
  const [rows]: any = await pool.query(
    `SELECT i.id                                                  AS id,
            DATE_FORMAT(i.data_prevista, '%Y-%m-%d')              AS data,
            CASE WHEN i.status = 'recebido'
              THEN CONCAT('Entrega recebida: ', n.titulo)
              ELSE CONCAT('Entrega prevista: ', n.titulo)
            END                                                   AS titulo,
            CASE WHEN i.status = 'recebido'
              THEN 'entrega_recebida'
              ELSE 'entrega_aceita'
            END                                                   AS tipo,
            CONCAT('/necessidades/', n.id)                        AS link,
            CASE WHEN i.status = 'recebido' THEN 0 ELSE 1 END    AS destaque,
            o.nome                                                AS entidade_nome
       FROM interesses_doacao i
       INNER JOIN necessidades n ON n.id = i.necessidade_id
       INNER JOIN ongs o         ON o.ong_id = n.ong_id
      WHERE i.usuario_id = ?
        AND i.status IN ('aceito', 'recebido')
        AND i.data_prevista IS NOT NULL
        AND DATE_FORMAT(i.data_prevista, '%Y-%m') = ?

     UNION ALL

     SELECT i.id                                            AS id,
            DATE_FORMAT(n.data_inicio, '%Y-%m-%d')          AS data,
            CONCAT('Início voluntariado: ', n.titulo)       AS titulo,
            'voluntariado'                                   AS tipo,
            CONCAT('/necessidades/', n.id)                  AS link,
            0                                               AS destaque,
            o.nome                                          AS entidade_nome
       FROM interesses_doacao i
       INNER JOIN necessidades n ON n.id = i.necessidade_id
       INNER JOIN ongs o         ON o.ong_id = n.ong_id
      WHERE i.usuario_id = ?
        AND n.tipo_necessidade = 'voluntariado'
        AND n.data_inicio IS NOT NULL
        AND DATE_FORMAT(n.data_inicio, '%Y-%m') = ?

     UNION ALL

     SELECT i.id                                            AS id,
            DATE_FORMAT(n.data_fim, '%Y-%m-%d')             AS data,
            CONCAT('Fim voluntariado: ', n.titulo)          AS titulo,
            'voluntariado_fim'                               AS tipo,
            CONCAT('/necessidades/', n.id)                  AS link,
            0                                               AS destaque,
            o.nome                                          AS entidade_nome
       FROM interesses_doacao i
       INNER JOIN necessidades n ON n.id = i.necessidade_id
       INNER JOIN ongs o         ON o.ong_id = n.ong_id
      WHERE i.usuario_id = ?
        AND n.tipo_necessidade = 'voluntariado'
        AND n.data_fim IS NOT NULL
        AND DATE_FORMAT(n.data_fim, '%Y-%m') = ?

     UNION ALL

     SELECT i.id                                            AS id,
            DATE_FORMAT(i.criado_em, '%Y-%m-%d')            AS data,
            CONCAT('Interesse: ', n.titulo)                 AS titulo,
            'interesse'                                      AS tipo,
            CONCAT('/necessidades/', n.id)                  AS link,
            0                                               AS destaque,
            o.nome                                          AS entidade_nome
       FROM interesses_doacao i
       INNER JOIN necessidades n ON n.id = i.necessidade_id
       INNER JOIN ongs o         ON o.ong_id = n.ong_id
      WHERE i.usuario_id = ?
        AND DATE_FORMAT(i.criado_em, '%Y-%m') = ?`,
    [usuarioId, mes, usuarioId, mes, usuarioId, mes, usuarioId, mes, usuarioId, mes]
  );
  return rows as EventoBruto[];
}

export async function buscarEventosOng(ongId: number, mes: string): Promise<EventoBruto[]> {
  const [rows]: any = await pool.query(
    `SELECT n.id                                            AS id,
            DATE_FORMAT(n.data_inicio, '%Y-%m-%d')          AS data,
            CONCAT('Início: ', n.titulo)                    AS titulo,
            'necessidade_inicio'                             AS tipo,
            CONCAT('/necessidades/', n.id)                  AS link,
            0                                               AS destaque,
            NULL                                            AS entidade_nome
       FROM necessidades n
      WHERE n.ong_id = ?
        AND n.data_inicio IS NOT NULL
        AND DATE_FORMAT(n.data_inicio, '%Y-%m') = ?

     UNION ALL

     SELECT n.id                                            AS id,
            DATE_FORMAT(n.data_fim, '%Y-%m-%d')             AS data,
            CONCAT('Fim: ', n.titulo)                       AS titulo,
            'necessidade_fim'                                AS tipo,
            CONCAT('/necessidades/', n.id)                  AS link,
            0                                               AS destaque,
            NULL                                            AS entidade_nome
       FROM necessidades n
      WHERE n.ong_id = ?
        AND n.data_fim IS NOT NULL
        AND DATE_FORMAT(n.data_fim, '%Y-%m') = ?

     UNION ALL

     SELECT i.id                                                   AS id,
            DATE_FORMAT(i.data_prevista, '%Y-%m-%d')              AS data,
            CASE WHEN i.status = 'recebido'
              THEN CONCAT('Recebido de ', u.nome, ': ', n.titulo)
              ELSE CONCAT('Entrega de ', u.nome, ': ', n.titulo)
            END                                                   AS titulo,
            CASE WHEN i.status = 'recebido'
              THEN 'entrega_recebida'
              ELSE 'entrega_aceita'
            END                                                   AS tipo,
            '/ong/interesses'                                     AS link,
            CASE WHEN i.status = 'recebido' THEN 0 ELSE 1 END    AS destaque,
            u.nome                                                AS entidade_nome
       FROM interesses_doacao i
       INNER JOIN usuarios u ON u.id = i.usuario_id
       INNER JOIN necessidades n ON n.id = i.necessidade_id
      WHERE i.ong_id = ?
        AND i.status IN ('aceito', 'recebido')
        AND i.data_prevista IS NOT NULL
        AND DATE_FORMAT(i.data_prevista, '%Y-%m') = ?

     UNION ALL

     SELECT r.id                                             AS id,
            DATE_FORMAT(r.data_publicacao, '%Y-%m-%d')       AS data,
            CONCAT('Relatório: ', r.titulo)                  AS titulo,
            'relatorio'                                       AS tipo,
            CONCAT('/relatorios/', r.id)                     AS link,
            0                                                AS destaque,
            NULL                                             AS entidade_nome
       FROM relatorios_impacto r
      WHERE r.ong_id = ?
        AND r.data_publicacao IS NOT NULL
        AND DATE_FORMAT(r.data_publicacao, '%Y-%m') = ?

     UNION ALL

     SELECT e.id                                                         AS id,
            DATE_FORMAT(e.criado_em, '%Y-%m-%d')                        AS data,
            CONCAT('Evidência: ', COALESCE(e.legenda, n.titulo))        AS titulo,
            'evidencia'                                                   AS tipo,
            '/ong/interesses'                                            AS link,
            0                                                            AS destaque,
            NULL                                                         AS entidade_nome
       FROM evidencias e
       INNER JOIN interesses_doacao i ON i.id = e.interesse_id
       INNER JOIN necessidades n      ON n.id = i.necessidade_id
      WHERE e.ong_id = ?
        AND DATE_FORMAT(e.criado_em, '%Y-%m') = ?`,
    [ongId, mes, ongId, mes, ongId, mes, ongId, mes, ongId, mes]
  );
  return rows as EventoBruto[];
}

export async function buscarEventosEmpresa(empresaId: number, mes: string): Promise<EventoBruto[]> {
  const [rows]: any = await pool.query(
    `SELECT m.id                                            AS id,
            DATE_FORMAT(m.criado_em, '%Y-%m-%d')            AS data,
            CONCAT('Item publicado: ', m.titulo)             AS titulo,
            'marketplace'                                    AS tipo,
            '/empresa/marketplace'                          AS link,
            0                                               AS destaque,
            NULL                                            AS entidade_nome
       FROM marketplace_itens m
      WHERE m.empresa_id = ?
        AND DATE_FORMAT(m.criado_em, '%Y-%m') = ?`,
    [empresaId, mes]
  );
  return rows as EventoBruto[];
}

export async function buscarDetalheEvento(
  tipo: string,
  id: number,
  userTipo: string,
  userId: number
): Promise<Record<string, any> | null> {
  let query = '';
  let params: any[] = [];

  if (userTipo === 'usuario' && ['entrega_aceita', 'entrega_recebida', 'interesse', 'voluntariado', 'voluntariado_fim'].includes(tipo)) {
    query = `
      SELECT i.id, i.status, i.quantidade, i.quantidade_confirmada, i.observacao,
             DATE_FORMAT(i.data_prevista, '%d/%m/%Y') AS data_prevista,
             DATE_FORMAT(i.criado_em, '%d/%m/%Y')     AS criado_em_fmt,
             n.titulo  AS necessidade_titulo,
             n.tipo_necessidade, n.categoria,
             DATE_FORMAT(n.data_inicio, '%d/%m/%Y')   AS data_inicio,
             DATE_FORMAT(n.data_fim, '%d/%m/%Y')      AS data_fim,
             n.local_atividade, n.turno,
             o.nome    AS ong_nome,
             n.id      AS necessidade_id
        FROM interesses_doacao i
        INNER JOIN necessidades n ON n.id = i.necessidade_id
        INNER JOIN ongs o         ON o.ong_id = n.ong_id
       WHERE i.id = ? AND i.usuario_id = ?
    `;
    params = [id, userId];
  } else if (userTipo === 'ong' && (tipo === 'entrega_aceita' || tipo === 'entrega_recebida')) {
    query = `
      SELECT i.id, i.status, i.quantidade, i.quantidade_confirmada, i.observacao,
             DATE_FORMAT(i.data_prevista, '%d/%m/%Y') AS data_prevista,
             n.titulo  AS necessidade_titulo,
             n.tipo_necessidade, n.categoria,
             u.nome    AS doador_nome,
             n.id      AS necessidade_id
        FROM interesses_doacao i
        INNER JOIN necessidades n ON n.id = i.necessidade_id
        INNER JOIN usuarios u     ON u.id = i.usuario_id
       WHERE i.id = ? AND i.ong_id = ?
    `;
    params = [id, userId];
  } else if (userTipo === 'ong' && ['necessidade_inicio', 'necessidade_fim'].includes(tipo)) {
    query = `
      SELECT n.id, n.titulo, n.descricao, n.categoria,
             n.tipo_necessidade, n.status,
             n.quantidade, n.quantidade_recebida,
             DATE_FORMAT(n.data_inicio, '%d/%m/%Y') AS data_inicio,
             DATE_FORMAT(n.data_fim, '%d/%m/%Y')    AS data_fim,
             n.local_atividade, n.turno
        FROM necessidades n
       WHERE n.id = ? AND n.ong_id = ?
    `;
    params = [id, userId];
  } else if (userTipo === 'ong' && tipo === 'relatorio') {
    query = `
      SELECT r.id, r.titulo, r.descricao, r.status, r.pessoas_beneficiadas,
             DATE_FORMAT(r.data_publicacao, '%d/%m/%Y') AS data_publicacao
        FROM relatorios_impacto r
       WHERE r.id = ? AND r.ong_id = ?
    `;
    params = [id, userId];
  } else if (userTipo === 'ong' && tipo === 'evidencia') {
    query = `
      SELECT e.id, e.legenda,
             DATE_FORMAT(e.criado_em, '%d/%m/%Y') AS criado_em_fmt,
             n.titulo AS necessidade_titulo,
             n.id     AS necessidade_id
        FROM evidencias e
        INNER JOIN interesses_doacao i ON i.id = e.interesse_id
        INNER JOIN necessidades n      ON n.id = i.necessidade_id
       WHERE e.id = ? AND e.ong_id = ?
    `;
    params = [id, userId];
  } else if (userTipo === 'empresa' && tipo === 'marketplace') {
    query = `
      SELECT m.id, m.titulo, m.descricao, m.tipo, m.status_publicacao,
             m.modo_preco, m.preco,
             DATE_FORMAT(m.criado_em, '%d/%m/%Y') AS criado_em_fmt
        FROM marketplace_itens m
       WHERE m.id = ? AND m.empresa_id = ?
    `;
    params = [id, userId];
  }

  if (!query) return null;

  const [rows]: any = await pool.query(query, params);
  return (rows as any[])[0] ?? null;
}
