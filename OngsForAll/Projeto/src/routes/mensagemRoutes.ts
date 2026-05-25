import { FastifyInstance } from "fastify";
import {
  renderListaMensagensUsuario,
  renderListaMensagensOng,
  renderConversa,
  enviarMensagem,
  iniciarConversa,
  arquivarConversaHandler,
  desarquivarConversaHandler,
} from "../controllers/mensagemController";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import { ensureUser } from "../middlewares/ensureUser";
import { ensureOng } from "../middlewares/ensureOng";

export async function mensagemRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/mensagens",
    { preHandler: [ensureAuthenticated, ensureUser] },
    renderListaMensagensUsuario
  );

  fastify.get(
    "/ong/mensagens",
    { preHandler: [ensureAuthenticated, ensureOng] },
    renderListaMensagensOng
  );

  fastify.get(
    "/ong/mensagens/:id",
    { preHandler: [ensureAuthenticated, ensureOng] },
    renderConversa
  );

  fastify.post(
    "/ong/mensagens/:id/enviar",
    { preHandler: [ensureAuthenticated, ensureOng] },
    enviarMensagem
  );

  fastify.post(
    "/ong/mensagens/:id/arquivar",
    { preHandler: [ensureAuthenticated, ensureOng] },
    arquivarConversaHandler
  );

  fastify.post(
    "/ong/mensagens/:id/desarquivar",
    { preHandler: [ensureAuthenticated, ensureOng] },
    desarquivarConversaHandler
  );

  fastify.get(
    "/mensagens/:id",
    { preHandler: ensureAuthenticated },
    renderConversa
  );

  fastify.post(
    "/mensagens/:id/enviar",
    { preHandler: ensureAuthenticated },
    enviarMensagem
  );

  fastify.post(
    "/mensagens/:id/arquivar",
    { preHandler: ensureAuthenticated },
    arquivarConversaHandler
  );

  fastify.post(
    "/mensagens/:id/desarquivar",
    { preHandler: ensureAuthenticated },
    desarquivarConversaHandler
  );

  fastify.post(
    "/mensagens/iniciar",
    { preHandler: ensureAuthenticated },
    iniciarConversa
  );
}
