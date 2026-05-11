import { FastifyInstance } from "fastify";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import { ensureOng } from "../middlewares/ensureOng";
import { renderNovaEvidenciaPage, uploadEvidencia } from "../controllers/evidenciaController";

export async function evidenciaRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/ong/interesses/:id/evidencia",
    { preHandler: [ensureAuthenticated, ensureOng] },
    renderNovaEvidenciaPage
  );

  fastify.post(
    "/ong/interesses/:id/evidencia",
    { preHandler: [ensureAuthenticated, ensureOng] },
    uploadEvidencia
  );
}
