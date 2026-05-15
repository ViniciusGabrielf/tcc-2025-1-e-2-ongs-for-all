import { FastifyInstance } from "fastify";
import { renderOngsPage } from "../controllers/ongController";
import { renderTransparenciaPage } from "../controllers/transparenciaController";

export async function ongRoutes(fastify: FastifyInstance) {
  fastify.get("/ongs", renderOngsPage);
  fastify.get("/ongs/:id/transparencia", renderTransparenciaPage);
}
