import { FastifyInstance } from "fastify";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import { renderCalendarioPage, apiDetalheEvento } from "../controllers/calendarioController";

export async function calendarioRoutes(fastify: FastifyInstance) {
  fastify.get("/calendario", { preHandler: [ensureAuthenticated] }, renderCalendarioPage);
  fastify.get("/calendario/evento", { preHandler: [ensureAuthenticated] }, apiDetalheEvento);
}
