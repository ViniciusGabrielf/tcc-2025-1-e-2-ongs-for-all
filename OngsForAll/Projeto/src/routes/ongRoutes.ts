import { FastifyInstance } from "fastify";
import { renderOngsPage } from "../controllers/ongController";
import { renderTransparenciaPage } from "../controllers/transparenciaController";
import { renderLocalizacaoPage, apiLookupCep } from "../controllers/localizacaoController";

export async function ongRoutes(fastify: FastifyInstance) {
  fastify.get("/ongs", renderOngsPage);
  fastify.get("/ongs/:id/transparencia", renderTransparenciaPage);
  fastify.get("/ongs/:id/localizacao", renderLocalizacaoPage);
  fastify.get("/api/cep/:cep", apiLookupCep);
}
