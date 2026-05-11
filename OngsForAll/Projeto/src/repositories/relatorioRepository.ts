import { pool } from "../config/ds";

export async function createRelatorio(params: {
  ongId: number;
  titulo: string;
  descricao: string;
  necessidadeId?: number | null;
  pessoasBeneficiadas?: number | null;
  dataPublicacao: string;
  status: "rascunho" | "publicado";
}): Promise<number> {
  const [result]: any = await pool.query(
    `INSERT INTO relatorios_impacto (ong_id, titulo, descricao, necessidade_id, pessoas_beneficiadas, data_publicacao, status, criado_em, atualizado_em)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
    [
      params.ongId,
      params.titulo,
      params.descricao,
      params.necessidadeId ?? null,
      params.pessoasBeneficiadas ?? null,
      params.dataPublicacao,
      params.status,
    ]
  );
  return result.insertId;
}

export async function addAnexo(relatorioId: number, arquivoUrl: string) {
  await pool.query(
    `INSERT INTO relatorio_anexos (relatorio_id, arquivo_url, criado_em) VALUES (?, ?, NOW())`,
    [relatorioId, arquivoUrl]
  );
}

export async function findByOngId(ongId: number) {
  const [rows]: any = await pool.query(
    `SELECT r.id, r.titulo, r.descricao, r.necessidade_id, r.pessoas_beneficiadas,
       DATE_FORMAT(r.data_publicacao, '%d/%m/%Y') AS data_publicacao,
       r.status, DATE_FORMAT(r.criado_em, '%d/%m/%Y') AS criado_em,
       n.titulo AS titulo_necessidade
     FROM relatorios_impacto r
     LEFT JOIN necessidades n ON n.id = r.necessidade_id
     WHERE r.ong_id = ?
     ORDER BY r.criado_em DESC`,
    [ongId]
  );
  return rows;
}

export async function findById(id: number) {
  const [[relatorio]]: any = await pool.query(
    `SELECT r.id, r.ong_id, r.titulo, r.descricao, r.necessidade_id, r.pessoas_beneficiadas,
       DATE_FORMAT(r.data_publicacao, '%d/%m/%Y') AS data_publicacao,
       r.status, DATE_FORMAT(r.criado_em, '%d/%m/%Y') AS criado_em,
       n.titulo AS titulo_necessidade,
       o.nome AS nome_ong
     FROM relatorios_impacto r
     LEFT JOIN necessidades n ON n.id = r.necessidade_id
     LEFT JOIN ongs o ON o.ong_id = r.ong_id
     WHERE r.id = ?
     LIMIT 1`,
    [id]
  );

  if (!relatorio) return null;

  const [anexos]: any = await pool.query(
    `SELECT id, arquivo_url, DATE_FORMAT(criado_em, '%d/%m/%Y') AS criado_em FROM relatorio_anexos WHERE relatorio_id = ? ORDER BY criado_em ASC`,
    [id]
  );

  return { ...relatorio, anexos };
}

export async function findPublicadosByOngId(ongId: number) {
  const [rows]: any = await pool.query(
    `SELECT r.id, r.titulo, r.descricao, r.pessoas_beneficiadas,
       DATE_FORMAT(r.data_publicacao, '%d/%m/%Y') AS data_publicacao,
       n.titulo AS titulo_necessidade
     FROM relatorios_impacto r
     LEFT JOIN necessidades n ON n.id = r.necessidade_id
     WHERE r.ong_id = ? AND r.status = 'publicado'
     ORDER BY r.data_publicacao DESC`,
    [ongId]
  );
  return rows;
}

export async function buscarNecessidadesDaOng(ongId: number) {
  const [rows]: any = await pool.query(
    `SELECT id, titulo FROM necessidades WHERE ong_id = ? AND status != 'cancelada' ORDER BY criado_em DESC`,
    [ongId]
  );
  return rows;
}
