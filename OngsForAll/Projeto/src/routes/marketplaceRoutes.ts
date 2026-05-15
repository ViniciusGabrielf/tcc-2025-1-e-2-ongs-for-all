import { FastifyInstance } from "fastify";
import {
  renderMarketplacePage,
  renderDetalheItemPage,
  renderAdminMarketplacePage,
  aprovarItem,
  rejeitarItem,
  ativarEmpresaMarketplace,
  bloquearEmpresaMarketplace,
  aprovarCnpjEmpresa,
  rejeitarCnpjEmpresa,
} from "../controllers/marketplaceController";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import { ensureAdmin } from "../middlewares/ensureAdmin";

export async function marketplaceRoutes(fastify: FastifyInstance) {
  // Vitrine pública
  fastify.get("/marketplace", { preHandler: ensureAuthenticated }, renderMarketplacePage);
  fastify.get("/marketplace/:id", { preHandler: ensureAuthenticated }, renderDetalheItemPage);

  // Admin
  fastify.get("/admin/marketplace", { preHandler: ensureAdmin }, renderAdminMarketplacePage);
  fastify.post("/admin/marketplace/itens/:id/aprovar", { preHandler: ensureAdmin }, aprovarItem);
  fastify.post("/admin/marketplace/itens/:id/rejeitar", { preHandler: ensureAdmin }, rejeitarItem);
  fastify.post("/admin/empresas/:id/ativar", { preHandler: ensureAdmin }, ativarEmpresaMarketplace);
  fastify.post("/admin/empresas/:id/bloquear", { preHandler: ensureAdmin }, bloquearEmpresaMarketplace);
  fastify.post("/admin/empresas/:id/cnpj/aprovar", { preHandler: ensureAdmin }, aprovarCnpjEmpresa);
  fastify.post("/admin/empresas/:id/cnpj/rejeitar", { preHandler: ensureAdmin }, rejeitarCnpjEmpresa);
}
