import { FastifyInstance } from "fastify";
import {
  renderCadastroEmpresaPage,
  cadastrarEmpresa,
  renderDashboardEmpresa,
  renderApoiosEmpresa,
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
  renderExplorarOngsEmpresa,
} from "../controllers/empresaController";
import {
  renderListaMensagensEmpresa,
  renderConversa,
  enviarMensagem,
} from "../controllers/mensagemController";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import { ensureEmpresa } from "../middlewares/ensureEmpresa";

export async function empresaRoutes(fastify: FastifyInstance) {
  // Cadastro (público)
  fastify.get("/register-empresa", renderCadastroEmpresaPage);
  fastify.post("/register-empresa", cadastrarEmpresa);

  // Dashboard
  fastify.get("/empresa/dashboard", { preHandler: [ensureAuthenticated, ensureEmpresa] }, renderDashboardEmpresa);

  // Meus apoios
  fastify.get("/empresa/apoios", { preHandler: [ensureAuthenticated, ensureEmpresa] }, renderApoiosEmpresa);

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

  // Explorar ONGs
  fastify.get("/empresa/ongs", { preHandler: [ensureAuthenticated, ensureEmpresa] }, renderExplorarOngsEmpresa);

  // Notificações
  fastify.get("/empresa/notificacoes", { preHandler: [ensureAuthenticated, ensureEmpresa] }, renderNotificacoesEmpresa);

  // Mensagens
  fastify.get("/empresa/mensagens", { preHandler: [ensureAuthenticated, ensureEmpresa] }, renderListaMensagensEmpresa);
  fastify.get("/empresa/mensagens/:id", { preHandler: [ensureAuthenticated, ensureEmpresa] }, renderConversa);
  fastify.post("/empresa/mensagens/:id/enviar", { preHandler: [ensureAuthenticated, ensureEmpresa] }, enviarMensagem);
}
