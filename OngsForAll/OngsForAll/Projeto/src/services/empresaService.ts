import bcrypt from "bcryptjs";
import { z } from "zod";
import * as empresaRepo from "../repositories/empresaRepository";
import * as marketplaceRepo from "../repositories/marketplaceRepository";

function formatPrecoLabel(modoPreco: string, preco: any): string {
  if (modoPreco === "gratuito") return "Gratuito";
  if (modoPreco === "fixo" && preco != null) {
    return `R$ ${Number(preco).toFixed(2).replace(".", ",")}`;
  }
  return "Sob consulta";
}

const cadastroSchema = z.object({
  nome_fantasia: z.string().min(2, "Nome fantasia obrigatorio"),
  razao_social: z.string().optional(),
  email: z.string().email("Email invalido"),
  cnpj: z.string().min(14, "CNPJ invalido").max(18),
  telefone: z.string().min(8).optional(),
  descricao: z.string().optional(),
  setor: z.string().optional(),
  senha: z.string().min(6, "Senha minima de 6 caracteres"),
});

export async function cadastrarEmpresa(body: Record<string, string>) {
  const parsed = cadastroSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0].message };
  }

  const { senha, ...dados } = parsed.data;
  const senhaHash = await bcrypt.hash(senha, 10);

  try {
    await empresaRepo.createEmpresa({ ...dados, senhaHash });
    return { ok: true as const };
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY") {
      return { ok: false as const, error: "Email ou CNPJ ja cadastrado." };
    }
    throw err;
  }
}

export async function getDashboardData(empresaId: number) {
  const [empresa, metricas, apoios] = await Promise.all([
    empresaRepo.findEmpresaById(empresaId),
    empresaRepo.getMetricas(empresaId),
    empresaRepo.listarApoiosDaEmpresa(empresaId),
  ]);

  const isBloqueada = empresa.status_marketplace === "bloqueada";
  const isElegivel = empresa.status_marketplace === "elegivel";
  const isAtiva = empresa.status_marketplace === "ativa";
  const podePubilcar = isElegivel || isAtiva;

  const META_APOIOS = 3;
  const progressoMeta = Math.min(100, Math.round((Number(metricas.total_apoios) / META_APOIOS) * 100));
  const faltam = Math.max(0, META_APOIOS - Number(metricas.total_apoios));

  return {
    empresa,
    metricas: {
      total_apoios: Number(metricas.total_apoios),
      ongs_apoiadas: Number(metricas.ongs_apoiadas),
      tipos_apoiados: Number(metricas.tipos_apoiados),
    },
    apoiosRecentes: apoios.slice(0, 5),
    isBloqueada,
    isElegivel,
    isAtiva,
    podePubilcar,
    progressoMeta,
    faltam,
    META_APOIOS,
  };
}

export async function apoiarNecessidade(params: {
  empresaId: number;
  necessidadeId: number;
  ongId: number;
  observacao?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const jaApoiou = await empresaRepo.jaApoiou(params.empresaId, params.necessidadeId);
  if (jaApoiou) return { ok: false, error: "Sua empresa ja apoiou esta necessidade." };

  await empresaRepo.createApoio(params);
  await empresaRepo.verificarElegibilidade(params.empresaId);

  return { ok: true };
}

export async function criarItemMarketplace(params: {
  empresaId: number;
  titulo: string;
  descricao: string;
  tipo: string;
  categoriaId?: number;
  imagemUrl?: string;
  linkExterno?: string;
  modoPreco?: "gratuito" | "fixo" | "sob_consulta";
  preco?: number | null;
}): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const empresa = await empresaRepo.findEmpresaById(params.empresaId);
  if (!empresa) return { ok: false, error: "Empresa nao encontrada." };

  if (empresa.status_marketplace === "bloqueada") {
    return { ok: false, error: "Sua empresa precisa apoiar pelo menos 3 necessidades para publicar na vitrine." };
  }

  const titulo = params.titulo.trim();
  const descricao = params.descricao.trim();

  if (titulo.length < 3) return { ok: false, error: "Titulo deve ter ao menos 3 caracteres." };
  if (descricao.length < 10) return { ok: false, error: "Descricao deve ter ao menos 10 caracteres." };

  const tipo = ["produto", "servico", "campanha", "banner", "link"].includes(params.tipo)
    ? params.tipo
    : "produto";

  const modoPreco = params.modoPreco ?? "sob_consulta";
  if (modoPreco === "fixo" && (params.preco == null || params.preco < 0)) {
    return { ok: false, error: "Informe um valor valido para o preco fixo." };
  }
  const preco = modoPreco === "fixo" ? (params.preco ?? null) : null;

  const id = await marketplaceRepo.createItem({
    empresaId: params.empresaId,
    titulo,
    descricao,
    tipo,
    categoriaId: params.categoriaId,
    imagemUrl: params.imagemUrl,
    linkExterno: params.linkExterno,
    statusPublicacao: "pendente",
    modoPreco,
    preco: preco ?? undefined,
  });

  return { ok: true, id };
}

export async function listarItensPublicos(categoriaId?: number, tipo?: string) {
  const itens = await marketplaceRepo.listarItensAprovados({ categoriaId, tipo });
  return itens.map((i: any) => ({
    ...i,
    isProduto: i.tipo === "produto",
    isServico: i.tipo === "servico",
    isCampanha: i.tipo === "campanha",
    isBanner: i.tipo === "banner",
    isLink: i.tipo === "link",
    tipoLabel: ({ produto: "Produto", servico: "Servico", campanha: "Campanha", banner: "Institucional", link: "Link" } as Record<string, string>)[i.tipo] ?? i.tipo,
    precoLabel: formatPrecoLabel(i.modo_preco ?? "sob_consulta", i.preco),
    isGratuito: i.modo_preco === "gratuito",
    isFixo: i.modo_preco === "fixo",
    isSobConsulta: i.modo_preco === "sob_consulta" || !i.modo_preco,
  }));
}

export async function listarItensEmpresa(empresaId: number) {
  const itens = await marketplaceRepo.listarItensDaEmpresa(empresaId);
  return itens.map((i: any) => ({
    ...i,
    tipoLabel: ({ produto: "Produto", servico: "Servico", campanha: "Campanha", banner: "Institucional", link: "Link" } as Record<string, string>)[i.tipo] ?? i.tipo,
    statusLabel: ({ aprovado: "Aprovado", pendente: "Pendente", rejeitado: "Rejeitado", rascunho: "Rascunho" } as Record<string, string>)[i.status_publicacao] ?? i.status_publicacao,
    isAprovado: i.status_publicacao === "aprovado",
    isPendente: i.status_publicacao === "pendente",
    isRejeitado: i.status_publicacao === "rejeitado",
    isRascunho: i.status_publicacao === "rascunho",
    canDesativar: ["aprovado", "pendente", "rejeitado"].includes(i.status_publicacao),
    canReenviar: ["rejeitado", "rascunho"].includes(i.status_publicacao),
    precoLabel: formatPrecoLabel(i.modo_preco ?? "sob_consulta", i.preco),
    isGratuito: i.modo_preco === "gratuito",
    isFixo: i.modo_preco === "fixo",
    isSobConsulta: i.modo_preco === "sob_consulta" || !i.modo_preco,
  }));
}

const editarItemSchema = z.object({
  titulo: z.string().min(3, "Titulo deve ter ao menos 3 caracteres.").max(255),
  descricao: z.string().min(10, "Descricao deve ter ao menos 10 caracteres.").max(2000),
  tipo: z.enum(["produto", "servico", "campanha", "banner", "link"], {
    errorMap: () => ({ message: "Tipo invalido." }),
  }),
  linkExterno: z.string().max(500, "Link muito longo.").optional(),
  modoPreco: z.enum(["gratuito", "fixo", "sob_consulta"]).default("sob_consulta"),
  preco: z.preprocess(
    (v) => {
      if (v === undefined || v === null || v === "") return null;
      const n = parseFloat(String(v).replace(",", "."));
      return isNaN(n) ? null : n;
    },
    z.number().min(0, "O valor nao pode ser negativo.").nullable().optional()
  ),
});

export async function editarItemMarketplace(params: {
  empresaId: number;
  itemId: number;
  titulo: string;
  descricao: string;
  tipo: string;
  categoriaId?: number;
  imagemUrl: string | null;
  linkExterno?: string;
  acao?: "salvar" | "reenviar";
  modoPreco?: string;
  preco?: string | number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = editarItemSchema.safeParse({
    titulo: params.titulo,
    descricao: params.descricao,
    tipo: params.tipo,
    linkExterno: params.linkExterno || undefined,
    modoPreco: params.modoPreco || "sob_consulta",
    preco: params.preco,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const modoPreco = parsed.data.modoPreco;
  if (modoPreco === "fixo" && (parsed.data.preco == null || parsed.data.preco < 0)) {
    return { ok: false, error: "Informe um valor valido para o preco fixo." };
  }
  const preco = modoPreco === "fixo" ? (parsed.data.preco ?? null) : null;

  const item = await marketplaceRepo.findItemByIdDaEmpresa(params.itemId, params.empresaId);
  if (!item) return { ok: false, error: "Item nao encontrado." };

  let novoStatus: "rascunho" | "pendente" | "rejeitado" | "aprovado" = item.status_publicacao;
  if (params.acao === "reenviar") {
    novoStatus = "pendente";
  } else if (item.status_publicacao === "aprovado" || item.status_publicacao === "pendente") {
    novoStatus = "pendente";
  } else if (item.status_publicacao === "rascunho") {
    novoStatus = "rascunho";
  } else if (item.status_publicacao === "rejeitado") {
    novoStatus = "rejeitado";
  }

  const updated = await marketplaceRepo.updateItemDaEmpresa({
    id: params.itemId,
    empresaId: params.empresaId,
    titulo: parsed.data.titulo,
    descricao: parsed.data.descricao,
    tipo: parsed.data.tipo,
    categoriaId: params.categoriaId ?? null,
    imagemUrl: params.imagemUrl,
    linkExterno: parsed.data.linkExterno ?? null,
    statusPublicacao: novoStatus,
    modoPreco,
    preco,
  });
  if (!updated) return { ok: false, error: "Nao foi possivel atualizar o item." };

  return { ok: true };
}

export async function desativarItemMarketplace(params: {
  empresaId: number;
  itemId: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const item = await marketplaceRepo.findItemByIdDaEmpresa(params.itemId, params.empresaId);
  if (!item) return { ok: false, error: "Item nao encontrado." };
  if (item.status_publicacao === "rascunho") return { ok: false, error: "Item ja esta em rascunho." };

  const updated = await marketplaceRepo.atualizarStatusItemDaEmpresa(params.itemId, params.empresaId, "rascunho");
  if (!updated) return { ok: false, error: "Nao foi possivel desativar o item." };
  return { ok: true };
}

export async function reenviarItemMarketplace(params: {
  empresaId: number;
  itemId: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const item = await marketplaceRepo.findItemByIdDaEmpresa(params.itemId, params.empresaId);
  if (!item) return { ok: false, error: "Item nao encontrado." };
  if (!["rejeitado", "rascunho"].includes(item.status_publicacao)) {
    return { ok: false, error: "Somente itens rejeitados ou em rascunho podem ser reenviados." };
  }

  const updated = await marketplaceRepo.atualizarStatusItemDaEmpresa(params.itemId, params.empresaId, "pendente");
  if (!updated) return { ok: false, error: "Nao foi possivel reenviar o item." };
  return { ok: true };
}
