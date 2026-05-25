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

// GET /empresa/mensagens — lista conversas da empresa
export async function renderListaMensagensEmpresa(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "empresa") return reply.redirect("/login");

  const naoLidas = await getNaoLidas(sessionUser as any);
  const conversas = await mensagemService.listarConversasEmpresa(Number(sessionUser.id));

  return reply.view(
    "/templates/mensagens/lista-empresa.hbs",
    { user: sessionUser, naoLidas, conversas },
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

  const naoLidas = await getNaoLidas(sessionUser as any);
  const conversas = await mensagemService.listarConversasDoUsuario(Number(sessionUser.id));

  return reply.view(
    "/templates/mensagens/lista-usuario.hbs",
    { user: sessionUser, naoLidas, conversas },
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

  const naoLidas = await getNaoLidas(sessionUser as any);
  const conversas = await mensagemService.listarConversasDaOng(Number(sessionUser.id));

  return reply.view(
    "/templates/mensagens/lista-ong.hbs",
    { user: sessionUser, naoLidas, conversas },
    { layout: "layouts/ongDashboardLayout" }
  );
}

// GET /mensagens/:id — ver conversa (usuário ou ONG)
export async function renderConversa(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser) return reply.redirect("/login");

  const { id } = request.params as { id: string };
  const { rascunho } = request.query as { rascunho?: string };
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

  const listaUrl =
    sessionUser.tipo === "ong"
      ? "/ong/mensagens"
      : sessionUser.tipo === "empresa"
      ? "/empresa/mensagens"
      : "/mensagens";

  const isEmpresa = sessionUser.tipo === "empresa";
  const nomeOutro = isEmpresa
    ? result.conversa.nome_ong
    : sessionUser.tipo === "ong"
    ? (result.conversa.nome_empresa || result.conversa.nome_usuario)
    : result.conversa.nome_ong;

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

  const redirectBase =
    sessionUser.tipo === "ong"
      ? `/mensagens/${id}`
      : sessionUser.tipo === "empresa"
      ? `/empresa/mensagens/${id}`
      : `/mensagens/${id}`;

  return reply.redirect(redirectBase);
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
