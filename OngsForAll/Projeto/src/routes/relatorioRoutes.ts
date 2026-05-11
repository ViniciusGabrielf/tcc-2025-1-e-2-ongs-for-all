import { FastifyInstance } from "fastify";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import { ensureOng } from "../middlewares/ensureOng";
import {
  renderListaRelatoriosPage,
  renderNovoRelatorioPage,
  criarRelatorio,
  renderDetalheRelatorioPage,
} from "../controllers/relatorioController";

export async function relatorioRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/ong/relatorios",
    { preHandler: [ensureAuthenticated, ensureOng] },
    renderListaRelatoriosPage
  );

  fastify.get(
    "/ong/relatorios/novo",
    { preHandler: [ensureAuthenticated, ensureOng] },
    renderNovoRelatorioPage
  );

  fastify.post(
    "/ong/relatorios",
    { preHandler: [ensureAuthenticated, ensureOng] },
    criarRelatorio
  );

  // detalhe público (autenticado)
  fastify.get(
    "/relatorios/:id",
    { preHandler: ensureAuthenticated },
    renderDetalheRelatorioPage
  );
}
