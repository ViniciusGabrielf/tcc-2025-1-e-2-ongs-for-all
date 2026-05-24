import { FastifyRequest, FastifyReply } from "fastify";
import * as dashboardService from "../services/dashboardService";
import * as notificacaoService from "../services/notificacaoService";

// =======================
// DASHBOARD - USUÁRIO
// =======================
export async function renderDashBoardPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const sessionUser = request.session.user;

    if (!sessionUser) {
      return reply.redirect("/login");
    }

    const { de, ate, interesse } = request.query as { de?: string; ate?: string; interesse?: string };
    const data = await dashboardService.getDashboardData(Number(sessionUser.id), de, ate);
    if (process.env.NODE_ENV === "test") {
      return reply.send({ user: sessionUser, ...data });
    }

    const { naoLidas } = await notificacaoService.listarNotificacoes({
      tipoConta: sessionUser.tipo,
      id: Number(sessionUser.id),
    });

    return reply.view(
      "/templates/usuario/dashboard.hbs",
      {
        user: sessionUser,
        naoLidas,
        // cards
        totalInteresses: data.totalInteresses ?? 0,
        entregasPendentes: data.entregasPendentes ?? 0,
        qtdTipos: data.qtdTipos ?? 0,
        qtdMesesComAtividade: data.qtdMesesComAtividade ?? 0,

        // métricas de impacto
        necessidadesApoiadas: data.necessidadesApoiadas ?? 0,
        ongsApoiadas: data.ongsApoiadas ?? 0,
        interessesCriados: data.interessesCriados ?? 0,
        interessesRecebidos: data.interessesRecebidos ?? 0,
        atividadesRecentes: data.atividadesRecentes ?? [],

        // filtro de período
        filtroDe: de ?? "",
        filtroAte: ate ?? "",

        // feedback de ações
        sucessoInteresse: interesse === "1",
      },
      { layout: "layouts/dashboardLayout" }
    );
  } catch (error) {
    console.error("Erro ao renderizar dashboard do usuário:", error);
    return reply.status(500).send("Erro ao carregar dashboard do usuário");
  }
}

// =======================
// DASHBOARD - ONG
// =======================
export async function renderDashboardOngPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const sessionUser = request.session.user;

    if (!sessionUser) {
      return reply.redirect("/login");
    }

    const ongId = Number(sessionUser.id);
    const { de, ate } = request.query as { de?: string; ate?: string };
    const data = await dashboardService.getOngDashboardData(ongId, de, ate);

    if (process.env.NODE_ENV === "test") {
      return reply.send({ user: sessionUser, ...data });
    }

    const { naoLidas } = await notificacaoService.listarNotificacoes({
      tipoConta: sessionUser.tipo,
      id: Number(sessionUser.id),
    });

    return reply.view(
      "/templates/ong/dashboard.hbs",
      {
        user: sessionUser,
        isOng: true,
        naoLidas,

        // cards
        totalRecebido: Number(data.totalRecebido ?? 0).toFixed(2),
        qtdDoacoes: data.qtdDoacoes ?? 0,
        qtdDoadores: data.qtdDoadores ?? 0,

        // tabela
        ultimasDoacoes: data.ultimasDoacoes ?? [],

        // métricas de impacto
        necessidadesCriadas: data.necessidadesCriadas ?? 0,
        necessidadesConcluidas: data.necessidadesConcluidas ?? 0,
        taxaConclusao: data.taxaConclusao ?? "0.0",
        interessesPendentes: data.interessesPendentes ?? 0,
        interessesAceitos: data.interessesAceitos ?? 0,
        interessesRecebidos: data.interessesRecebidos ?? 0,
        totalInteressesOng: (data.interessesPendentes ?? 0) + (data.interessesAceitos ?? 0) + (data.interessesRecebidos ?? 0),
        entregasPendentesOng: data.interessesAceitos ?? 0,
        necessidadesQuaseCompletas: data.necessidadesQuaseCompletas ?? [],
        necessidadeMaisAvancada: data.necessidadeMaisAvancada ?? null,

        // filtro de período
        filtroDe: de ?? "",
        filtroAte: ate ?? "",
      },
      { layout: "layouts/ongDashboardLayout" }
    );
  } catch (error) {
    console.error("Erro ao renderizar dashboard da ONG:", error);
    return reply.status(500).send("Erro ao carregar dashboard da ONG");
  }
}

// =======================
// CONQUISTAS (GAMIFICAÇÃO)
// =======================
export async function renderConquistasPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  return reply.redirect("/dashboard");
}

// =======================
// TOTAL POR ONG
// =======================
export async function totalDoacoesPorOng(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const { dados } = await dashboardService.getTotalPorOng();

    if (process.env.NODE_ENV === "test") {
      return reply.send({ dados });
    }

    return reply.view(
      "/templates/doacao/totalPorOng.hbs",
      {
        user: request.session.user,
        isOng: true,
        dados,
      },
      { layout: "layouts/ongDashboardLayout" }
    );
  } catch (error) {
    console.error("Erro ao buscar totais das ONGs:", error);
    return reply.status(500).send("Erro ao buscar totais das ONGs");
  }
}
