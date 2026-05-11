import { FastifyInstance } from "fastify";
import {
  renderCadastroEmpresaPage,
  cadastrarEmpresa,
  renderDashboardEmpresa,
  renderPlanosEmpresaPage,
  alterarPlanoEmpresa,
  renderNecessidadesParaApoiar,
  apoiarNecessidade,
  renderVitrineEmpresa,
  renderNovoItemPage,
  criarItemMarketplace,
  renderEditarItemPage,
  editarItemMarketplace,
  desativarItemMarketplace,
  reenviarItemMarketplace,
  renderPerfilEmpresaPage,
  atualizarPerfilEmpresa,
  renderNotificacoesEmpresa,
} from "../controllers/empresaController";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import { ensureEmpresa } from "../middlewares/ensureEmpresa";

export async function empresaRoutes(fastify: FastifyInstance) {
  // Cadastro (público)
  fastify.get("/register-empresa", renderCadastroEmpresaPage);
  fastify.post("/register-empresa", cadastrarEmpresa);

  // Dashboard
  fastify.get("/empresa/dashboard", { preHandler: [ensureAuthenticated, ensureEmpresa] }, renderDashboardEmpresa);

  // Planos
  fastify.get("/empresa/plano", { preHandler: [ensureAuthenticated, ensureEmpresa] }, renderPlanosEmpresaPage);
  fastify.post("/empresa/plano", { preHandler: [ensureAuthenticated, ensureEmpresa] }, alterarPlanoEmpresa);

  // Necessidades para apoiar
  fastify.get("/empresa/necessidades", { preHandler: [ensureAuthenticated, ensureEmpresa] }, renderNecessidadesParaApoiar);
  fastify.post("/empresa/necessidades/:id/apoiar", { preHandler: [ensureAuthenticated, ensureEmpresa] }, apoiarNecessidade);

  // Vitrine da empresa (gerenciar itens)
  fastify.get("/empresa/vitrine", { preHandler: [ensureAuthenticated, ensureEmpresa] }, renderVitrineEmpresa);
  fastify.get("/empresa/vitrine/novo", { preHandler: [ensureAuthenticated, ensureEmpresa] }, renderNovoItemPage);
  fastify.post("/empresa/vitrine/novo", { preHandler: [ensureAuthenticated, ensureEmpresa] }, criarItemMarketplace);
  fastify.get("/empresa/vitrine/:id/editar", { preHandler: [ensureAuthenticated, ensureEmpresa] }, renderEditarItemPage);
  fastify.post("/empresa/vitrine/:id/editar", { preHandler: [ensureAuthenticated, ensureEmpresa] }, editarItemMarketplace);
  fastify.post("/empresa/vitrine/:id/desativar", { preHandler: [ensureAuthenticated, ensureEmpresa] }, desativarItemMarketplace);
  fastify.post("/empresa/vitrine/:id/reenviar", { preHandler: [ensureAuthenticated, ensureEmpresa] }, reenviarItemMarketplace);

  // Perfil
  fastify.get("/empresa/perfil", { preHandler: [ensureAuthenticated, ensureEmpresa] }, renderPerfilEmpresaPage);
  fastify.post("/empresa/perfil", { preHandler: [ensureAuthenticated, ensureEmpresa] }, atualizarPerfilEmpresa);

  // Notificações
  fastify.get("/empresa/notificacoes", { preHandler: [ensureAuthenticated, ensureEmpresa] }, renderNotificacoesEmpresa);
}
