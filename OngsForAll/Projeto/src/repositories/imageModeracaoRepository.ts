import { pool } from "../config/ds";

export type StatusModeracao = "pendente" | "aprovado" | "rejeitado" | "em_revisao" | "erro";
export type TipoReferencia =
  | "logo_ong"
  | "logo_empresa"
  | "marketplace_item"
  | "evidencia"
  | "documento_ong";

let tableEnsured = false;

async function ensureModeracaoTable() {
  if (tableEnsured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS moderacao_imagens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tipo_referencia VARCHAR(50) NOT NULL,
      referencia_id INT,
      nome_arquivo VARCHAR(255) NOT NULL,
      temp_path VARCHAR(500),
      public_url VARCHAR(500),
      status VARCHAR(20) NOT NULL DEFAULT 'pendente',
      categorias_flagradas JSON,
      score_maximo DECIMAL(5,4),
      erro_msg TEXT,
      criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
  tableEnsured = true;
}

export async function criar(params: {
  tipo: TipoReferencia;
  referenciaId?: number;
  nomeArquivo: string;
  tempPath: string;
}): Promise<number> {
  await ensureModeracaoTable();
  const [result] = await pool.query(
    `INSERT INTO moderacao_imagens (tipo_referencia, referencia_id, nome_arquivo, temp_path, status)
     VALUES (?, ?, ?, ?, 'pendente')`,
    [params.tipo, params.referenciaId ?? null, params.nomeArquivo, params.tempPath]
  ) as any[];
  return (result as any).insertId;
}

export async function atualizarAprovado(id: number, publicUrl: string) {
  await pool.query(
    `UPDATE moderacao_imagens SET status = 'aprovado', public_url = ?, temp_path = NULL, atualizado_em = NOW() WHERE id = ?`,
    [publicUrl, id]
  );
}

export async function atualizarRejeitado(id: number, categorias: string[]) {
  await pool.query(
    `UPDATE moderacao_imagens SET status = 'rejeitado', categorias_flagradas = ?, atualizado_em = NOW() WHERE id = ?`,
    [JSON.stringify(categorias), id]
  );
}

export async function atualizarRevisao(id: number, scoreMaximo: number) {
  await pool.query(
    `UPDATE moderacao_imagens SET status = 'em_revisao', score_maximo = ?, atualizado_em = NOW() WHERE id = ?`,
    [scoreMaximo, id]
  );
}

export async function atualizarErro(id: number, msg: string) {
  await pool.query(
    `UPDATE moderacao_imagens SET status = 'erro', erro_msg = ?, atualizado_em = NOW() WHERE id = ?`,
    [msg, id]
  );
}
