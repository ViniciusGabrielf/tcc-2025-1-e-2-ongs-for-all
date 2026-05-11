import { FastifyRequest, FastifyReply } from "fastify";
import * as transparenciaRepo from "../repositories/transparenciaRepository";
import * as notificacaoService from "../services/notificacaoService";

async function getNaoLidas(user: { tipo: string; id: number }) {
  const { naoLidas } = await notificacaoService.contarNaoLidas({
    tipoConta: user.tipo as "usuario" | "ong",
    id: Number(user.id),
  });
  return naoLidas;
}

export async function renderTransparenciaPage(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { id } = request.params as { id: string };
  const sessionUser = request.session.user;
  const naoLidas = sessionUser ? await getNaoLidas(sessionUser as any) : 0;
  const isOngDashboard = sessionUser?.tipo === "ong";
  const layout = isOngDashboard
    ? "layouts/ongDashboardLayout"
    : "layouts/dashboardLayout";

  const dados = await transparenciaRepo.buscarDadosTransparencia(Number(id));

  if (!dados) {
    return reply.status(404).view(
      "/templates/ong/transparencia-indisponivel.hbs",
      {
        title: "Transparência indisponível",
        user: sessionUser,
        naoLidas,
        isOngDashboard,
      },
      { layout }
    );
  }

  // Enriquecer necessidades com flags de tipo
  const necessidades = dados.necessidades.map((n: any) => ({
    ...n,
    isBem: n.tipo_necessidade === "bem",
    isServico: n.tipo_necessidade === "servico",
    isVoluntariado: n.tipo_necessidade === "voluntariado",
    tipoLabel: n.tipo_necessidade === "bem" ? "Doação" : n.tipo_necessidade === "servico" ? "Serviço" : "Voluntariado",
    progresso: n.quantidade > 0 ? Math.min(100, Math.round((n.quantidade_recebida / n.quantidade) * 100)) : 0,
  }));

  // Enriquecer atividades com label de tipo
  const atividades = dados.atividades.map((a: any) => ({
    ...a,
    tipoLabel: a.tipo_necessidade === "bem" ? "doação" : a.tipo_necessidade === "servico" ? "serviço" : "voluntariado",
  }));

  return reply.view(
    "/templates/ong/transparencia.hbs",
    {
      user: sessionUser,
      naoLidas,
      ong: dados.ong,
      stats: dados.stats,
      relatorios: dados.relatorios,
      necessidades,
      atividades,
      temRelatorios: dados.relatorios.length > 0,
      temNecessidades: necessidades.length > 0,
      temAtividades: atividades.length > 0,
    },
    { layout }
  );
}
