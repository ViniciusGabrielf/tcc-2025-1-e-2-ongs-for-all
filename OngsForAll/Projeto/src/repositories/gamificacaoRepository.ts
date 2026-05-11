import { pool } from "../config/ds";

const PONTOS_POR_ACAO: Record<string, number> = {
  primeiro_interesse: 10,
  interesse_confirmado: 20,
  interesse_voluntariado: 25,
};

export async function getPontuacao(usuarioId: number) {
  const [rows]: any = await pool.query(
    `SELECT pontos, total_acumulado, nivel FROM pontuacoes WHERE usuario_id = ? LIMIT 1`,
    [usuarioId]
  );
  return rows[0] ?? null;
}

export async function garantirPontuacao(usuarioId: number) {
  await pool.query(
    `INSERT IGNORE INTO pontuacoes (usuario_id, pontos, total_acumulado, nivel) VALUES (?, 0, 0, 1)`,
    [usuarioId]
  );
}

export async function adicionarPontos(usuarioId: number, quantidade: number) {
  await garantirPontuacao(usuarioId);

  await pool.query(
    `UPDATE pontuacoes
     SET pontos = pontos + ?,
         total_acumulado = total_acumulado + ?,
         nivel = CASE
           WHEN total_acumulado + ? >= 200 THEN 5
           WHEN total_acumulado + ? >= 100 THEN 4
           WHEN total_acumulado + ? >= 50  THEN 3
           WHEN total_acumulado + ? >= 20  THEN 2
           ELSE 1
         END,
         atualizado_em = NOW()
     WHERE usuario_id = ?`,
    [quantidade, quantidade, quantidade, quantidade, quantidade, quantidade, usuarioId]
  );
}

export async function getSelosDoUsuario(usuarioId: number) {
  const [rows]: any = await pool.query(
    `SELECT s.codigo, s.nome, s.descricao, s.icone,
            DATE_FORMAT(us.conquistado_em, '%d/%m/%Y') AS conquistado_em
     FROM usuario_selos us
     INNER JOIN selos s ON s.id = us.selo_id
     WHERE us.usuario_id = ?
     ORDER BY us.conquistado_em DESC`,
    [usuarioId]
  );
  return rows as any[];
}

export async function usuarioTemSelo(usuarioId: number, codigoSelo: string): Promise<boolean> {
  const [rows]: any = await pool.query(
    `SELECT 1 FROM usuario_selos us
     INNER JOIN selos s ON s.id = us.selo_id
     WHERE us.usuario_id = ? AND s.codigo = ?
     LIMIT 1`,
    [usuarioId, codigoSelo]
  );
  return rows.length > 0;
}

export async function concederSelo(usuarioId: number, codigoSelo: string): Promise<boolean> {
  const [selos]: any = await pool.query(`SELECT id FROM selos WHERE codigo = ? LIMIT 1`, [codigoSelo]);
  if (!selos.length) return false;

  const seloId = selos[0].id;
  try {
    await pool.query(
      `INSERT IGNORE INTO usuario_selos (usuario_id, selo_id) VALUES (?, ?)`,
      [usuarioId, seloId]
    );
    return true;
  } catch {
    return false;
  }
}

export async function contarInteressesDoUsuario(usuarioId: number): Promise<number> {
  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM interesses_doacao WHERE usuario_id = ?`,
    [usuarioId]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function contarOngsApoiadas(usuarioId: number): Promise<number> {
  const [rows]: any = await pool.query(
    `SELECT COUNT(DISTINCT ong_id) AS total FROM interesses_doacao WHERE usuario_id = ? AND status IN ('aceito','recebido')`,
    [usuarioId]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function contarInteressesConfirmados(usuarioId: number): Promise<number> {
  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM interesses_doacao WHERE usuario_id = ? AND status = 'recebido'`,
    [usuarioId]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function contarTiposContribuidos(usuarioId: number): Promise<string[]> {
  const [rows]: any = await pool.query(
    `SELECT DISTINCT n.tipo_necessidade
     FROM interesses_doacao i
     INNER JOIN necessidades n ON n.id = i.necessidade_id
     WHERE i.usuario_id = ? AND i.status IN ('aceito','recebido')`,
    [usuarioId]
  );
  return rows.map((r: any) => r.tipo_necessidade);
}

export async function getTodosOsSelos(): Promise<any[]> {
  const [rows]: any = await pool.query(`SELECT codigo, nome, descricao, icone FROM selos ORDER BY id ASC`);
  return rows;
}

export function nivelLabel(nivel: number): string {
  const labels: Record<number, string> = {
    1: "Iniciante",
    2: "Colaborador",
    3: "Engajado",
    4: "Dedicado",
    5: "Embaixador",
  };
  return labels[nivel] ?? "Iniciante";
}
