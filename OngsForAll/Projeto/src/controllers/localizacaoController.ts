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

function renderLocalizacaoIndisponivel(reply: FastifyReply, session: any, naoLidas: number) {
  return reply.status(404).view("/templates/ong/localizacao.hbs", {
    title: "Localizacao indisponivel",
    ong: { id: null, nome: "ONG nao encontrada ou ainda nao aprovada" },
    estado: "sem_localizacao",
    estaRemota: false,
    semLocalizacao: true,
    enderecoApenas: false,
    comCoordenadas: false,
    localizacaoAproximada: false,
    enderecoTexto: null,
    bairroStr: "",
    cidadeStr: "",
    estadoStr: "",
    latitude: null,
    longitude: null,
    latStr: "",
    lonStr: "",
    instrucoesChegada: null,
    googleMapsUrl: null,
    googleMapsEmbedUrl: null,
    temEndereco: false,
    user: session ?? null,
    naoLidas,
  }, { layout: getLayout(session) });
}

export async function renderLocalizacaoPage(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const ongId = Number(id);
  const session = request.session.user;
  const naoLidas = await getNaoLidas(session);

  if (!ongId || isNaN(ongId)) {
    return renderLocalizacaoIndisponivel(reply, session, naoLidas);
  }

  const loc = await localizacaoService.getLocalizacaoPublica(ongId);

  if (!loc) return renderLocalizacaoIndisponivel(reply, session, naoLidas);

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
