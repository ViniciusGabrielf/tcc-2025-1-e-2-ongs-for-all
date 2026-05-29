import { FastifyInstance } from "fastify";
import { renderOngsPage, renderOngDetalhePage } from "../controllers/ongController";
import { renderTransparenciaPage } from "../controllers/transparenciaController";
import { renderLocalizacaoPage, apiLookupCep } from "../controllers/localizacaoController";
import { submitOngReview } from "../controllers/ongReviewsController";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";

export async function ongRoutes(fastify: FastifyInstance) {
  fastify.get("/ongs", renderOngsPage);
  fastify.get("/ongs/:id", renderOngDetalhePage);
  fastify.post("/ongs/:ongId/avaliar", { preHandler: [ensureAuthenticated] }, submitOngReview);
  fastify.get("/ongs/:id/transparencia", renderTransparenciaPage);
  fastify.get("/ongs/:id/localizacao", renderLocalizacaoPage);
  fastify.get("/api/cep/:cep", apiLookupCep);
}
