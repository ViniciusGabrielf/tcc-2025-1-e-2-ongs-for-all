import { FastifyRequest, FastifyReply } from "fastify";
import * as ongService from "../services/ongService";
import * as notificacaoService from "../services/notificacaoService";
import { buildPagination, normalizePage } from "../utils/pagination";
import * as perfilRepo from "../repositories/perfilRepository";
import * as reviewService from "../services/ongReviewsService";

function getLayout(session: any): string {
  if (!session) return "layouts/main";
  if (session.tipo === "ong") return "layouts/ongDashboardLayout";
  if (session.tipo === "empresa") return "layouts/empresaDashboardLayout";
  return "layouts/dashboardLayout";
}

async function getNaoLidas(session: any): Promise<number> {
  if (!session) return 0;
  const { naoLidas } = await notificacaoService.contarNaoLidas({
    tipoConta: session.tipo,
    id: Number(session.id),
  });
  return naoLidas;
}

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

export async function renderOngDetalhePage(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const ongId = Number(id);
  const session = request.session.user;
  const naoLidas = await getNaoLidas(session);
  const layout = getLayout(session);

  if (!ongId || isNaN(ongId)) {
    return reply.status(404).view("/templates/ong/detalhe.hbs", {
      title: "ONG não encontrada",
      ong: null,
      reviews: null,
      user: session ?? null,
      naoLidas,
      podeAvaliar: false,
      sucesso: false,
      erro: null,
      loginRedirectUrl: null,
    }, { layout });
  }

  const ong = await perfilRepo.findOngById(ongId);
  if (!ong) {
    return reply.status(404).view("/templates/ong/detalhe.hbs", {
      title: "ONG não encontrada",
      ong: null,
      reviews: null,
      user: session ?? null,
      naoLidas,
      podeAvaliar: false,
      sucesso: false,
      erro: null,
      loginRedirectUrl: null,
    }, { layout });
  }

  const reviews = await reviewService.getReviewData(
    ongId,
    session ? Number(session.id) : undefined,
    session?.tipo
  );

  const podeAvaliar = !!session && session.tipo !== "ong";
  const sucesso = (request.query as any)?.sucesso === "1";
  const erro = (request.query as any)?.erro ?? null;

  return reply.view("/templates/ong/detalhe.hbs", {
    title: `${ong.nome}`,
    ong,
    reviews,
    user: session ?? null,
    naoLidas,
    podeAvaliar,
    sucesso,
    erro,
    loginRedirectUrl: encodeURIComponent(`/ongs/${ongId}`),
  }, { layout });
}
