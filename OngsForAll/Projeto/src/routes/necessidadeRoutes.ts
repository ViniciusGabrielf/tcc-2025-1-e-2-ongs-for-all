import { FastifyInstance } from "fastify";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import {
  renderListaNecessidadesPage,
  renderNovaNecessidadePage,
  criarNecessidade,
  renderDetalheNecessidadePage,
  renderNecessidadesOngPage,
  alterarStatusNecessidade,
} from "../controllers/necessidadeController";

export async function necessidadeRoutes(fastify: FastifyInstance) {
  // usuários e ongs podem ver a lista pública de necessidades abertas
  fastify.get("/necessidades", { preHandler: ensureAuthenticated }, renderListaNecessidadesPage);

  // detalhe da necessidade
  fastify.get("/necessidades/:id", { preHandler: ensureAuthenticated }, renderDetalheNecessidadePage);

  // ONG cria necessidade
  fastify.get("/necessidades/nova", { preHandler: ensureAuthenticated }, renderNovaNecessidadePage);
  fastify.post("/necessidades", { preHandler: ensureAuthenticated }, criarNecessidade);

  // dashboard da ONG com suas necessidades
  fastify.get("/ong/necessidades", { preHandler: ensureAuthenticated }, renderNecessidadesOngPage);

  // alterar status
  fastify.post("/necessidades/:id/status", { preHandler: ensureAuthenticated }, alterarStatusNecessidade);
}