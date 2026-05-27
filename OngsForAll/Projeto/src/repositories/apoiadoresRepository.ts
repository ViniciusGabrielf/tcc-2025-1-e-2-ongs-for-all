import { pool } from "../config/ds";

export type PlanApoiador = "basico" | "local" | "destaque" | "institucional";
export type StatusApoiador = "ativo" | "pausado" | "encerrado";

export interface Apoiador {
  id: number;
  nome: string;
  logo_url: string | null;
  website_url: string | null;
  descricao: string | null;
  plano: PlanApoiador;
  valor_mensal: number;
  prioridade: number;
  status: StatusApoiador;
  data_inicio: string;
  data_fim: string | null;
  criado_em: string;
}

const DATE_COLS = `
  id, nome, logo_url, website_url, descricao, plano, valor_mensal, prioridade, status,
  DATE_FORMAT(data_inicio, '%Y-%m-%d') AS data_inicio,
  DATE_FORMAT(data_fim,    '%Y-%m-%d') AS data_fim,
  DATE_FORMAT(criado_em,   '%d/%m/%Y') AS criado_em
`;

export async function criar(data: {
  nome: string;
  logo_url?: string | null;
  website_url?: string | null;
  descricao?: string | null;
  plano: PlanApoiador;
  valor_mensal: number;
  prioridade: number;
  status: StatusApoiador;
  data_inicio: string;
  data_fim?: string | null;
}): Promise<number> {
  const [result]: any = await pool.query(
    `INSERT INTO apoiadores_institucionais
     (nome, logo_url, website_url, descricao, plano, valor_mensal, prioridade, status, data_inicio, data_fim)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.nome, data.logo_url ?? null, data.website_url ?? null, data.descricao ?? null,
     data.plano, data.valor_mensal, data.prioridade, data.status, data.data_inicio, data.data_fim ?? null]
  );
  return result.insertId;
}

export async function atualizar(id: number, data: {
  nome: string;
  logo_url?: string | null;
  website_url?: string | null;
  descricao?: string | null;
  plano: PlanApoiador;
  valor_mensal: number;
  prioridade: number;
  data_inicio: string;
  data_fim?: string | null;
}): Promise<void> {
  await pool.query(
    `UPDATE apoiadores_institucionais
     SET nome=?, logo_url=?, website_url=?, descricao=?, plano=?, valor_mensal=?, prioridade=?, data_inicio=?, data_fim=?
     WHERE id=?`,
    [data.nome, data.logo_url ?? null, data.website_url ?? null, data.descricao ?? null,
     data.plano, data.valor_mensal, data.prioridade, data.data_inicio, data.data_fim ?? null, id]
  );
}

export async function atualizarStatus(id: number, status: StatusApoiador): Promise<void> {
  await pool.query(`UPDATE apoiadores_institucionais SET status=? WHERE id=?`, [status, id]);
}

export async function buscarPorId(id: number): Promise<Apoiador | null> {
  const [rows]: any = await pool.query(
    `SELECT ${DATE_COLS} FROM apoiadores_institucionais WHERE id=?`, [id]
  );
  return rows?.[0] ?? null;
}

export async function listarTodos(filtros?: { status?: string; plano?: string }): Promise<Apoiador[]> {
  let sql = `SELECT ${DATE_COLS} FROM apoiadores_institucionais WHERE 1=1`;
  const params: any[] = [];
  if (filtros?.status && filtros.status !== "todos") {
    sql += ` AND status = ?`;
    params.push(filtros.status);
  }
  if (filtros?.plano && filtros.plano !== "todos") {
    sql += ` AND plano = ?`;
    params.push(filtros.plano);
  }
  sql += ` ORDER BY prioridade DESC, criado_em DESC`;
  const [rows]: any = await pool.query(sql, params);
  return rows ?? [];
}

export async function listarAtivosParaRodape(): Promise<Pick<Apoiador, "id" | "nome" | "logo_url" | "website_url" | "descricao" | "plano" | "prioridade">[]> {
  const [rows]: any = await pool.query(
    `SELECT id, nome, logo_url, website_url, descricao, plano, prioridade
     FROM apoiadores_institucionais
     WHERE status = 'ativo'
       AND data_inicio <= CURDATE()
       AND (data_fim IS NULL OR data_fim >= CURDATE())
     ORDER BY prioridade DESC, data_inicio ASC
     LIMIT 12`
  );
  return rows ?? [];
}

export async function listarAtivosPublico(): Promise<Pick<Apoiador, "id" | "nome" | "logo_url" | "website_url" | "descricao">[]> {
  const [rows]: any = await pool.query(
    `SELECT id, nome, logo_url, website_url, descricao
     FROM apoiadores_institucionais
     WHERE status = 'ativo'
       AND data_inicio <= CURDATE()
       AND (data_fim IS NULL OR data_fim >= CURDATE())
     ORDER BY nome ASC`
  );
  return rows ?? [];
}

export async function contarPorStatus(): Promise<Record<string, number>> {
  const [rows]: any = await pool.query(
    `SELECT status, COUNT(*) AS total FROM apoiadores_institucionais GROUP BY status`
  );
  const counts: Record<string, number> = { ativo: 0, pausado: 0, encerrado: 0 };
  for (const row of (rows ?? [])) counts[row.status] = Number(row.total);
  counts.todos = counts.ativo + counts.pausado + counts.encerrado;
  return counts;
}
