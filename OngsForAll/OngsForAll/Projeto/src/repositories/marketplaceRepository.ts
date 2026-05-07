import { pool } from "../config/ds";

export async function getCategorias() {
  const [rows]: any = await pool.query(`SELECT id, nome, codigo FROM marketplace_categorias ORDER BY nome ASC`);
  return rows as any[];
}

export async function createItem(params: {
  empresaId: number;
  titulo: string;
  descricao: string;
  tipo: string;
  categoriaId?: number;
  imagemUrl?: string;
  linkExterno?: string;
  statusPublicacao: "rascunho" | "pendente";
  modoPreco?: "gratuito" | "fixo" | "sob_consulta";
  preco?: number;
}): Promise<number> {
  const [result]: any = await pool.query(
    `INSERT INTO marketplace_itens
       (empresa_id, titulo, descricao, tipo, categoria_id, imagem_url, link_externo, status_publicacao, modo_preco, preco)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.empresaId,
      params.titulo,
      params.descricao,
      params.tipo,
      params.categoriaId ?? null,
      params.imagemUrl ?? null,
      params.linkExterno ?? null,
      params.statusPublicacao,
      params.modoPreco ?? "sob_consulta",
      params.preco ?? null,
    ]
  );
  return result.insertId as number;
}

export async function listarItensDaEmpresa(empresaId: number) {
  const [rows]: any = await pool.query(
    `SELECT mi.id, mi.titulo, mi.descricao, mi.tipo, mi.imagem_url, mi.link_externo,
            mi.modo_preco, mi.preco,
            mi.status_publicacao, mi.destaque, mi.observacao_admin,
            DATE_FORMAT(mi.criado_em, '%d/%m/%Y') AS criado_em,
            mc.nome AS categoria_nome
     FROM marketplace_itens mi
     LEFT JOIN marketplace_categorias mc ON mc.id = mi.categoria_id
     WHERE mi.empresa_id = ?
     ORDER BY mi.criado_em DESC`,
    [empresaId]
  );
  return rows as any[];
}

export async function findItemById(id: number) {
  const [rows]: any = await pool.query(
    `SELECT mi.*, mc.nome AS categoria_nome,
            e.nome_fantasia AS nome_empresa, e.logo AS logo_empresa, e.setor AS setor_empresa,
            e.descricao AS descricao_empresa,
            e.status_marketplace AS empresa_status_marketplace,
            DATE_FORMAT(mi.criado_em, '%d/%m/%Y') AS criado_em_formatado
     FROM marketplace_itens mi
     LEFT JOIN marketplace_categorias mc ON mc.id = mi.categoria_id
     INNER JOIN empresas e ON e.id = mi.empresa_id
     WHERE mi.id = ? LIMIT 1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function findItemByIdDaEmpresa(id: number, empresaId: number) {
  const [rows]: any = await pool.query(
    `SELECT mi.id, mi.empresa_id, mi.titulo, mi.descricao, mi.tipo, mi.categoria_id, mi.imagem_url, mi.link_externo,
            mi.modo_preco, mi.preco,
            mi.status_publicacao, mi.destaque, mi.observacao_admin,
            DATE_FORMAT(mi.criado_em, '%d/%m/%Y') AS criado_em,
            mc.nome AS categoria_nome
     FROM marketplace_itens mi
     LEFT JOIN marketplace_categorias mc ON mc.id = mi.categoria_id
     WHERE mi.id = ? AND mi.empresa_id = ?
     LIMIT 1`,
    [id, empresaId]
  );
  return rows[0] ?? null;
}

export async function listarItensAprovados(params: { categoriaId?: number; tipo?: string } = {}) {
  let query = `
    SELECT mi.id, mi.titulo, mi.descricao, mi.tipo, mi.imagem_url, mi.link_externo,
           mi.modo_preco, mi.preco,
           mi.destaque, DATE_FORMAT(mi.criado_em, '%d/%m/%Y') AS criado_em,
           mc.nome AS categoria_nome, mc.codigo AS categoria_codigo,
           e.id AS empresa_id, e.nome_fantasia AS nome_empresa, e.logo AS logo_empresa,
           e.status_marketplace
    FROM marketplace_itens mi
    INNER JOIN empresas e ON e.id = mi.empresa_id
    LEFT JOIN marketplace_categorias mc ON mc.id = mi.categoria_id
    WHERE mi.status_publicacao = 'aprovado'
      AND e.status_marketplace = 'ativa'
  `;
  const params_sql: any[] = [];

  if (params.categoriaId) {
    query += ` AND mi.categoria_id = ?`;
    params_sql.push(params.categoriaId);
  }
  if (params.tipo && ["produto", "servico", "campanha", "banner", "link"].includes(params.tipo)) {
    query += ` AND mi.tipo = ?`;
    params_sql.push(params.tipo);
  }

  query += ` ORDER BY mi.destaque DESC, mi.criado_em DESC`;

  const [rows]: any = await pool.query(query, params_sql);
  return rows as any[];
}

// Admin
export async function listarItensPendentes() {
  const [rows]: any = await pool.query(
    `SELECT mi.id, mi.titulo, mi.descricao, mi.tipo, mi.imagem_url, mi.status_publicacao, mi.observacao_admin,
            DATE_FORMAT(mi.criado_em, '%d/%m/%Y') AS criado_em,
            mc.nome AS categoria_nome,
            e.nome_fantasia AS nome_empresa, e.id AS empresa_id
     FROM marketplace_itens mi
     INNER JOIN empresas e ON e.id = mi.empresa_id
     LEFT JOIN marketplace_categorias mc ON mc.id = mi.categoria_id
     ORDER BY FIELD(mi.status_publicacao,'pendente','rascunho','aprovado','rejeitado'), mi.criado_em DESC`
  );
  return rows as any[];
}

export async function atualizarStatusItem(
  id: number,
  status: "aprovado" | "rejeitado",
  observacaoAdmin?: string
) {
  await pool.query(
    `UPDATE marketplace_itens SET status_publicacao = ?, observacao_admin = ?, atualizado_em = NOW() WHERE id = ?`,
    [status, observacaoAdmin ?? null, id]
  );
}

export async function toggleDestaque(id: number, destaque: boolean) {
  await pool.query(`UPDATE marketplace_itens SET destaque = ? WHERE id = ?`, [destaque ? 1 : 0, id]);
}

export async function contarItensRevisados(empresaId: number): Promise<number> {
  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS total FROM marketplace_itens
     WHERE empresa_id = ? AND status_publicacao IN ('aprovado', 'rejeitado') AND lida_empresa = 0`,
    [empresaId]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function marcarItensComoLidos(empresaId: number): Promise<void> {
  await pool.query(
    `UPDATE marketplace_itens
     SET lida_empresa = 1
     WHERE empresa_id = ? AND status_publicacao IN ('aprovado', 'rejeitado') AND lida_empresa = 0`,
    [empresaId]
  );
}

export async function listarItensComStatus(empresaId: number) {
  const [rows]: any = await pool.query(
    `SELECT mi.id, mi.titulo, mi.tipo, mi.status_publicacao, mi.observacao_admin, mi.imagem_url,
            DATE_FORMAT(mi.atualizado_em, '%d/%m/%Y às %H:%i') AS atualizado_em,
            DATE_FORMAT(mi.criado_em, '%d/%m/%Y') AS criado_em
     FROM marketplace_itens mi
     WHERE mi.empresa_id = ?
     ORDER BY FIELD(mi.status_publicacao,'aprovado','rejeitado','pendente','rascunho'), mi.atualizado_em DESC`,
    [empresaId]
  );
  return rows as any[];
}

export async function updateItem(params: {
  id: number;
  titulo: string;
  descricao: string;
  tipo: string;
  categoriaId: number | null;
  imagemUrl: string | null;
  linkExterno: string | null;
  statusPublicacao: string;
  modoPreco?: "gratuito" | "fixo" | "sob_consulta";
  preco?: number | null;
}): Promise<void> {
  await pool.query(
    `UPDATE marketplace_itens
     SET titulo = ?, descricao = ?, tipo = ?, categoria_id = ?, imagem_url = ?, link_externo = ?,
         modo_preco = ?, preco = ?, status_publicacao = ?, atualizado_em = NOW()
     WHERE id = ?`,
    [
      params.titulo,
      params.descricao,
      params.tipo,
      params.categoriaId,
      params.imagemUrl,
      params.linkExterno,
      params.modoPreco ?? "sob_consulta",
      params.preco ?? null,
      params.statusPublicacao,
      params.id,
    ]
  );
}

export async function updateItemDaEmpresa(params: {
  id: number;
  empresaId: number;
  titulo: string;
  descricao: string;
  tipo: string;
  categoriaId: number | null;
  imagemUrl: string | null;
  linkExterno: string | null;
  statusPublicacao: "rascunho" | "pendente" | "rejeitado" | "aprovado";
  modoPreco: "gratuito" | "fixo" | "sob_consulta";
  preco: number | null;
}): Promise<boolean> {
  const [result]: any = await pool.query(
    `UPDATE marketplace_itens
     SET titulo = ?, descricao = ?, tipo = ?, categoria_id = ?, imagem_url = ?, link_externo = ?,
         modo_preco = ?, preco = ?,
         status_publicacao = ?, observacao_admin = CASE WHEN ? = 'pendente' THEN NULL ELSE observacao_admin END, atualizado_em = NOW()
     WHERE id = ? AND empresa_id = ?`,
    [
      params.titulo,
      params.descricao,
      params.tipo,
      params.categoriaId,
      params.imagemUrl,
      params.linkExterno,
      params.modoPreco,
      params.preco,
      params.statusPublicacao,
      params.statusPublicacao,
      params.id,
      params.empresaId,
    ]
  );
  return Number(result?.affectedRows ?? 0) > 0;
}

export async function atualizarStatusItemDaEmpresa(
  id: number,
  empresaId: number,
  status: "rascunho" | "pendente"
): Promise<boolean> {
  const [result]: any = await pool.query(
    `UPDATE marketplace_itens
     SET status_publicacao = ?, destaque = 0,
         observacao_admin = CASE WHEN ? = 'pendente' THEN NULL ELSE observacao_admin END,
         atualizado_em = NOW()
     WHERE id = ? AND empresa_id = ?`,
    [status, status, id, empresaId]
  );
  return Number(result?.affectedRows ?? 0) > 0;
}
