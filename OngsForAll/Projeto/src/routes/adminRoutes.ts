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
import {
  listarApoiadores,
  renderFormNovo,
  renderFormEditar,
  criarApoiador,
  atualizarApoiador,
  ativarApoiador,
  pausarApoiador,
  encerrarApoiador,
  apiApoiadoresPublico,
} from "../controllers/apoiadoresAdminController";
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

  // Auth
  fastify.get("/admin/login", renderAdminLoginPage);
  fastify.post("/admin/login", { preHandler: adminLoginRateLimit }, handleAdminLogin);

  // ONGs
  fastify.get("/admin/ongs", { preHandler: ensureAdmin }, renderAdminOngsPage);
  fastify.post("/admin/ongs/:id/aprovar", { preHandler: ensureAdmin }, aprovarOng);
  fastify.post("/admin/ongs/:id/rejeitar", { preHandler: ensureAdmin }, rejeitarOng);

  // Documentos
  fastify.get("/admin/documentos", { preHandler: ensureAdmin }, renderAdminDocumentosPage);
  fastify.post("/admin/documentos/:tipo/:id/aprovar", { preHandler: ensureAdmin }, aprovarDocumentoPerfil);
  fastify.post("/admin/documentos/:tipo/:id/rejeitar", { preHandler: ensureAdmin }, rejeitarDocumentoPerfil);

  // Apoiadores — painel admin
  fastify.get("/admin/apoiadores",             { preHandler: ensureAdmin }, listarApoiadores);
  fastify.get("/admin/apoiadores/novo",         { preHandler: ensureAdmin }, renderFormNovo);
  fastify.post("/admin/apoiadores",             { preHandler: ensureAdmin }, criarApoiador);
  fastify.get("/admin/apoiadores/:id/editar",   { preHandler: ensureAdmin }, renderFormEditar);
  fastify.post("/admin/apoiadores/:id",         { preHandler: ensureAdmin }, atualizarApoiador);
  fastify.post("/admin/apoiadores/:id/ativar",  { preHandler: ensureAdmin }, ativarApoiador);
  fastify.post("/admin/apoiadores/:id/pausar",  { preHandler: ensureAdmin }, pausarApoiador);
  fastify.post("/admin/apoiadores/:id/encerrar",{ preHandler: ensureAdmin }, encerrarApoiador);

  // API pública — usada pelo rodapé (sem autenticação)
  fastify.get("/api/apoiadores/publico", apiApoiadoresPublico);
}
