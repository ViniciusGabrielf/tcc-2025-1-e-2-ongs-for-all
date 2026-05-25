import { pool } from "../config/ds";

export interface ResumoAtividades {
  pendentes: number;
  em_andamento: number;
  concluidas: number;
  canceladas: number;
}

export interface AtividadeUsuario {
  id: number;
  status: string;
  quantidade: number | null;
  data_prevista: string | null;
  criado_em: string;
  necessidade_id: number;
  titulo: string;
  tipo_necessidade: string;
  categoria: string | null;
  data_inicio: string | null;
  data_fim: string | null;
  local_atividade: string | null;
  turno: string | null;
  ong_nome: string;
}

export async function buscarResumoAtividades(userId: number): Promise<ResumoAtividades> {
  const [rows]: any = await pool.query(
    `SELECT
       COALESCE(SUM(status = 'pendente'),  0) AS pendentes,
       COALESCE(SUM(status = 'aceito'),    0) AS em_andamento,
       COALESCE(SUM(status = 'recebido'),  0) AS concluidas,
       COALESCE(SUM(status = 'cancelado'), 0) AS canceladas
     FROM interesses_doacao
     WHERE usuario_id = ?`,
    [userId]
  );
  const r = rows[0] ?? {};
  return {
    pendentes:    Number(r.pendentes    ?? 0),
    em_andamento: Number(r.em_andamento ?? 0),
    concluidas:   Number(r.concluidas   ?? 0),
    canceladas:   Number(r.canceladas   ?? 0),
  };
}

export async function buscarAtividadesUsuario(
  userId: number,
  status?: string,
  busca?: string
): Promise<AtividadeUsuario[]> {
  const params: any[] = [userId];
  let filter = "";
  if (status) { filter += ` AND i.status = ?`; params.push(status); }
  if (busca?.trim()) {
    const b = busca.trim();
    const bNum = Number(b);
    if (!Number.isNaN(bNum) && /^\d+$/.test(b)) {
      filter += ` AND (i.id = ? OR n.titulo LIKE ? OR o.nome LIKE ?)`;
      params.push(bNum, `%${b}%`, `%${b}%`);
    } else {
      filter += ` AND (n.titulo LIKE ? OR o.nome LIKE ?)`;
      params.push(`%${b}%`, `%${b}%`);
    }
  }

  const [rows]: any = await pool.query(
    `SELECT
       i.id,
       i.status,
       i.quantidade,
       i.observacao,
       DATE_FORMAT(i.data_prevista, '%d/%m/%Y') AS data_prevista,
       DATE_FORMAT(i.criado_em,     '%d/%m/%Y') AS criado_em,
       n.id                                     AS necessidade_id,
       n.titulo,
       n.tipo_necessidade,
       n.categoria,
       DATE_FORMAT(n.data_inicio, '%d/%m/%Y')   AS data_inicio,
       DATE_FORMAT(n.data_fim,    '%d/%m/%Y')   AS data_fim,
       n.local_atividade,
       n.turno,
       o.nome                                   AS subtitulo
     FROM interesses_doacao i
     INNER JOIN necessidades n ON n.id = i.necessidade_id
     INNER JOIN ongs o         ON o.ong_id = n.ong_id
     WHERE i.usuario_id = ?${filter}
     ORDER BY i.criado_em DESC
     LIMIT 100`,
    params
  );
  return rows as AtividadeUsuario[];
}

export async function buscarResumoAtividadesOng(ongId: number): Promise<ResumoAtividades> {
  const [rows]: any = await pool.query(
    `SELECT
       COALESCE(SUM(status = 'pendente'),  0) AS pendentes,
       COALESCE(SUM(status = 'aceito'),    0) AS em_andamento,
       COALESCE(SUM(status = 'recebido'),  0) AS concluidas,
       COALESCE(SUM(status = 'cancelado'), 0) AS canceladas
     FROM interesses_doacao
     WHERE ong_id = ?`,
    [ongId]
  );
  const r = rows[0] ?? {};
  return {
    pendentes:    Number(r.pendentes    ?? 0),
    em_andamento: Number(r.em_andamento ?? 0),
    concluidas:   Number(r.concluidas   ?? 0),
    canceladas:   Number(r.canceladas   ?? 0),
  };
}

export async function buscarAtividadesOng(
  ongId: number,
  status?: string
): Promise<AtividadeUsuario[]> {
  const params: any[] = [ongId];
  const statusFilter = status ? ` AND i.status = ?` : "";
  if (status) params.push(status);

  const [rows]: any = await pool.query(
    `SELECT
       i.id,
       i.status,
       i.quantidade,
       DATE_FORMAT(i.data_prevista, '%d/%m/%Y') AS data_prevista,
       DATE_FORMAT(i.criado_em,     '%d/%m/%Y') AS criado_em,
       n.id                                     AS necessidade_id,
       n.titulo,
       n.tipo_necessidade,
       n.categoria,
       DATE_FORMAT(n.data_inicio, '%d/%m/%Y')   AS data_inicio,
       DATE_FORMAT(n.data_fim,    '%d/%m/%Y')   AS data_fim,
       n.local_atividade,
       n.turno,
       u.nome                                   AS subtitulo
     FROM interesses_doacao i
     INNER JOIN necessidades n ON n.id = i.necessidade_id
     INNER JOIN usuarios u     ON u.id = i.usuario_id
     WHERE i.ong_id = ?${statusFilter}
     ORDER BY i.criado_em DESC
     LIMIT 100`,
    params
  );
  return rows as AtividadeUsuario[];
}
