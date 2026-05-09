import { FastifyRequest, FastifyReply } from "fastify";
import * as necessidadeService from "../services/necessidadeService";
import * as notificacaoService from "../services/notificacaoService";
import * as ongAprovacaoRepo from "../repositories/ongAprovacaoRepository";

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
  const { ong, tipo } = request.query as { ong?: string; tipo?: string };
  const ongId = ong ? Number(ong) : undefined;
  const filtroOngId = ongId && !isNaN(ongId) ? ongId : undefined;
  const filtroTipo = ["bem", "servico", "voluntariado"].includes(tipo || "") ? tipo : undefined;

  const result = await necessidadeService.listarNecessidadesAbertas(filtroOngId, filtroTipo);

  if (process.env.NODE_ENV === "test") {
    return reply.send(result);
  }

  const user = request.session.user;
  const naoLidas = user ? await getNaoLidas(user as any) : 0;
  const isOngDashboard = user?.tipo === "ong";
  const layout = isOngDashboard ? "layouts/ongDashboardLayout" : "layouts/dashboardLayout";

  // Se filtrou por ONG, pega o nome da primeira necessidade para mostrar no título
  const nomeOngFiltrada = filtroOngId && result.necessidades.length > 0
    ? result.necessidades[0].nome_ong
    : null;

  return reply.view(
    "/templates/necessidades/lista.hbs",
    {
      user,
      naoLidas,
      necessidades: result.necessidades,
      filtroOngId,
      filtroTipo,
      nomeOngFiltrada,
      filtroBem: filtroTipo === "bem",
      filtroServico: filtroTipo === "servico",
      filtroVoluntariado: filtroTipo === "voluntariado",
      isOngDashboard,
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
      },
      { layout: "layouts/ongDashboardLayout" }
    );
  }

  const {
    titulo,
    descricao,
    categoria,
    quantidade,
    tipo_necessidade,
    local_atividade,
    turno,
    data_inicio,
    data_fim,
  } = request.body as {
    titulo: string;
    descricao: string;
    categoria: string;
    quantidade: string;
    tipo_necessidade: string;
    local_atividade?: string;
    turno?: string;
    data_inicio?: string;
    data_fim?: string;
  };

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
  const layout = isOngDashboard ? "layouts/ongDashboardLayout" : "layouts/dashboardLayout";
  const isPropriaOng = isOngDashboard && Number(user?.id) === Number(result.necessidade.ong_id);
  const canRegistrarInteresse = user?.tipo === "usuario";

  return reply.view(
    "/templates/necessidades/detalhe.hbs",
    {
      user,
      naoLidas,
      necessidade: result.necessidade,
      isOngDashboard,
      isPropriaOng,
      canRegistrarInteresse,
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
