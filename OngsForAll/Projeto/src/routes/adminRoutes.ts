import { FastifyInstance } from "fastify";
import {
  renderAdminLoginPage,
  handleAdminLogin,
  renderAdminOngsPage,
  renderAdminDocumentosPage,
  aprovarOng,
  rejeitarOng,
  aprovarDocumentoPerfil,
  rejeitarDocumentoPerfil,
} from "../controllers/adminController";

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.get("/admin", async (_request, reply) => {
    return reply.redirect("/admin/login");
  });

  fastify.get("/admin/login", renderAdminLoginPage);
  fastify.post("/admin/login", handleAdminLogin);
  fastify.get("/admin/ongs", renderAdminOngsPage);
  fastify.post("/admin/ongs/:id/aprovar", aprovarOng);
  fastify.post("/admin/ongs/:id/rejeitar", rejeitarOng);
  fastify.get("/admin/documentos", renderAdminDocumentosPage);
  fastify.post("/admin/documentos/:tipo/:id/aprovar", aprovarDocumentoPerfil);
  fastify.post("/admin/documentos/:tipo/:id/rejeitar", rejeitarDocumentoPerfil);
}
