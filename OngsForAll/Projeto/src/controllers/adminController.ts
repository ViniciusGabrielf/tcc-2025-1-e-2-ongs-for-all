import { FastifyRequest, FastifyReply } from "fastify";
import * as ongAprovacaoRepo from "../repositories/ongAprovacaoRepository";

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

  (request.session as any).adminAutenticado = true;
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
