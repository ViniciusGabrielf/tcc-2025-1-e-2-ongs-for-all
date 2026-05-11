import { FastifyInstance } from "fastify";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import { ensureOng } from "../middlewares/ensureOng";
import { renderDocumentosPage, uploadDocumento } from "../controllers/ongDocumentoController";

export async function ongDocumentoRoutes(fastify: FastifyInstance) {
  fastify.get(
    "/ong/documentos",
    { preHandler: [ensureAuthenticated, ensureOng] },
    renderDocumentosPage
  );

  fastify.post(
    "/ong/documentos",
    { preHandler: [ensureAuthenticated, ensureOng] },
    uploadDocumento
  );
}
