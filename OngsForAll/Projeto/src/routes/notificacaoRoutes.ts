import { FastifyInstance } from "fastify";
import {
  renderNotificacoesPage,
  marcarNotificacaoComoLida,
  marcarTodasNotificacoesComoLidas,
  renderFeedPage,
} from "../controllers/notificacaoController";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";

export async function notificacaoRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/notificacoes",
    { preHandler: [ensureAuthenticated] },
    renderNotificacoesPage
  );

  fastify.post(
    "/notificacoes/:id/lida",
    { preHandler: [ensureAuthenticated] },
    marcarNotificacaoComoLida
  );

  fastify.post(
    "/notificacoes/todas/lida",
    { preHandler: [ensureAuthenticated] },
    marcarTodasNotificacoesComoLidas
  );

  fastify.get(
    "/feed",
    { preHandler: [ensureAuthenticated] },
    renderFeedPage
  );
}