import { FastifyRequest, FastifyReply } from "fastify";
import * as gerencialService from "../services/relatorioGerencialService";
import * as notificacaoService from "../services/notificacaoService";

const LAYOUT = "layouts/ongDashboardLayout";

const SECOES = [
  { href: "/ong/relatorios/gerenciais",               label: "Visão geral" },
  { href: "/ong/relatorios/gerenciais/necessidades",  label: "Necessidades" },
  { href: "/ong/relatorios/gerenciais/doacoes",       label: "Doações" },
  { href: "/ong/relatorios/gerenciais/voluntariado",  label: "Voluntariado" },
  { href: "/ong/relatorios/gerenciais/atividades",    label: "Atividades" },
  { href: "/ong/relatorios/gerenciais/impacto",       label: "Impacto" },
];

async function getNaoLidas(user: { tipo: string; id: number | string }) {
  const { naoLidas } = await notificacaoService.contarNaoLidas({
    tipoConta: user.tipo as "usuario" | "ong",
    id: Number(user.id),
  });
  return naoLidas;
}

function getOngId(request: FastifyRequest): number | null {
  const u = request.session.user;
  if (!u || u.tipo !== "ong") return null;
  return Number(u.id);
}

function buildSecoes(current: string) {
  return SECOES.map(s => ({ ...s, ativa: s.href === current }));
}

function getFiltros(query: any) {
  return {
    de:       (query.de       as string) || "",
    ate:      (query.ate      as string) || "",
    tipo:     (query.tipo     as string) || "",
    categoria:(query.categoria as string) || "",
    status:   (query.status   as string) || "",
    busca:    (query.busca    as string) || "",
  };
}

// ─── Visão Geral ──────────────────────────────────────────────────────────────

export async function renderVisaoGeralPage(request: FastifyRequest, reply: FastifyReply) {
  const ongId = getOngId(request);
  if (!ongId) return reply.redirect("/login");

  const [naoLidas, resumo] = await Promise.all([
    getNaoLidas(request.session.user as any),
    gerencialService.getVisaoGeral(ongId),
  ]);

  return reply.view("/templates/relatorios/gerenciais/index.hbs", {
    user:    request.session.user,
    naoLidas,
    title:   "Relatórios gerenciais",
    secoes:  buildSecoes("/ong/relatorios/gerenciais"),
    resumo,
  }, { layout: LAYOUT });
}

// ─── Necessidades ─────────────────────────────────────────────────────────────

export async function renderNecessidadesPage(request: FastifyRequest, reply: FastifyReply) {
  const ongId = getOngId(request);
  if (!ongId) return reply.redirect("/login");

  const filtros = getFiltros(request.query);

  const [naoLidas, resultado] = await Promise.all([
    getNaoLidas(request.session.user as any),
    gerencialService.getRelatorioNecessidades(ongId, filtros),
  ]);

  return reply.view("/templates/relatorios/gerenciais/necessidades.hbs", {
    user:       request.session.user,
    naoLidas,
    title:      "Relatório de Necessidades",
    secoes:     buildSecoes("/ong/relatorios/gerenciais/necessidades"),
    dados:      resultado.dados,
    resumo:     resultado.resumo,
    categorias: resultado.categorias,
    filtros:    resultado.filtros,
    filtroAtivo: filtros,
  }, { layout: LAYOUT });
}

// ─── Doações ──────────────────────────────────────────────────────────────────

export async function renderDoacoesPage(request: FastifyRequest, reply: FastifyReply) {
  const ongId = getOngId(request);
  if (!ongId) return reply.redirect("/login");

  const filtros = getFiltros(request.query);

  const [naoLidas, resultado] = await Promise.all([
    getNaoLidas(request.session.user as any),
    gerencialService.getRelatorioDoacoes(ongId, filtros),
  ]);

  return reply.view("/templates/relatorios/gerenciais/doacoes.hbs", {
    user:    request.session.user,
    naoLidas,
    title:   "Relatório de Doações",
    secoes:  buildSecoes("/ong/relatorios/gerenciais/doacoes"),
    dados:   resultado.dados,
    resumo:  resultado.resumo,
    filtros: resultado.filtros,
    filtroAtivo: filtros,
  }, { layout: LAYOUT });
}

// ─── Voluntariado ─────────────────────────────────────────────────────────────

export async function renderVoluntariadoPage(request: FastifyRequest, reply: FastifyReply) {
  const ongId = getOngId(request);
  if (!ongId) return reply.redirect("/login");

  const filtros = getFiltros(request.query);

  const [naoLidas, resultado] = await Promise.all([
    getNaoLidas(request.session.user as any),
    gerencialService.getRelatorioVoluntariado(ongId, filtros),
  ]);

  return reply.view("/templates/relatorios/gerenciais/voluntariado.hbs", {
    user:    request.session.user,
    naoLidas,
    title:   "Relatório de Voluntariado",
    secoes:  buildSecoes("/ong/relatorios/gerenciais/voluntariado"),
    dados:   resultado.dados,
    resumo:  resultado.resumo,
    filtros: resultado.filtros,
    filtroAtivo: filtros,
  }, { layout: LAYOUT });
}

// ─── Atividades ───────────────────────────────────────────────────────────────

export async function renderAtividadesPage(request: FastifyRequest, reply: FastifyReply) {
  const ongId = getOngId(request);
  if (!ongId) return reply.redirect("/login");

  const filtros = getFiltros(request.query);

  const [naoLidas, resultado] = await Promise.all([
    getNaoLidas(request.session.user as any),
    gerencialService.getRelatorioAtividades(ongId, filtros),
  ]);

  return reply.view("/templates/relatorios/gerenciais/atividades.hbs", {
    user:    request.session.user,
    naoLidas,
    title:   "Relatório de Atividades",
    secoes:  buildSecoes("/ong/relatorios/gerenciais/atividades"),
    dados:   resultado.dados,
    filtros: resultado.filtros,
    filtroAtivo: filtros,
  }, { layout: LAYOUT });
}

// ─── Impacto ──────────────────────────────────────────────────────────────────

export async function renderImpactoPage(request: FastifyRequest, reply: FastifyReply) {
  const ongId = getOngId(request);
  if (!ongId) return reply.redirect("/login");

  const filtros = getFiltros(request.query);

  const [naoLidas, resultado] = await Promise.all([
    getNaoLidas(request.session.user as any),
    gerencialService.getRelatorioImpacto(ongId, filtros),
  ]);

  const evolucaoLabels = JSON.stringify(
    resultado.dados.evolucaoMensal.map((m: any) => m.mes_label)
  );
  const evolucaoTotal = JSON.stringify(
    resultado.dados.evolucaoMensal.map((m: any) => Number(m.total))
  );
  const evolucaoConf  = JSON.stringify(
    resultado.dados.evolucaoMensal.map((m: any) => Number(m.confirmadas))
  );
  const catLabels = JSON.stringify(
    resultado.dados.categoriasAtendidas.map((c: any) => c.categoria)
  );
  const catTotais = JSON.stringify(
    resultado.dados.categoriasAtendidas.map((c: any) => Number(c.total))
  );

  return reply.view("/templates/relatorios/gerenciais/impacto.hbs", {
    user:    request.session.user,
    naoLidas,
    title:   "Relatório de Impacto",
    secoes:  buildSecoes("/ong/relatorios/gerenciais/impacto"),
    dados:   resultado.dados,
    filtros: resultado.filtros,
    filtroAtivo: filtros,
    evolucaoLabels,
    evolucaoTotal,
    evolucaoConf,
    catLabels,
    catTotais,
    temEvolucao:    resultado.dados.evolucaoMensal.length > 0,
    temCategorias:  resultado.dados.categoriasAtendidas.length > 0,
  }, { layout: LAYOUT });
}

// ─── Exportar CSV ─────────────────────────────────────────────────────────────

export async function exportarCsv(request: FastifyRequest, reply: FastifyReply) {
  const ongId = getOngId(request);
  if (!ongId) return reply.code(401).send("Não autorizado.");

  const q       = request.query as any;
  const secao   = (q.secao as string) || "necessidades";
  const filtros = getFiltros(q);

  const resultado = await gerencialService.gerarCsv(ongId, secao, filtros);

  if (!resultado) {
    return reply.code(400).send("Seção inválida para exportação.");
  }

  reply.header("Content-Type", "text/csv; charset=utf-8");
  reply.header("Content-Disposition", `attachment; filename="${resultado.nome}"`);
  return reply.send("﻿" + resultado.conteudo); // BOM para Excel
}
