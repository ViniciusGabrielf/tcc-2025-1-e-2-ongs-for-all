import { pool } from "../config/ds";

export async function buscarDadosTransparencia(ongId: number) {
  const [ongRows]: any = await pool.query(
    `SELECT ong_id, nome, area_atuacao, telefone, email, logo
     FROM ongs WHERE ong_id = ? AND status_aprovacao = 'aprovada' LIMIT 1`,
    [ongId]
  );
  if (!ongRows.length) return null;
  const ong = ongRows[0];

  // Estatísticas de necessidades
  const [statsNec]: any = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(CASE WHEN status = 'aberta' THEN 1 ELSE 0 END) AS abertas,
       SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) AS concluidas
     FROM necessidades WHERE ong_id = ?`,
    [ongId]
  );

  // Total de apoios únicos recebidos
  const [statsInteresses]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM interesses_doacao WHERE ong_id = ? AND status IN ('aceito','recebido')`,
    [ongId]
  );

  // Total de pessoas beneficiadas (soma dos relatórios publicados)
  const [statsPessoas]: any = await pool.query(
    `SELECT COALESCE(SUM(pessoas_beneficiadas), 0) AS total
     FROM relatorios_impacto WHERE ong_id = ? AND status = 'publicado'`,
    [ongId]
  );

  // Relatórios publicados (últimos 5)
  const [relatorios]: any = await pool.query(
    `SELECT id, titulo, descricao, pessoas_beneficiadas,
            DATE_FORMAT(data_publicacao, '%d/%m/%Y') AS data_publicacao,
            (SELECT arquivo_url FROM relatorio_anexos WHERE relatorio_id = r.id LIMIT 1) AS imagem_url
     FROM relatorios_impacto r
     WHERE ong_id = ? AND status = 'publicado'
     ORDER BY data_publicacao DESC
     LIMIT 5`,
    [ongId]
  );

  // Necessidades abertas (últimas 6)
  const [necessidades]: any = await pool.query(
    `SELECT id, titulo, tipo_necessidade, categoria, quantidade, quantidade_recebida,
            DATE_FORMAT(criado_em, '%d/%m/%Y') AS criado_em
     FROM necessidades
     WHERE ong_id = ? AND status = 'aberta'
     ORDER BY criado_em DESC
     LIMIT 6`,
    [ongId]
  );

  // Atividades recentes (interesses recebidos, últimas 5)
  const [atividades]: any = await pool.query(
    `SELECT
       i.id,
       n.titulo AS titulo_necessidade,
       n.tipo_necessidade,
       DATE_FORMAT(i.criado_em, '%d/%m/%Y') AS criado_em
     FROM interesses_doacao i
     INNER JOIN necessidades n ON n.id = i.necessidade_id
     WHERE i.ong_id = ? AND i.status IN ('aceito','recebido')
     ORDER BY i.criado_em DESC
     LIMIT 5`,
    [ongId]
  );

  return {
    ong,
    stats: {
      totalNecessidades: Number(statsNec[0]?.total ?? 0),
      necessidadesAbertas: Number(statsNec[0]?.abertas ?? 0),
      necessidadesConcluidas: Number(statsNec[0]?.concluidas ?? 0),
      totalApoios: Number(statsInteresses[0]?.total ?? 0),
      pessoasBeneficiadas: Number(statsPessoas[0]?.total ?? 0),
    },
    relatorios: relatorios as any[],
    necessidades: necessidades as any[],
    atividades: atividades as any[],
  };
}
