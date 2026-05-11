import { FastifyInstance } from "fastify";
import { renderOngsPage } from "../controllers/ongController";
import { renderTransparenciaPage } from "../controllers/transparenciaController";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";

export async function ongRoutes(fastify: FastifyInstance) {
  fastify.get("/ongs", { preHandler: ensureAuthenticated }, renderOngsPage);
  fastify.get("/ongs/:id/transparencia", { preHandler: ensureAuthenticated }, renderTransparenciaPage);
}
