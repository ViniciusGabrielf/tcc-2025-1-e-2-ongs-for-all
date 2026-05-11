import { FastifyInstance } from "fastify";
import {
  renderAdminLoginPage,
  handleAdminLogin,
  renderAdminOngsPage,
  aprovarOng,
  rejeitarOng,
} from "../controllers/adminController";

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.get("/admin/login", renderAdminLoginPage);
  fastify.post("/admin/login", handleAdminLogin);
  fastify.get("/admin/ongs", renderAdminOngsPage);
  fastify.post("/admin/ongs/:id/aprovar", aprovarOng);
  fastify.post("/admin/ongs/:id/rejeitar", rejeitarOng);
}
