import { FastifyRequest, FastifyReply } from "fastify";
import * as dashboardService from "../services/dashboardService";
import * as notificacaoService from "../services/notificacaoService";
import * as atividadesService from "../services/atividadesService";
import { buildPagination, normalizePage } from "../utils/pagination";

const PAGE_SIZE_DASHBOARD = 5;
const STATUS_VALIDOS_DASHBOARD = ["pendente", "aceito", "recebido", "cancelado"];

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

    const { status, pagina, interesse, busca } = request.query as {
      status?: string;
      pagina?: string;
      interesse?: string;
      busca?: string;
    };

    const statusFiltro = STATUS_VALIDOS_DASHBOARD.includes(status ?? "")
      ? status
      : undefined;
    const buscaAtual = busca?.trim() ?? "";
    const currentPage = normalizePage(pagina);

    const dados = await atividadesService.getAtividades(
      Number(sessionUser.id),
      statusFiltro,
      buscaAtual || undefined
    );

    if (process.env.NODE_ENV === "test") {
      return reply.send({ user: sessionUser, ...dados });
    }

    const pagination = buildPagination({
      basePath: "/dashboard",
      currentPage,
      totalItems: dados.total,
      pageSize: PAGE_SIZE_DASHBOARD,
      extraParams: { status: statusFiltro, busca: buscaAtual || undefined },
    });

    const atividades = dados.atividades.slice(
      (pagination.currentPage - 1) * PAGE_SIZE_DASHBOARD,
      pagination.currentPage * PAGE_SIZE_DASHBOARD
    );

    const { naoLidas } = await notificacaoService.listarNotificacoes({
      tipoConta: sessionUser.tipo,
      id: Number(sessionUser.id),
    });

    return reply.view(
      "/templates/usuario/dashboard.hbs",
      {
        user: sessionUser,
        naoLidas,
        ...dados,
        atividades,
        pagination,
        isOng: false,
        statusFiltro: statusFiltro ?? "",
        buscaAtual,
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
    const { de, ate, tipo, categoria, status, busca, pagina } = request.query as {
      de?: string; ate?: string; tipo?: string; categoria?: string; status?: string; busca?: string; pagina?: string;
    };
    const data = await dashboardService.getOngDashboardData(ongId, de, ate, { tipo, categoria, status, busca });

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

        // métricas de necessidades
        necessidadesCriadas: data.necessidadesCriadas ?? 0,
        necessidadesAbertas: data.necessidadesAbertas ?? 0,
        necessidadesConcluidas: data.necessidadesConcluidas ?? 0,
        taxaConclusao: data.taxaConclusao ?? "0.0",

        // métricas de interesses
        interessesPendentes: data.interessesPendentes ?? 0,
        interessesAceitos: data.interessesAceitos ?? 0,
        interessesRecebidos: data.interessesRecebidos ?? 0,

        // lista de necessidades com paginação
        ...(() => {
          const PAGE_SIZE = 5;
          const allItems = (data.necessidadesList ?? []).map((n: any) => ({
            ...n,
            tipoLabel: n.tipo_necessidade === "bem" ? "Doação de bem"
              : n.tipo_necessidade === "servico" ? "Serviço"
              : n.tipo_necessidade === "voluntariado" ? "Voluntariado"
              : n.tipo_necessidade,
            statusLabel: n.status === "aberta" ? "Aberta"
              : n.status === "em_andamento" ? "Em andamento"
              : n.status === "concluida" ? "Concluída"
              : n.status === "cancelada" ? "Cancelada"
              : n.status,
            isAberta: n.status === "aberta",
            isEmAndamento: n.status === "em_andamento",
            isConcluida: n.status === "concluida",
            isCancelada: n.status === "cancelada",
          }));
          const pagination = buildPagination({
            basePath: "/dashboard/ong",
            currentPage: normalizePage(pagina),
            totalItems: allItems.length,
            pageSize: PAGE_SIZE,
            extraParams: { tipo, categoria, status, busca },
          });
          const necessidadesList = allItems.slice(
            (pagination.currentPage - 1) * PAGE_SIZE,
            pagination.currentPage * PAGE_SIZE
          );
          return { necessidadesList, pagination };
        })(),

        // filtros ativos
        filtroDe: de ?? "",
        filtroAte: ate ?? "",
        filtroTipo: tipo ?? "",
        filtroCategoria: categoria ?? "",
        filtroStatus: status ?? "",
        filtroBusca: busca ?? "",
        temFiltroAtivo: !!(de || ate || tipo || categoria || status || busca),
        filtroTipoBem: tipo === "bem",
        filtroTipoServico: tipo === "servico",
        filtroTipoVoluntariado: tipo === "voluntariado",
        filtroStatusAberta: status === "aberta",
        filtroStatusAndamento: status === "em_andamento",
        filtroStatusConcluida: status === "concluida",
        filtroStatusCancelada: status === "cancelada",
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
