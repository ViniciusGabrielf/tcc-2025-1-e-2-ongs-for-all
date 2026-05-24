import { FastifyRequest, FastifyReply } from "fastify";
import * as calendarioService from "../services/calendarioService";
import * as notificacaoService from "../services/notificacaoService";

const LAYOUT_POR_TIPO = {
  usuario: "layouts/dashboardLayout",
  ong:     "layouts/ongDashboardLayout",
  empresa: "layouts/empresaDashboardLayout",
} as const;

const DIAS_SEMANA = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

interface Evento {
  id: number;
  data: string;
  titulo: string;
  tipo: string;
  link: string;
  destaque: boolean;
  corClasse: string;
  entidade_nome: string | null;
}

interface Celula {
  dia: number;
  data: string | null;
  isOutroMes: boolean;
  isHoje: boolean;
  eventos: Evento[];
  eventosMostrar: Evento[];
  eventosExtra: number;
  temEventos: boolean;
  temDestaque: boolean;
}

function buildGrid(year: number, month: number, eventos: Evento[]): Celula[][] {
  const eventosPorData = new Map<string, Evento[]>();
  for (const ev of eventos) {
    const arr = eventosPorData.get(ev.data) ?? [];
    arr.push(ev);
    eventosPorData.set(ev.data, arr);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  let startDow = new Date(year, month - 1, 1).getDay(); // 0 = Dom
  startDow = (startDow + 6) % 7; // converte para Seg=0 ... Dom=6

  const hoje = new Date();
  const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;

  const cells: Celula[] = [];

  for (let i = 0; i < startDow; i++) {
    cells.push({ dia: 0, data: null, isOutroMes: true, isHoje: false, eventos: [], eventosMostrar: [], eventosExtra: 0, temEventos: false, temDestaque: false });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dataStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const evs = eventosPorData.get(dataStr) ?? [];
    cells.push({
      dia: d,
      data: dataStr,
      isOutroMes: false,
      isHoje: dataStr === hojeStr,
      eventos: evs,
      eventosMostrar: evs.slice(0, 2),
      eventosExtra: Math.max(0, evs.length - 2),
      temEventos: evs.length > 0,
      temDestaque: evs.some((e) => e.destaque),
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ dia: 0, data: null, isOutroMes: true, isHoje: false, eventos: [], eventosMostrar: [], eventosExtra: 0, temEventos: false, temDestaque: false });
  }

  const semanas: Celula[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    semanas.push(cells.slice(i, i + 7));
  }
  return semanas;
}

export async function apiMesPorId(request: FastifyRequest, reply: FastifyReply) {
  const user = request.session.user;
  if (!user) return reply.code(401).send({ ok: false });

  const { id } = request.query as { id?: string };
  if (!id || isNaN(Number(id))) return reply.code(400).send({ ok: false });

  const result = await calendarioService.getMesPorId({
    id: Number(id),
    userTipo: user.tipo,
    userId: Number(user.id),
  });

  return reply.send(result);
}

export async function apiDetalheEvento(request: FastifyRequest, reply: FastifyReply) {
  const user = request.session.user;
  if (!user) return reply.code(401).send({ ok: false, error: "Não autenticado" });

  const { tipo, id } = request.query as { tipo?: string; id?: string };
  if (!tipo || !id || isNaN(Number(id))) {
    return reply.code(400).send({ ok: false, error: "Parâmetros inválidos" });
  }

  const result = await calendarioService.getDetalheEvento({
    tipo,
    id: Number(id),
    userTipo: user.tipo,
    userId: Number(user.id),
  });

  return reply.send(result);
}

export async function renderCalendarioPage(request: FastifyRequest, reply: FastifyReply) {
  const user = request.session.user;
  if (!user) return reply.redirect("/login");

  const { mes, buscar_id } = request.query as { mes?: string; buscar_id?: string };

  try {
    const result = await calendarioService.getEventos({
      tipo: user.tipo,
      id: Number(user.id),
      mes,
    });

    const { naoLidas } = await notificacaoService.contarNaoLidas({
      tipoConta: user.tipo,
      id: Number(user.id),
    });

    const semanas = buildGrid(result.year, result.month, result.eventos);

    const eventosJSON = JSON.stringify(
      result.eventos.reduce((acc: Record<string, Evento[]>, ev) => {
        if (!acc[ev.data]) acc[ev.data] = [];
        acc[ev.data].push({ id: ev.id, titulo: ev.titulo, tipo: ev.tipo, link: ev.link, destaque: ev.destaque, corClasse: ev.corClasse, entidade_nome: ev.entidade_nome } as Evento);
        return acc;
      }, {})
    );

    const buscarId = buscar_id && /^\d+$/.test(buscar_id) ? buscar_id : null;

    return reply.view(
      "/templates/calendario/index.hbs",
      {
        user,
        naoLidas,
        title: "Calendário",
        semanas,
        diasSemana: DIAS_SEMANA,
        mesTitulo:  result.mesTitulo,
        mesAnterior: result.mesAnterior,
        mesProximo:  result.mesProximo,
        eventosJSON,
        buscarId,
      },
      { layout: LAYOUT_POR_TIPO[user.tipo] }
    );
  } catch (error) {
    console.error("Erro ao renderizar calendário:", error);
    return reply.code(500).send("Erro ao carregar calendário.");
  }
}
