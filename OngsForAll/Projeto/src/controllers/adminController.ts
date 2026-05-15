import { FastifyRequest, FastifyReply } from "fastify";
import * as ongAprovacaoRepo from "../repositories/ongAprovacaoRepository";
import * as perfilService from "../services/perfilService";

const ADMIN_SECRET = process.env.ADMIN_SECRET ?? "";

function isAdminAuth(request: FastifyRequest): boolean {
  return (request.session as any).adminAutenticado === true;
}

export async function renderAdminLoginPage(request: FastifyRequest, reply: FastifyReply) {
  if (isAdminAuth(request)) return reply.redirect("/admin/ongs");
  return reply.view("/templates/admin/login.hbs", {}, { layout: "layouts/authLayout" });
}

export async function handleAdminLogin(request: FastifyRequest, reply: FastifyReply) {
  const { secret } = request.body as { secret: string };

  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return reply.view(
      "/templates/admin/login.hbs",
      { error: "Credenciais inválidas." },
      { layout: "layouts/authLayout" }
    );
  }

  await request.session.regenerate();
  request.session.adminAutenticado = true;
  return reply.redirect("/admin/ongs");
}

export async function renderAdminOngsPage(request: FastifyRequest, reply: FastifyReply) {
  if (!isAdminAuth(request)) return reply.redirect("/admin/login");

  const ongs = await ongAprovacaoRepo.listarOngsParaAdmin();
  const sucesso = (request.query as any)?.sucesso === "1";

  return reply.view(
    "/templates/admin/ongs.hbs",
    { ongs, sucesso, adminPageOngs: true },
    { layout: "layouts/adminLayout" }
  );
}

export async function aprovarOng(request: FastifyRequest, reply: FastifyReply) {
  if (!isAdminAuth(request)) return reply.redirect("/admin/login");

  const { id } = request.params as { id: string };
  const { observacao } = request.body as { observacao?: string };

  await ongAprovacaoRepo.atualizarStatusOng(Number(id), "aprovada", observacao);
  return reply.redirect("/admin/ongs?sucesso=1");
}

export async function rejeitarOng(request: FastifyRequest, reply: FastifyReply) {
  if (!isAdminAuth(request)) return reply.redirect("/admin/login");

  const { id } = request.params as { id: string };
  const { observacao } = request.body as { observacao?: string };

  await ongAprovacaoRepo.atualizarStatusOng(Number(id), "rejeitada", observacao);
  return reply.redirect("/admin/ongs?sucesso=1");
}

export async function renderAdminDocumentosPage(request: FastifyRequest, reply: FastifyReply) {
  if (!isAdminAuth(request)) return reply.redirect("/admin/login");

  const pendencias = await perfilService.getDocumentosPendentesAdmin();
  const sucesso = (request.query as any)?.sucesso === "1";

  return reply.view(
    "/templates/admin/documentos.hbs",
    {
      usuarios: pendencias.usuarios,
      ongs: pendencias.ongs,
      total: pendencias.usuarios.length + pendencias.ongs.length,
      sucesso,
      adminPageDocumentos: true,
    },
    { layout: "layouts/adminLayout" }
  );
}

export async function aprovarDocumentoPerfil(request: FastifyRequest, reply: FastifyReply) {
  if (!isAdminAuth(request)) return reply.redirect("/admin/login");

  const { tipo, id } = request.params as { tipo: "usuario" | "ong"; id: string };
  if (tipo !== "usuario" && tipo !== "ong") return reply.redirect("/admin/documentos");

  await perfilService.aprovarDocumentoPerfil(tipo, Number(id));
  return reply.redirect("/admin/documentos?sucesso=1");
}

export async function rejeitarDocumentoPerfil(request: FastifyRequest, reply: FastifyReply) {
  if (!isAdminAuth(request)) return reply.redirect("/admin/login");

  const { tipo, id } = request.params as { tipo: "usuario" | "ong"; id: string };
  const { observacao } = request.body as { observacao?: string };
  if (tipo !== "usuario" && tipo !== "ong") return reply.redirect("/admin/documentos");

  await perfilService.rejeitarDocumentoPerfil(tipo, Number(id), observacao);
  return reply.redirect("/admin/documentos?sucesso=1");
}
