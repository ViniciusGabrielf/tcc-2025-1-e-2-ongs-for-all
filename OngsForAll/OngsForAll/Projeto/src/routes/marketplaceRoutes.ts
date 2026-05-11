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

export async function marketplaceRoutes(fastify: FastifyInstance) {
  // Vitrine pública
  fastify.get("/marketplace", { preHandler: ensureAuthenticated }, renderMarketplacePage);
  fastify.get("/marketplace/:id", { preHandler: ensureAuthenticated }, renderDetalheItemPage);

  // Admin
  fastify.get("/admin/marketplace", renderAdminMarketplacePage);
  fastify.post("/admin/marketplace/itens/:id/aprovar", aprovarItem);
  fastify.post("/admin/marketplace/itens/:id/rejeitar", rejeitarItem);
  fastify.post("/admin/empresas/:id/ativar", ativarEmpresaMarketplace);
  fastify.post("/admin/empresas/:id/bloquear", bloquearEmpresaMarketplace);
  fastify.post("/admin/empresas/:id/cnpj/aprovar", aprovarCnpjEmpresa);
  fastify.post("/admin/empresas/:id/cnpj/rejeitar", rejeitarCnpjEmpresa);
}
