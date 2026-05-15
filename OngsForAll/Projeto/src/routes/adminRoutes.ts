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
import { ensureAdmin } from "../middlewares/ensureAdmin";
import { createRateLimit } from "../middlewares/rateLimit";

const adminLoginRateLimit = createRateLimit({
  keyPrefix: "admin-login",
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
});

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.get("/admin", async (_request, reply) => {
    return reply.redirect("/admin/login");
  });

  fastify.get("/admin/login", renderAdminLoginPage);
  fastify.post("/admin/login", { preHandler: adminLoginRateLimit }, handleAdminLogin);
  fastify.get("/admin/ongs", { preHandler: ensureAdmin }, renderAdminOngsPage);
  fastify.post("/admin/ongs/:id/aprovar", { preHandler: ensureAdmin }, aprovarOng);
  fastify.post("/admin/ongs/:id/rejeitar", { preHandler: ensureAdmin }, rejeitarOng);
  fastify.get("/admin/documentos", { preHandler: ensureAdmin }, renderAdminDocumentosPage);
  fastify.post("/admin/documentos/:tipo/:id/aprovar", { preHandler: ensureAdmin }, aprovarDocumentoPerfil);
  fastify.post("/admin/documentos/:tipo/:id/rejeitar", { preHandler: ensureAdmin }, rejeitarDocumentoPerfil);
}
