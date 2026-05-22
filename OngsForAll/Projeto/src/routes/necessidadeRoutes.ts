import { FastifyInstance } from "fastify";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import {
  renderListaNecessidadesPage,
  renderNovaNecessidadePage,
  criarNecessidade,
  renderDetalheNecessidadePage,
  renderNecessidadesOngPage,
  renderEditarNecessidadePage,
  editarNecessidade,
  alterarStatusNecessidade,
} from "../controllers/necessidadeController";

export async function necessidadeRoutes(fastify: FastifyInstance) {
  // usuários e ongs podem ver a lista pública de necessidades abertas
  fastify.get("/necessidades", renderListaNecessidadesPage);

  // detalhe da necessidade
  fastify.get("/necessidades/:id", renderDetalheNecessidadePage);

  // ONG cria necessidade
  fastify.get("/necessidades/nova", { preHandler: ensureAuthenticated }, renderNovaNecessidadePage);
  fastify.post("/necessidades", { preHandler: ensureAuthenticated }, criarNecessidade);

  // dashboard da ONG com suas necessidades
  fastify.get("/ong/necessidades", { preHandler: ensureAuthenticated }, renderNecessidadesOngPage);
  fastify.get("/necessidades/:id/editar", { preHandler: ensureAuthenticated }, renderEditarNecessidadePage);
  fastify.post("/necessidades/:id/editar", { preHandler: ensureAuthenticated }, editarNecessidade);

  // alterar status
  fastify.post("/necessidades/:id/status", { preHandler: ensureAuthenticated }, alterarStatusNecessidade);
}
