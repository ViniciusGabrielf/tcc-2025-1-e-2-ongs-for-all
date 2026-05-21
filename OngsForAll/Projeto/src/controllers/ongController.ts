import { FastifyRequest, FastifyReply } from "fastify";
import * as ongService from "../services/ongService";
import * as notificacaoService from "../services/notificacaoService";
import { buildPagination, normalizePage } from "../utils/pagination";

const ONGS_PAGE_SIZE = 9;

export async function renderOngsPage(request: FastifyRequest, reply: FastifyReply) {
  const session = request.session.user;
  const { busca, pagina } = request.query as { busca?: string; pagina?: string };
  const isOngDashboard = session?.tipo === "ong";
  const requestedPage = normalizePage(pagina);
  let result = await ongService.listOngs({
    search: busca,
    page: requestedPage,
    pageSize: ONGS_PAGE_SIZE,
    excludeOngId: isOngDashboard ? Number(session.id) : undefined,
  });

  const naoLidas = session
    ? (await notificacaoService.contarNaoLidas({
        tipoConta: session.tipo,
        id: Number(session.id),
      })).naoLidas
    : 0;

  const layout = !session
    ? "layouts/main"
    : session.tipo === "ong"
    ? "layouts/ongDashboardLayout"
    : "layouts/dashboardLayout";

  let pagination = buildPagination({
    basePath: "/ongs",
    currentPage: requestedPage,
    totalItems: result.total,
    pageSize: ONGS_PAGE_SIZE,
    extraParams: {
      busca: busca || undefined,
    },
  });

  if (pagination.currentPage !== requestedPage) {
    result = await ongService.listOngs({
      search: busca,
      page: pagination.currentPage,
      pageSize: ONGS_PAGE_SIZE,
      excludeOngId: isOngDashboard ? Number(session.id) : undefined,
    });
    pagination = buildPagination({
      basePath: "/ongs",
      currentPage: pagination.currentPage,
      totalItems: result.total,
      pageSize: ONGS_PAGE_SIZE,
      extraParams: {
        busca: busca || undefined,
      },
    });
  }

  return reply.view("/templates/usuario/ongs.hbs", {
    title: "Explorar ONGs",
    ongs: result.items,
    busca: busca || "",
    totalOngs: result.total,
    user: session,
    naoLidas,
    isOngDashboard,
    pagination,
    loginRedirectUrl: `/login?redirect=${encodeURIComponent(request.raw.url || "/ongs")}`,
  }, { layout });
}
