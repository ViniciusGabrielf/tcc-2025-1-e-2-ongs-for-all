import { FastifyRequest, FastifyReply } from "fastify";
import * as mensagemService from "../services/mensagemService";
import * as notificacaoService from "../services/notificacaoService";

async function getNaoLidas(user: { tipo: string; id: number }) {
  const { naoLidas } = await notificacaoService.contarNaoLidas({
    tipoConta: user.tipo as "usuario" | "ong",
    id: Number(user.id),
  });
  return naoLidas;
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
  const naoLidas = await getNaoLidas(sessionUser as any);

  const result = await mensagemService.visualizarConversa({
    conversaId: Number(id),
    tipoConta: sessionUser.tipo as "usuario" | "ong",
    contaId: Number(sessionUser.id),
  });

  if (!result.ok) {
    return reply.status(403).send({ message: result.error });
  }

  const layout =
    sessionUser.tipo === "ong"
      ? "layouts/ongDashboardLayout"
      : "layouts/dashboardLayout";

  const listaUrl = sessionUser.tipo === "ong" ? "/ong/mensagens" : "/mensagens";

  return reply.view(
    "/templates/mensagens/conversa.hbs",
    {
      user: sessionUser,
      naoLidas,
      conversa: result.conversa,
      mensagens: result.mensagens,
      isOng: sessionUser.tipo === "ong",
      listaUrl,
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
    tipoConta: sessionUser.tipo as "usuario" | "ong",
    contaId: Number(sessionUser.id),
    conteudo,
  });

  if (!result.ok) {
    return reply.status(400).send({ message: result.error });
  }

  return reply.redirect(`/mensagens/${id}`);
}

// POST /mensagens/iniciar — usuário inicia conversa com uma ONG
export async function iniciarConversa(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const sessionUser = request.session.user;
  if (!sessionUser || sessionUser.tipo !== "usuario") return reply.redirect("/login");

  const { ong_id, necessidade_id, mensagem } = request.body as {
    ong_id: string;
    necessidade_id?: string;
    mensagem: string;
  };

  const result = await mensagemService.iniciarConversaUsuario({
    usuarioId: Number(sessionUser.id),
    ongId: Number(ong_id),
    necessidadeId: necessidade_id ? Number(necessidade_id) : undefined,
    mensagemInicial: mensagem,
  });

  if (!result.ok) {
    return reply.status(400).send({ message: result.error });
  }

  return reply.redirect(`/mensagens/${result.conversaId}`);
}
