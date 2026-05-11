import { FastifyRequest, FastifyReply } from "fastify";
import * as ongService from "../services/ongService";
import * as notificacaoService from "../services/notificacaoService";

export async function renderOngsPage(request: FastifyRequest, reply: FastifyReply) {
  const session = request.session.user;
  if (!session) return reply.redirect("/login");

  const { busca } = request.query as { busca?: string };
  const isOngDashboard = session.tipo === "ong";
  const todasOngs = await ongService.listOngs(busca);
  const ongs = isOngDashboard
    ? todasOngs.filter((ong: any) => Number(ong.id) !== Number(session.id))
    : todasOngs;

  const { naoLidas } = await notificacaoService.contarNaoLidas({
    tipoConta: session.tipo,
    id: Number(session.id),
  });

  const layout = session.tipo === "ong"
    ? "layouts/ongDashboardLayout"
    : "layouts/dashboardLayout";

  return reply.view("/templates/usuario/ongs.hbs", {
    title: "Explorar ONGs",
    ongs,
    busca: busca || "",
    totalOngs: ongs.length,
    user: session,
    naoLidas,
    isOngDashboard,
  }, { layout });
}
