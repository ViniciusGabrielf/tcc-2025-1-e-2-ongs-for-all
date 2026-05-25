import { FastifyRequest, FastifyReply } from "fastify";
import * as mensagemService from "../services/mensagemService";
import * as notificacaoService from "../services/notificacaoService";

async function getNaoLidas(user: { tipo: string; id: number }) {
  const { naoLidas } = await notificacaoService.contarNaoLidas({
    tipoConta: user.tipo as "usuario" | "ong" | "empresa",
    id: Number(user.id),
  });
  return naoLidas;
}

function listaUrlPorTipo(tipo: string) {
  if (tipo === "ong") return "/ong/mensagens";
  if (tipo === "empresa") return "/empresa/mensagens";
  return "/mensagens";
}

// GET /empresa/mensagens — lista conversas da empresa
export async function renderListaMensagensEmpresa(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const { filtro, busca, arquivado: arquivadoFlash, desarquivado: desarquivadoFlash } =
    request.query as { filtro?: string; busca?: string; arquivado?: string; desarquivado?: string };

  const naoLidas = await getNaoLidas(sessionUser as any);
  const filtroArquivadas = filtro === "arquivadas";
  const arquivadoParam: 0 | 1 = filtroArquivadas ? 1 : 0;

  const todasAtivas = await mensagemService.listarConversasEmpresa(Number(sessionUser.id), 0);
  const totalNaoLidas = todasAtivas.filter((c) => c.temNaoLidas).length;

  let conversas = filtroArquivadas
    ? await mensagemService.listarConversasEmpresa(Number(sessionUser.id), 1)
    : todasAtivas;

  if (filtro === "nao_lidas" && !filtroArquivadas) conversas = conversas.filter((c) => c.temNaoLidas);

  if (busca?.trim()) {
    const term = busca.trim().toLowerCase();
    conversas = conversas.filter((c) => c.nome_ong?.toLowerCase().includes(term));
  }

  return reply.view(
    "/templates/mensagens/lista-empresa.hbs",
    {
      user: sessionUser,
      naoLidas,
      conversas,
      filtro: filtro || null,
      busca: busca?.trim() || null,
      filtroNaoLidas: filtro === "nao_lidas",
      filtroArquivadas,
      totalNaoLidas,
      isOneNaoLida: totalNaoLidas === 1,
      filtroBadgeAtivo: !!filtro || !!(busca?.trim()),
      successArquivado: arquivadoFlash === "1",
      successDesarquivado: desarquivadoFlash === "1",
    },
    { layout: "layouts/empresaDashboardLayout" }
  );
}

// GET /mensagens — lista conversas do usuário
export async function renderListaMensagensUsuario(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser) return reply.redirect("/login");

  const { filtro, busca, arquivado: arquivadoFlash, desarquivado: desarquivadoFlash } =
    request.query as { filtro?: string; busca?: string; arquivado?: string; desarquivado?: string };

  const naoLidas = await getNaoLidas(sessionUser as any);
  const filtroArquivadas = filtro === "arquivadas";

  const todasAtivas = await mensagemService.listarConversasDoUsuario(Number(sessionUser.id), 0);
  const totalNaoLidas = todasAtivas.filter((c) => c.temNaoLidas).length;

  let conversas = filtroArquivadas
    ? await mensagemService.listarConversasDoUsuario(Number(sessionUser.id), 1)
    : todasAtivas;

  if (filtro === "nao_lidas" && !filtroArquivadas) conversas = conversas.filter((c) => c.temNaoLidas);

  if (busca?.trim()) {
    const term = busca.trim().toLowerCase();
    conversas = conversas.filter((c) => c.nome_ong?.toLowerCase().includes(term));
  }

  return reply.view(
    "/templates/mensagens/lista-usuario.hbs",
    {
      user: sessionUser,
      naoLidas,
      conversas,
      filtro: filtro || null,
      busca: busca?.trim() || null,
      filtroNaoLidas: filtro === "nao_lidas",
      filtroArquivadas,
      totalNaoLidas,
      isOneNaoLida: totalNaoLidas === 1,
      filtroBadgeAtivo: !!filtro || !!(busca?.trim()),
      successArquivado: arquivadoFlash === "1",
      successDesarquivado: desarquivadoFlash === "1",
    },
    { layout: "layouts/dashboardLayout" }
  );
}

// GET /ong/mensagens — lista conversas da ONG
export async function renderListaMensagensOng(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "ong") return reply.redirect("/login");

  const { filtro, busca, arquivado: arquivadoFlash, desarquivado: desarquivadoFlash } =
    request.query as { filtro?: string; busca?: string; arquivado?: string; desarquivado?: string };

  const naoLidas = await getNaoLidas(sessionUser as any);
  const filtroArquivadas = filtro === "arquivadas";

  const todasAtivas = await mensagemService.listarConversasDaOng(Number(sessionUser.id), 0);
  const totalNaoLidas = todasAtivas.filter((c) => c.temNaoLidas).length;

  let conversas = filtroArquivadas
    ? await mensagemService.listarConversasDaOng(Number(sessionUser.id), 1)
    : todasAtivas;

  if (!filtroArquivadas) {
    if (filtro === "nao_lidas") conversas = conversas.filter((c) => c.temNaoLidas);
    else if (filtro === "usuario") conversas = conversas.filter((c) => !c.isEmpresa);
    else if (filtro === "empresa") conversas = conversas.filter((c) => c.isEmpresa);
  }

  if (busca?.trim()) {
    const term = busca.trim().toLowerCase();
    conversas = conversas.filter((c) => c.nome_remetente?.toLowerCase().includes(term));
  }

  return reply.view(
    "/templates/mensagens/lista-ong.hbs",
    {
      user: sessionUser,
      naoLidas,
      conversas,
      filtro: filtro || null,
      busca: busca?.trim() || null,
      filtroNaoLidas: filtro === "nao_lidas",
      filtroUsuario: filtro === "usuario",
      filtroEmpresa: filtro === "empresa",
      filtroArquivadas,
      totalNaoLidas,
      isOneNaoLida: totalNaoLidas === 1,
      filtroBadgeAtivo: !!filtro || !!(busca?.trim()),
      successArquivado: arquivadoFlash === "1",
      successDesarquivado: desarquivadoFlash === "1",
    },
    { layout: "layouts/ongDashboardLayout" }
  );
}

// GET /mensagens/:id — ver conversa
export async function renderConversa(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser) return reply.redirect("/login");

  const { id } = request.params as { id: string };
  const { rascunho, erro } = request.query as { rascunho?: string; erro?: string };
  const naoLidas = await getNaoLidas(sessionUser as any);

  const result = await mensagemService.visualizarConversa({
    conversaId: Number(id),
    tipoConta: sessionUser.tipo as "usuario" | "ong" | "empresa",
    contaId: Number(sessionUser.id),
  });

  if (!result.ok) {
    return reply.status(403).send({ message: result.error });
  }

  const layout =
    sessionUser.tipo === "ong"
      ? "layouts/ongDashboardLayout"
      : sessionUser.tipo === "empresa"
      ? "layouts/empresaDashboardLayout"
      : "layouts/dashboardLayout";

  const listaUrl = listaUrlPorTipo(sessionUser.tipo);

  const isEmpresa = sessionUser.tipo === "empresa";
  const nomeOutro = isEmpresa
    ? result.conversa.nome_ong
    : sessionUser.tipo === "ong"
    ? (result.conversa.nome_empresa || result.conversa.nome_usuario)
    : result.conversa.nome_ong;

  const arquivadoField =
    sessionUser.tipo === "ong" ? "arquivado_ong" :
    sessionUser.tipo === "empresa" ? "arquivado_empresa" :
    "arquivado_usuario";
  const isArquivada = Number(result.conversa[arquivadoField]) === 1;

  const erroMsg =
    erro === "arquivamento_falhou" ? "Não foi possível arquivar a conversa. Tente novamente." :
    erro === "desarquivamento_falhou" ? "Não foi possível restaurar a conversa. Tente novamente." :
    null;

  return reply.view(
    "/templates/mensagens/conversa.hbs",
    {
      user: sessionUser,
      naoLidas,
      conversa: { ...result.conversa, nome_outro: nomeOutro },
      mensagens: result.mensagens,
      isOng: sessionUser.tipo === "ong",
      listaUrl,
      draftMessage: rascunho?.trim() || "",
      isArquivada,
      erroMsg,
    },
    { layout }
  );
}

// POST /mensagens/:id/enviar — enviar mensagem
export async function enviarMensagem(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser) return reply.redirect("/login");

  const { id } = request.params as { id: string };
  const { conteudo } = request.body as { conteudo: string };

  const result = await mensagemService.enviarMensagem({
    conversaId: Number(id),
    tipoConta: sessionUser.tipo as "usuario" | "ong" | "empresa",
    contaId: Number(sessionUser.id),
    conteudo,
  });

  if (!result.ok) {
    return reply.status(400).send({ message: result.error });
  }

  const redirectBase = `${listaUrlPorTipo(sessionUser.tipo)}/${id}`;
  return reply.redirect(redirectBase);
}

// POST /mensagens/:id/arquivar — arquivar conversa
export async function arquivarConversaHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser) return reply.redirect("/login");

  const { id } = request.params as { id: string };
  const listaUrl = listaUrlPorTipo(sessionUser.tipo);

  const result = await mensagemService.arquivarConversa({
    conversaId: Number(id),
    tipoConta: sessionUser.tipo as "usuario" | "ong" | "empresa",
    contaId: Number(sessionUser.id),
    arquivar: true,
  });

  if (!result.ok) return reply.redirect(`${listaUrl}/${id}?erro=arquivamento_falhou`);
  return reply.redirect(`${listaUrl}?arquivado=1`);
}

// POST /mensagens/:id/desarquivar — desarquivar conversa
export async function desarquivarConversaHandler(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser) return reply.redirect("/login");

  const { id } = request.params as { id: string };
  const listaUrl = listaUrlPorTipo(sessionUser.tipo);

  const result = await mensagemService.arquivarConversa({
    conversaId: Number(id),
    tipoConta: sessionUser.tipo as "usuario" | "ong" | "empresa",
    contaId: Number(sessionUser.id),
    arquivar: false,
  });

  if (!result.ok) return reply.redirect(`${listaUrl}/${id}?erro=desarquivamento_falhou`);
  return reply.redirect(`${listaUrl}?desarquivado=1`);
}

// POST /mensagens/iniciar — usuário ou empresa inicia conversa com uma ONG
export async function iniciarConversa(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser || !["usuario", "empresa"].includes(sessionUser.tipo)) {
    return reply.redirect("/login");
  }

  const { ong_id, necessidade_id, mensagem } = request.body as {
    ong_id: string;
    necessidade_id?: string;
    mensagem: string;
  };

  if (sessionUser.tipo === "empresa") {
    const result = await mensagemService.iniciarConversaEmpresa({
      empresaId: Number(sessionUser.id),
      ongId: Number(ong_id),
      necessidadeId: necessidade_id ? Number(necessidade_id) : undefined,
      mensagemInicial: mensagem,
    });
    if (!result.ok) return reply.status(400).send({ message: result.error });
    return reply.redirect(`/empresa/mensagens/${result.conversaId}?rascunho=${encodeURIComponent(result.rascunho)}`);
  }

  const result = await mensagemService.iniciarConversaUsuario({
    usuarioId: Number(sessionUser.id),
    ongId: Number(ong_id),
    necessidadeId: necessidade_id ? Number(necessidade_id) : undefined,
    mensagemInicial: mensagem,
  });

  if (!result.ok) {
    return reply.status(400).send({ message: result.error });
  }

  return reply.redirect(`/mensagens/${result.conversaId}?rascunho=${encodeURIComponent(result.rascunho)}`);
}
