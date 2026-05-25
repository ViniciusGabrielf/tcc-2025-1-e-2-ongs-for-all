import { FastifyRequest, FastifyReply } from "fastify";
import * as localizacaoService from "../services/localizacaoService";
import * as notificacaoService from "../services/notificacaoService";
import { buscarCep } from "../services/cepService";

function getLayout(session: any): string {
  if (!session) return "layouts/main";
  if (session.tipo === "ong")     return "layouts/ongDashboardLayout";
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

export async function renderLocalizacaoPage(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const ongId = Number(id);
  if (!ongId || isNaN(ongId)) return reply.status(404).send({ message: "ONG não encontrada" });

  const session = request.session.user;
  const [loc, naoLidas] = await Promise.all([
    localizacaoService.getLocalizacaoPublica(ongId),
    getNaoLidas(session),
  ]);

  if (!loc) return reply.status(404).send({ message: "ONG não encontrada" });

  const temCoordenadas = loc.estado === "com_coordenadas";
  const temEndereco    = !!(loc.enderecoTexto);

  const googleMapsEmbedUrl = !temCoordenadas && loc.enderecoTexto
    ? `https://maps.google.com/maps?q=${encodeURIComponent(loc.enderecoTexto + ", Brasil")}&output=embed&hl=pt-BR&z=15`
    : null;

  return reply.view("/templates/ong/localizacao.hbs", {
    title: `Localização — ${loc.ong.nome}`,
    ong:               loc.ong,
    estado:            loc.estado,
    estaRemota:        loc.estado === "remoto",
    semLocalizacao:    loc.estado === "sem_localizacao",
    enderecoApenas:    loc.estado === "endereco_apenas",
    comCoordenadas:    temCoordenadas,
    localizacaoAproximada: loc.localizacaoAproximada,
    enderecoTexto:     loc.enderecoTexto,
    bairroStr:         loc.bairro   ?? "",
    cidadeStr:         loc.cidade   ?? "",
    estadoStr:         loc.estadoUF ?? "",
    latitude:          temCoordenadas ? loc.latitude : null,
    longitude:         temCoordenadas ? loc.longitude : null,
    latStr:            temCoordenadas ? String(loc.latitude) : "",
    lonStr:            temCoordenadas ? String(loc.longitude) : "",
    instrucoesChegada:    loc.instrucoesChegada,
    googleMapsUrl:        loc.googleMapsUrl,
    googleMapsEmbedUrl,
    temEndereco,
    user:     session ?? null,
    naoLidas,
  }, { layout: getLayout(session) });
}

export async function apiLookupCep(request: FastifyRequest, reply: FastifyReply) {
  const session = request.session.user;
  if (!session || session.tipo !== "ong") {
    return reply.status(403).send({ error: "Acesso negado" });
  }

  const { cep } = request.params as { cep: string };
  const endereco = await buscarCep(cep);

  if (!endereco) {
    return reply.status(404).send({ error: "CEP não encontrado" });
  }

  return reply.send(endereco);
}
