import { pool } from "../config/ds";

export async function getStatusAprovacao(ongId: number) {
  const [rows]: any = await pool.query(
    "SELECT status_aprovacao, observacao_admin FROM ongs WHERE ong_id = ? LIMIT 1",
    [ongId]
  );
  return rows?.[0] ?? null;
}

export async function uploadDocumento(params: {
  ongId: number;
  nomeArquivo: string;
  arquivoUrl: string;
  tipo?: string;
}) {
  await pool.query(
    `INSERT INTO ong_documentos (ong_id, nome_arquivo, arquivo_url, tipo, criado_em) VALUES (?, ?, ?, ?, NOW())`,
    [params.ongId, params.nomeArquivo, params.arquivoUrl, params.tipo ?? "documento"]
  );
}

export async function getDocumentos(ongId: number) {
  const [rows]: any = await pool.query(
    `SELECT id, nome_arquivo, arquivo_url, tipo, DATE_FORMAT(criado_em, '%d/%m/%Y') AS criado_em
     FROM ong_documentos WHERE ong_id = ? ORDER BY criado_em DESC`,
    [ongId]
  );
  return rows;
}

// Admin queries
export async function listarOngsParaAdmin() {
  const [rows]: any = await pool.query(
    `SELECT ong_id AS id, nome, email, cnpj, area_atuacao, telefone, status_aprovacao, observacao_admin,
       DATE_FORMAT(NOW(), '%d/%m/%Y') AS criado_em
     FROM ongs ORDER BY
       FIELD(status_aprovacao, 'pendente', 'aprovada', 'rejeitada'), nome ASC`
  );
  return rows.map((o: any) => ({
    ...o,
    isPendente: o.status_aprovacao === "pendente",
    isAprovada: o.status_aprovacao === "aprovada",
    isRejeitada: o.status_aprovacao === "rejeitada",
  }));
}

export async function atualizarStatusOng(ongId: number, status: "aprovada" | "rejeitada", observacao?: string) {
  await pool.query(
    `UPDATE ongs SET status_aprovacao = ?, observacao_admin = ? WHERE ong_id = ?`,
    [status, observacao ?? null, ongId]
  );
}
