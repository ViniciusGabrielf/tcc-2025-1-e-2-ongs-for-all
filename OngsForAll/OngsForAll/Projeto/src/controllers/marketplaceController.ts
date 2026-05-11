import { FastifyRequest, FastifyReply } from "fastify";
import * as marketplaceRepo from "../repositories/marketplaceRepository";
import * as empresaRepo from "../repositories/empresaRepository";
import * as empresaService from "../services/empresaService";
import * as notificacaoService from "../services/notificacaoService";

async function getNaoLidas(user: { tipo: string; id: number }) {
  const { naoLidas } = await notificacaoService.contarNaoLidas({
    tipoConta: user.tipo as "usuario" | "ong",
    id: Number(user.id),
  });
  return naoLidas;
}

// ----------------------------------------------------------
// Vitrine pública
// ----------------------------------------------------------
export async function renderMarketplacePage(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  const naoLidas = sessionUser && sessionUser.tipo !== "empresa"
    ? await getNaoLidas(sessionUser as any)
    : 0;

  const { categoria, tipo } = request.query as { categoria?: string; tipo?: string };
  const categorias = await marketplaceRepo.getCategorias();

  let categoriaId: number | undefined;
  if (categoria) {
    const cat = categorias.find((c: any) => c.codigo === categoria);
    if (cat) categoriaId = cat.id;
  }

  const itens = await empresaService.listarItensPublicos(categoriaId, tipo);
  const destaques = itens.filter((i: any) => i.destaque);
  const demais = itens.filter((i: any) => !i.destaque);

  const layout = sessionUser?.tipo === "ong"
    ? "layouts/ongDashboardLayout"
    : sessionUser?.tipo === "empresa"
    ? "layouts/empresaDashboardLayout"
    : "layouts/dashboardLayout";

  return reply.view(
    "/templates/marketplace/vitrine.hbs",
    {
      user: sessionUser,
      naoLidas,
      categorias,
      destaques,
      itens: demais,
      totalItens: itens.length,
      filtroCategoria: categoria ?? "",
      filtroTipo: tipo ?? "",
    },
    { layout }
  );
}

export async function renderDetalheItemPage(request: FastifyRequest, reply: FastifyReply) {
  const sessionUser = request.session.user;
  const naoLidas = sessionUser && sessionUser.tipo !== "empresa"
    ? await getNaoLidas(sessionUser as any)
    : 0;

  const { id } = request.params as { id: string };
  const rawItem = await marketplaceRepo.findItemById(Number(id));

  if (!rawItem || rawItem.status_publicacao !== "aprovado" || rawItem.empresa_status_marketplace !== "ativa") {
    return reply.status(404).send({ message: "Item não encontrado." });
  }

  const modoPreco = rawItem.modo_preco ?? "sob_consulta";
  let precoLabel = "Sob consulta";
  if (modoPreco === "gratuito") precoLabel = "Gratuito";
  else if (modoPreco === "fixo" && rawItem.preco != null) {
    precoLabel = `R$ ${Number(rawItem.preco).toFixed(2).replace(".", ",")}`;
  }

  const item = {
    ...rawItem,
    tipoLabel: ({
      produto: "Produto",
      servico: "Serviço",
      campanha: "Campanha",
      banner: "Institucional",
      link: "Link",
    } as Record<string, string>)[rawItem.tipo] ?? rawItem.tipo,
    precoLabel,
    isGratuito: modoPreco === "gratuito",
    isFixo: modoPreco === "fixo",
    isSobConsulta: modoPreco === "sob_consulta",
  };

  const layout = sessionUser?.tipo === "ong"
    ? "layouts/ongDashboardLayout"
    : sessionUser?.tipo === "empresa"
    ? "layouts/empresaDashboardLayout"
    : "layouts/dashboardLayout";

  return reply.view(
    "/templates/marketplace/detalhe.hbs",
    { user: sessionUser, naoLidas, item },
    { layout }
  );
}

// ----------------------------------------------------------
// Admin: moderação de itens e empresas
// ----------------------------------------------------------
export async function renderAdminMarketplacePage(request: FastifyRequest, reply: FastifyReply) {
  if (!(request.session as any).adminAutenticado) return reply.redirect("/admin/login");

  const [itens, empresas] = await Promise.all([
    marketplaceRepo.listarItensPendentes(),
    empresaRepo.listarEmpresasParaAdmin(),
  ]);

  const itensEnrich = itens.map((i: any) => ({
    ...i,
    isPendente: i.status_publicacao === "pendente",
    isAprovado: i.status_publicacao === "aprovado",
    isRejeitado: i.status_publicacao === "rejeitado",
  }));

  const empresasEnrich = empresas.map((e: any) => ({
    ...e,
    status_atual: e.status_atual === "validado" ? "validado" : "invalido",
    isBloqueada: e.status_marketplace === "bloqueada",
    isElegivel: e.status_marketplace === "elegivel",
    isAtiva: e.status_marketplace === "ativa",
    isCnpjValidado: e.status_atual === "validado",
    isCnpjInvalido: e.status_atual !== "validado",
    hasCnpjPendente: e.status_solicitacao === "pendente",
    hasCnpjRejeitado: e.status_solicitacao === "rejeitado",
    bloqueiaAtividadesPorCnpj: e.status_atual !== "validado",
  }));

  return reply.view(
    "/templates/admin/marketplace.hbs",
    {
      itens: itensEnrich,
      empresas: empresasEnrich,
      adminPageMarketplace: true,
      error: (request.query as any)?.erro || "",
    },
    { layout: "layouts/adminLayout" }
  );
}

export async function aprovarItem(request: FastifyRequest, reply: FastifyReply) {
  if (!(request.session as any).adminAutenticado) return reply.redirect("/admin/login");
  const { id } = request.params as { id: string };
  await marketplaceRepo.atualizarStatusItem(Number(id), "aprovado");
  return reply.redirect("/admin/marketplace");
}

export async function rejeitarItem(request: FastifyRequest, reply: FastifyReply) {
  if (!(request.session as any).adminAutenticado) return reply.redirect("/admin/login");
  const { id } = request.params as { id: string };
  const { observacao } = request.body as { observacao?: string };
  await marketplaceRepo.atualizarStatusItem(Number(id), "rejeitado", observacao);
  return reply.redirect("/admin/marketplace");
}

export async function ativarEmpresaMarketplace(request: FastifyRequest, reply: FastifyReply) {
  if (!(request.session as any).adminAutenticado) return reply.redirect("/admin/login");
  const { id } = request.params as { id: string };
  await empresaRepo.atualizarStatusMarketplace(Number(id), "ativa");
  return reply.redirect("/admin/marketplace");
}

export async function bloquearEmpresaMarketplace(request: FastifyRequest, reply: FastifyReply) {
  if (!(request.session as any).adminAutenticado) return reply.redirect("/admin/login");
  const { id } = request.params as { id: string };
  await empresaRepo.atualizarStatusMarketplace(Number(id), "bloqueada");
  return reply.redirect("/admin/marketplace");
}

export async function aprovarCnpjEmpresa(request: FastifyRequest, reply: FastifyReply) {
  if (!(request.session as any).adminAutenticado) return reply.redirect("/admin/login");
  const { id } = request.params as { id: string };

  const result = await empresaService.aprovarCnpjEmpresa(Number(id));
  if (!result.ok) {
    return reply.redirect(`/admin/marketplace?erro=${encodeURIComponent(result.error)}`);
  }

  return reply.redirect("/admin/marketplace");
}

export async function rejeitarCnpjEmpresa(request: FastifyRequest, reply: FastifyReply) {
  if (!(request.session as any).adminAutenticado) return reply.redirect("/admin/login");
  const { id } = request.params as { id: string };
  const { observacao } = request.body as { observacao?: string };

  const result = await empresaService.rejeitarCnpjEmpresa(Number(id), observacao);
  if (!result.ok) {
    return reply.redirect(`/admin/marketplace?erro=${encodeURIComponent(result.error)}`);
  }

  return reply.redirect("/admin/marketplace");
}
