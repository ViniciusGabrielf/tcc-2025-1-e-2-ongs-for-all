import { FastifyRequest, FastifyReply } from "fastify";
import * as repo from "../repositories/apoiadoresRepository";

export async function renderApoiadoresPage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const lista = await repo.listarAtivosPublico();

  const apoiadores = lista.map(a => ({
    ...a,
    inicial: (a.nome || "?").trim()[0].toUpperCase(),
    temLogo: !!a.logo_url,
    temDesc: !!a.descricao,
    temLink: !!a.website_url,
  }));

  return reply.view(
    "/templates/apoiadores.hbs",
    {
      title: "Apoiadores",
      apoiadores,
      temApoiadores: apoiadores.length > 0,
    },
    { layout: "layouts/main" }
  );
}
