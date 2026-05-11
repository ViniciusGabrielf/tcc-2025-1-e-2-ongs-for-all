import { FastifyInstance } from "fastify";
import {
  renderListaMensagensUsuario,
  renderListaMensagensOng,
  renderConversa,
  enviarMensagem,
  iniciarConversa,
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
    "/mensagens/iniciar",
    { preHandler: [ensureAuthenticated, ensureUser] },
    iniciarConversa
  );
}
