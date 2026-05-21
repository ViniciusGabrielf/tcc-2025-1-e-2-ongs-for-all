import { FastifyRequest, FastifyReply } from "fastify";
import { NEED_CATALOG, getNeedFilterCategories } from "../constants/necessidadeCatalogo";
import * as necessidadeService from "../services/necessidadeService";
import * as notificacaoService from "../services/notificacaoService";
import * as ongAprovacaoRepo from "../repositories/ongAprovacaoRepository";
import { buildPagination, normalizePage } from "../utils/pagination";

const NECESSIDADES_PAGE_SIZE = 9;

function buildInteresseRedirectPath(necessidadeId: number) {
  return `/interesses/nova?necessidade_id=${necessidadeId}`;
}

function getSingleFormValue(value: unknown) {
  if (Array.isArray(value)) {
    const firstNonEmpty = value.find((item) => `${item ?? ""}`.trim() !== "");
    return `${firstNonEmpty ?? value[0] ?? ""}`;
  }

  return `${value ?? ""}`;
}

async function getNaoLidas(user: { tipo: string; id: number }) {
  const { naoLidas } = await notificacaoService.contarNaoLidas({
    tipoConta: user.tipo as "usuario" | "ong",
    id: Number(user.id),
  });
  return naoLidas;
}

export async function renderListaNecessidadesPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { ong, tipo, categoria, q } = request.query as {
    ong?: string;
    tipo?: string;
    categoria?: string;
    q?: string;
    pagina?: string;
  };
  const requestedPage = normalizePage((request.query as { pagina?: string }).pagina);
  const ongId = ong ? Number(ong) : undefined;
  const filtroOngId = ongId && !isNaN(ongId) ? ongId : undefined;
  const filtroTipo = ["bem", "servico", "voluntariado"].includes(tipo || "") ? tipo : undefined;
  const filtroCategoria = categoria || "";
  const filtroBusca = q?.trim() || "";
  const categoriasFiltro = getNeedFilterCategories(filtroTipo);

  let result = await necessidadeService.listarNecessidadesAbertas(
    filtroOngId,
    filtroTipo,
    filtroCategoria || undefined,
    filtroBusca || undefined,
    requestedPage,
    NECESSIDADES_PAGE_SIZE
  );

  if (process.env.NODE_ENV === "test") {
    return reply.send(result);
  }

  const user = request.session.user;
  const naoLidas = user ? await getNaoLidas(user as any) : 0;
  const isOngDashboard = user?.tipo === "ong";
  const layout = !user
    ? "layouts/main"
    : isOngDashboard
    ? "layouts/ongDashboardLayout"
    : "layouts/dashboardLayout";

  // Se filtrou por ONG, pega o nome da primeira necessidade para mostrar no título
  let nomeOngFiltrada = filtroOngId && result.necessidades.length > 0
    ? result.necessidades[0].nome_ong
    : null;
  let pagination = buildPagination({
    basePath: "/necessidades",
    currentPage: requestedPage,
    totalItems: result.total,
    pageSize: NECESSIDADES_PAGE_SIZE,
    extraParams: {
      ong: filtroOngId,
      tipo: filtroTipo,
      categoria: filtroCategoria || undefined,
      q: filtroBusca || undefined,
    },
  });

  if (pagination.currentPage !== requestedPage) {
    result = await necessidadeService.listarNecessidadesAbertas(
      filtroOngId,
      filtroTipo,
      filtroCategoria || undefined,
      filtroBusca || undefined,
      pagination.currentPage,
      NECESSIDADES_PAGE_SIZE
    );
    pagination = buildPagination({
      basePath: "/necessidades",
      currentPage: pagination.currentPage,
      totalItems: result.total,
      pageSize: NECESSIDADES_PAGE_SIZE,
      extraParams: {
        ong: filtroOngId,
        tipo: filtroTipo,
        categoria: filtroCategoria || undefined,
        q: filtroBusca || undefined,
      },
    });
    nomeOngFiltrada = filtroOngId && result.necessidades.length > 0
      ? result.necessidades[0].nome_ong
      : null;
  }

  return reply.view(
    "/templates/necessidades/lista.hbs",
    {
      title: "Necessidades das ONGs",
      user,
      naoLidas,
      necessidades: result.necessidades,
      filtroOngId,
      filtroTipo,
      filtroCategoria,
      filtroBusca,
      categoriasFiltro,
      nomeOngFiltrada,
      filtroBem: filtroTipo === "bem",
      filtroServico: filtroTipo === "servico",
      filtroVoluntariado: filtroTipo === "voluntariado",
      isOngDashboard,
      pagination,
      loginRedirectUrl: `/login?redirect=${encodeURIComponent(request.raw.url || "/necessidades")}`,
    },
    { layout }
  );
}

export async function renderNovaNecessidadePage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;

  if (!sessionUser) {
    return reply.redirect("/login");
  }

  if (sessionUser.tipo !== "ong") {
    return reply.redirect("/dashboard");
  }

  const naoLidas = await getNaoLidas(sessionUser as any);

  const aprovacao = await ongAprovacaoRepo.getStatusAprovacao(Number(sessionUser.id));
  const ongBloqueada = aprovacao?.status_aprovacao !== "aprovada";

  return reply.view(
    "/templates/necessidades/nova.hbs",
    {
      user: sessionUser,
      naoLidas,
      isBem: true,
      necessidadeCatalogoJson: JSON.stringify(NEED_CATALOG),
      ...(ongBloqueada
        ? { error: "Sua ONG precisa ser aprovada antes de cadastrar necessidades. Acesse a seção de Aprovação." }
        : {}),
    },
    { layout: "layouts/ongDashboardLayout" }
  );
}

export async function criarNecessidade(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;

  if (!sessionUser) {
    return reply.redirect("/login");
  }

  if (sessionUser.tipo !== "ong") {
    return reply.redirect("/dashboard");
  }

  // Bloquear se ONG não estiver aprovada
  const aprovacao = await ongAprovacaoRepo.getStatusAprovacao(Number(sessionUser.id));
  if (aprovacao?.status_aprovacao !== "aprovada") {
    const naoLidas = await getNaoLidas(sessionUser as any);
    return reply.view(
      "/templates/necessidades/nova.hbs",
      {
        user: sessionUser,
        naoLidas,
        error: "Sua ONG precisa ser aprovada antes de cadastrar necessidades. Acesse a seção de Aprovação.",
        isBem: true,
        necessidadeCatalogoJson: JSON.stringify(NEED_CATALOG),
      },
      { layout: "layouts/ongDashboardLayout" }
    );
  }

  const rawBody = request.body as Record<string, unknown>;
  const titulo = getSingleFormValue(rawBody.titulo);
  const descricao = getSingleFormValue(rawBody.descricao);
  const categoria = getSingleFormValue(rawBody.categoria);
  const quantidade = getSingleFormValue(rawBody.quantidade);
  const tipo_necessidade = getSingleFormValue(rawBody.tipo_necessidade);
  const local_atividade = getSingleFormValue(rawBody.local_atividade) || undefined;
  const turno = getSingleFormValue(rawBody.turno) || undefined;
  const data_inicio = getSingleFormValue(rawBody.data_inicio) || undefined;
  const data_fim = getSingleFormValue(rawBody.data_fim) || undefined;

  const result = await necessidadeService.criarNecessidade({
    ongId: Number(sessionUser.id),
    titulo,
    descricao,
    categoria,
    quantidade: Number(quantidade),
    tipo_necessidade: tipo_necessidade || "bem",
    local_atividade,
    turno,
    data_inicio,
    data_fim,
  });

  if (!result.ok) {
    const naoLidas = await getNaoLidas(sessionUser as any);

    return reply.view(
      "/templates/necessidades/nova.hbs",
      {
        user: sessionUser,
        naoLidas,
        error: result.error,
        form: { titulo, descricao, categoria, quantidade, tipo_necessidade, local_atividade, turno, data_inicio, data_fim },
        isVoluntariado: tipo_necessidade === "voluntariado",
        isBem: !tipo_necessidade || tipo_necessidade === "bem",
        necessidadeCatalogoJson: JSON.stringify(NEED_CATALOG),
      },
      { layout: "layouts/ongDashboardLayout" }
    );
  }

  return reply.redirect("/ong/necessidades?sucesso=1");
}

export async function renderDetalheNecessidadePage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };

  const result = await necessidadeService.buscarNecessidadePorId(Number(id));

  if (!result.ok) {
    return reply.status(404).send({ message: result.error });
  }

  const user = request.session.user;
  const naoLidas = user ? await getNaoLidas(user as any) : 0;
  const isOngDashboard = user?.tipo === "ong";
  const layout = !user
    ? "layouts/main"
    : isOngDashboard
    ? "layouts/ongDashboardLayout"
    : "layouts/dashboardLayout";
  const isPropriaOng = isOngDashboard && Number(user?.id) === Number(result.necessidade.ong_id);
  const canRegistrarInteresse = user?.tipo === "usuario";
  const canViewNeedMetrics = isPropriaOng;
  const interesseRedirectPath = buildInteresseRedirectPath(Number(result.necessidade.id));

  return reply.view(
    "/templates/necessidades/detalhe.hbs",
    {
      title: result.necessidade.titulo,
      user,
      naoLidas,
      necessidade: result.necessidade,
      isOngDashboard,
      isPropriaOng,
      canRegistrarInteresse,
      canViewNeedMetrics,
      isPublicGuest: !user,
      interesseRedirectPath,
      loginRedirectUrl: `/login?redirect=${encodeURIComponent(interesseRedirectPath)}`,
      registerRedirectUrl: `/register?redirect=${encodeURIComponent(interesseRedirectPath)}`,
    },
    { layout }
  );
}

export async function renderNecessidadesOngPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;

  if (!sessionUser) {
    return reply.redirect("/login");
  }

  if (sessionUser.tipo !== "ong") {
    return reply.redirect("/dashboard");
  }

  const { status, sucesso } = request.query as { status?: string; sucesso?: string };

  const result = await necessidadeService.listarNecessidadesDaOng(
    Number(sessionUser.id),
    status
  );

  const naoLidas = await getNaoLidas(sessionUser as any);

  return reply.view(
    "/templates/necessidades/minhas.hbs",
    {
      user: sessionUser,
      naoLidas,
      necessidades: result.necessidades,
      filtroAtual: result.filtroAtual,
      success: sucesso === "1",
    },
    { layout: "layouts/ongDashboardLayout" }
  );
}

export async function alterarStatusNecessidade(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;

  if (!sessionUser) {
    return reply.redirect("/login");
  }

  if (sessionUser.tipo !== "ong") {
    return reply.redirect("/dashboard");
  }

  const { id } = request.params as { id: string };
  const { status } = request.body as { status: string };

  const result = await necessidadeService.alterarStatusNecessidade({
    id: Number(id),
    ongId: Number(sessionUser.id),
    status,
  });

  if (!result.ok) {
    return reply.status(400).send({ message: result.error });
  }

  return reply.redirect("/ong/necessidades");
}
