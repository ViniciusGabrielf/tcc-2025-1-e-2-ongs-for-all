import { FastifyRequest, FastifyReply } from "fastify";
import * as notificacaoService from "../services/notificacaoService";
import * as atividadesService from "../services/atividadesService";
import { buildPagination, normalizePage } from "../utils/pagination";

export async function renderNotificacoesPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;

  if (!sessionUser) {
    return reply.redirect("/login");
  }

  const PAGE_SIZE = 10;
  const currentPage = normalizePage((request.query as any).pagina);

  try {
    const { notificacoes: todas, naoLidas } = await notificacaoService.listarNotificacoes({
      tipoConta: sessionUser.tipo,
      id: Number(sessionUser.id),
    });

    if (process.env.NODE_ENV === "test") {
      return reply.send({ user: sessionUser, notificacoes: todas, naoLidas });
    }

    const pagination = buildPagination({
      basePath: "/notificacoes",
      currentPage,
      totalItems: todas.length,
      pageSize: PAGE_SIZE,
    });

    const notificacoes = todas.slice(
      (pagination.currentPage - 1) * PAGE_SIZE,
      pagination.currentPage * PAGE_SIZE
    );

    const layout =
      sessionUser.tipo === "ong"
        ? "layouts/ongDashboardLayout"
        : "layouts/dashboardLayout";
    const isOngDashboard = sessionUser.tipo === "ong";

    return reply.view(
      "/templates/notificacoes/notificacoes.hbs",
      { user: sessionUser, notificacoes, naoLidas, isOngDashboard, pagination },
      { layout }
    );
  } catch (error) {
    console.error("Erro ao carregar notificações:", error);
    return reply.code(500).send("Erro ao carregar notificações.");
  }
}

const PAGE_SIZE_FEED = 10;

export async function renderFeedPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser) return reply.redirect("/login");

  try {
    const { status, pagina } = request.query as { status?: string; pagina?: string };
    const statusValidos = ["pendente", "aceito", "recebido", "cancelado"];
    const statusFiltro = status && statusValidos.includes(status) ? status : undefined;
    const currentPage = normalizePage(pagina);

    const { naoLidas } = await notificacaoService.contarNaoLidas({
      tipoConta: sessionUser.tipo,
      id: Number(sessionUser.id),
    });

    const dados = sessionUser.tipo === "ong"
      ? await atividadesService.getAtividadesOng(Number(sessionUser.id), statusFiltro)
      : await atividadesService.getAtividades(Number(sessionUser.id), statusFiltro);

    const pagination = buildPagination({
      basePath: "/feed",
      currentPage,
      totalItems: dados.total,
      pageSize: PAGE_SIZE_FEED,
      extraParams: { status: statusFiltro },
    });

    const atividades = dados.atividades.slice(
      (pagination.currentPage - 1) * PAGE_SIZE_FEED,
      pagination.currentPage * PAGE_SIZE_FEED
    );

    const layout = sessionUser.tipo === "ong"
      ? "layouts/ongDashboardLayout"
      : "layouts/dashboardLayout";

    return reply.view(
      "/templates/notificacoes/feed.hbs",
      {
        user: sessionUser,
        naoLidas,
        ...dados,
        atividades,
        pagination,
        isOng: sessionUser.tipo === "ong",
      },
      { layout }
    );
  } catch (error) {
    console.error("Erro ao carregar atividades:", error);
    return reply.code(500).send("Erro ao carregar atividades.");
  }
}

export async function marcarNotificacaoComoLida(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;

  if (!sessionUser) {
    return reply.redirect("/login");
  }

  const { id } = request.params as { id: string };

  try {
    await notificacaoService.marcarComoLida(Number(id));
    return reply.redirect("/notificacoes");
  } catch (error) {
    console.error("Erro ao marcar notificação como lida:", error);
    return reply.code(500).send("Erro ao atualizar notificação.");
  }
}

export async function marcarTodasNotificacoesComoLidas(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;

  if (!sessionUser) {
    return reply.redirect("/login");
  }

  try {
    await notificacaoService.marcarTodasComoLidas({
      destinatarioId: Number(sessionUser.id),
      destinatarioTipo: sessionUser.tipo,
    });
    return reply.redirect("/notificacoes");
  } catch (error) {
    console.error("Erro ao marcar todas as notificações como lidas:", error);
    return reply.code(500).send("Erro ao atualizar notificações.");
  }
}
