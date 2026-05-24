import { FastifyInstance } from "fastify";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import { ensureOng } from "../middlewares/ensureOng";
import {
  renderListaRelatoriosPage,
  renderNovoRelatorioPage,
  criarRelatorio,
  renderDetalheRelatorioPage,
} from "../controllers/relatorioController";
import {
  renderVisaoGeralPage,
  renderNecessidadesPage,
  renderDoacoesPage,
  renderVoluntariadoPage,
  renderAtividadesPage,
  renderImpactoPage,
  exportarCsv,
} from "../controllers/relatorioGerencialController";

export async function relatorioRoutes(fastify: FastifyInstance) {
  // ── Relatórios de impacto (existentes) ─────────────────────────────────────
  fastify.get(
    "/ong/relatorios",
    { preHandler: [ensureAuthenticated, ensureOng] },
    renderListaRelatoriosPage
  );

  fastify.get(
    "/ong/relatorios/novo",
    { preHandler: [ensureAuthenticated, ensureOng] },
    renderNovoRelatorioPage
  );

  fastify.post(
    "/ong/relatorios",
    { preHandler: [ensureAuthenticated, ensureOng] },
    criarRelatorio
  );

  fastify.get(
    "/relatorios/:id",
    { preHandler: ensureAuthenticated },
    renderDetalheRelatorioPage
  );

  // ── Relatórios gerenciais (novos) ───────────────────────────────────────────
  const ong = [ensureAuthenticated, ensureOng];

  fastify.get("/ong/relatorios/gerenciais",                      { preHandler: ong }, renderVisaoGeralPage);
  fastify.get("/ong/relatorios/gerenciais/necessidades",         { preHandler: ong }, renderNecessidadesPage);
  fastify.get("/ong/relatorios/gerenciais/doacoes",              { preHandler: ong }, renderDoacoesPage);
  fastify.get("/ong/relatorios/gerenciais/voluntariado",         { preHandler: ong }, renderVoluntariadoPage);
  fastify.get("/ong/relatorios/gerenciais/atividades",           { preHandler: ong }, renderAtividadesPage);
  fastify.get("/ong/relatorios/gerenciais/impacto",              { preHandler: ong }, renderImpactoPage);
  fastify.get("/ong/relatorios/gerenciais/exportar.csv",         { preHandler: ong }, exportarCsv);
}
