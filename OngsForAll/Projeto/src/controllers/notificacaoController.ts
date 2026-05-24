import { FastifyRequest, FastifyReply } from "fastify";
import * as notificacaoService from "../services/notificacaoService";
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

const TIPOS_FEED = [
  { value: "", label: "Todos os tipos" },
  { value: "nova_necessidade", label: "Nova necessidade" },
  { value: "novo_interesse", label: "Novo interesse" },
  { value: "interesse_aceito", label: "Interesse aceito" },
  { value: "interesse_recebido", label: "Interesse recebido" },
  { value: "interesse_cancelado", label: "Interesse cancelado" },
  { value: "meta_atingida", label: "Meta atingida" },
];

export async function renderFeedPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser) return reply.redirect("/login");

  try {
    const query = request.query as {
      ong?: string;
      tipo?: string;
      de?: string;
      ate?: string;
    };

    const filtroOngId =
      query.ong && !isNaN(Number(query.ong)) && Number(query.ong) > 0
        ? Number(query.ong)
        : undefined;
    const filtroTipo = query.tipo || undefined;
    const filtroDe = query.de || undefined;
    const filtroAte = query.ate || undefined;

    // Backend date range validation
    let erroPeriodo: string | null = null;
    let filtroDeEfetivo = filtroDe;
    let filtroAteEfetivo = filtroAte;
    if (filtroDe && filtroAte && filtroDe > filtroAte) {
      erroPeriodo = 'A data de início não pode ser posterior à data de término.';
      filtroDeEfetivo = undefined;
      filtroAteEfetivo = undefined;
    }

    const temFiltro = !!(filtroOngId || filtroTipo || filtroDe || filtroAte);

    const { naoLidas } = await notificacaoService.contarNaoLidas({
      tipoConta: sessionUser.tipo,
      id: Number(sessionUser.id),
    });

    const [eventos, ongs] = await Promise.all([
      notificacaoService.listarFeed({
        limit: 60,
        ongId: filtroOngId,
        tipo: filtroTipo,
        de: filtroDeEfetivo,
        ate: filtroAteEfetivo,
      }),
      notificacaoService.listarOngsParaFiltro(),
    ]);

    const filtroOngOptions = ongs.map((o: any) => ({
      id: o.id,
      nome: o.nome,
      selected: o.id === filtroOngId,
    }));

    const filtroTipoOptions = TIPOS_FEED.map((t) => ({
      ...t,
      selected: t.value === (filtroTipo || ""),
    }));

    const layout =
      sessionUser.tipo === "ong"
        ? "layouts/ongDashboardLayout"
        : "layouts/dashboardLayout";
    const isOngDashboard = sessionUser.tipo === "ong";

    return reply.view(
      "/templates/notificacoes/feed.hbs",
      {
        user: sessionUser,
        eventos,
        naoLidas,
        totalEventos: eventos.length,
        filtroOngOptions,
        filtroTipoOptions,
        filtroDe: filtroDe ?? "",
        filtroAte: filtroAte ?? "",
        temFiltro,
        erroPeriodo,
        isOngDashboard,
      },
      { layout }
    );
  } catch (error) {
    console.error("Erro ao carregar feed:", error);
    return reply.code(500).send("Erro ao carregar feed de atividades.");
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
