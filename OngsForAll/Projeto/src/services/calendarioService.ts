import * as calendarioRepo from "../repositories/calendarioRepository";

const MESES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const COR_POR_TIPO: Record<string, string> = {
  entrega_aceita:     "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  entrega_recebida:   "bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-300",
  interesse:          "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  voluntariado:       "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  voluntariado_fim:   "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  necessidade_inicio: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300",
  necessidade_fim:    "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
  relatorio:          "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  evidencia:          "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  marketplace:        "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
};

const STATUS_LABEL: Record<string, string> = {
  pendente:  "Pendente",
  aceito:    "Aceito",
  recebido:  "Recebido",
  cancelado: "Cancelado",
  aberta:    "Aberta",
  concluida: "Concluída",
  cancelada: "Cancelada",
  rascunho:  "Rascunho",
  publicado: "Publicado",
  aprovado:  "Aprovado",
  rejeitado: "Rejeitado",
};

const TIPO_NEC_LABEL: Record<string, string> = {
  bem:          "Doação de bem",
  servico:      "Serviço",
  voluntariado: "Voluntariado",
};

const MODO_PRECO_LABEL: Record<string, string> = {
  gratuito:    "Gratuito",
  fixo:        "Preço fixo",
  sob_consulta: "Sob consulta",
};

function fmt(val: any): string {
  if (val === null || val === undefined || val === "") return "—";
  return String(val);
}

interface Campo { label: string; valor: string; }

function parseMes(mesParam: string | undefined) {
  const hoje = new Date();
  const defaultMes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const mesStr = /^\d{4}-\d{2}$/.test(mesParam ?? "") ? mesParam! : defaultMes;
  const [year, month] = mesStr.split("-").map(Number);

  const prev =
    month === 1
      ? `${year - 1}-12`
      : `${year}-${String(month - 1).padStart(2, "0")}`;
  const next =
    month === 12
      ? `${year + 1}-01`
      : `${year}-${String(month + 1).padStart(2, "0")}`;

  return {
    year,
    month,
    mesStr,
    mesTitulo: `${MESES_PT[month - 1]} ${year}`,
    mesAnterior: prev,
    mesProximo: next,
  };
}

export async function getEventos(params: {
  tipo: "usuario" | "ong" | "empresa";
  id: number;
  mes?: string;
}) {
  const { year, month, mesStr, mesTitulo, mesAnterior, mesProximo } = parseMes(params.mes);

  let brutos: calendarioRepo.EventoBruto[];

  if (params.tipo === "usuario") {
    brutos = await calendarioRepo.buscarEventosUsuario(params.id, mesStr);
  } else if (params.tipo === "ong") {
    brutos = await calendarioRepo.buscarEventosOng(params.id, mesStr);
  } else {
    brutos = await calendarioRepo.buscarEventosEmpresa(params.id, mesStr);
  }

  const eventos = brutos.map((ev) => ({
    id: ev.id,
    data: ev.data,
    titulo: ev.titulo,
    tipo: ev.tipo,
    link: ev.link,
    destaque: ev.destaque === 1,
    corClasse: COR_POR_TIPO[ev.tipo] ?? "bg-slate-100 text-slate-700",
    entidade_nome: ev.entidade_nome ?? null,
  }));

  return { ok: true as const, eventos, year, month, mesStr, mesTitulo, mesAnterior, mesProximo };
}

function buildCampos(
  tipo: string,
  userTipo: string,
  row: Record<string, any>
): { campos: Campo[]; link: string; linkTexto: string } {
  const campos: Campo[] = [];
  let link = "#";
  let linkTexto = "Mais detalhes";

  if (userTipo === "usuario") {
    campos.push({ label: "ID da solicitação", valor: `#${fmt(row.id)}` });
    campos.push({ label: "Necessidade", valor: fmt(row.necessidade_titulo) });
    campos.push({ label: "Tipo", valor: TIPO_NEC_LABEL[row.tipo_necessidade] ?? fmt(row.tipo_necessidade) });
    if (row.categoria) campos.push({ label: "Categoria", valor: fmt(row.categoria) });
    campos.push({ label: "Status", valor: STATUS_LABEL[row.status] ?? fmt(row.status) });
    if (row.quantidade) campos.push({ label: "Quantidade oferecida", valor: fmt(row.quantidade) });
    if (row.quantidade_confirmada != null) campos.push({ label: "Quantidade recebida", valor: fmt(row.quantidade_confirmada) });
    if (row.data_prevista) campos.push({ label: "Data prevista de entrega", valor: fmt(row.data_prevista) });
    if (row.data_inicio) campos.push({ label: "Início", valor: fmt(row.data_inicio) });
    if (row.data_fim) campos.push({ label: "Término", valor: fmt(row.data_fim) });
    if (row.local_atividade) campos.push({ label: "Local", valor: fmt(row.local_atividade) });
    if (row.turno) campos.push({ label: "Turno", valor: fmt(row.turno) });
    campos.push({ label: "ONG", valor: fmt(row.ong_nome) });
    if (row.observacao) campos.push({ label: "Observação", valor: fmt(row.observacao) });
    link = `/necessidades/${row.necessidade_id}`;
    linkTexto = "Ver necessidade";
  } else if (userTipo === "ong" && (tipo === "entrega_aceita" || tipo === "entrega_recebida")) {
    campos.push({ label: "ID da solicitação", valor: `#${fmt(row.id)}` });
    campos.push({ label: "Necessidade", valor: fmt(row.necessidade_titulo) });
    campos.push({ label: "Tipo", valor: TIPO_NEC_LABEL[row.tipo_necessidade] ?? fmt(row.tipo_necessidade) });
    if (row.categoria) campos.push({ label: "Categoria", valor: fmt(row.categoria) });
    campos.push({ label: "Doador", valor: fmt(row.doador_nome) });
    campos.push({ label: "Status", valor: STATUS_LABEL[row.status] ?? fmt(row.status) });
    if (row.quantidade) campos.push({ label: "Quantidade oferecida", valor: fmt(row.quantidade) });
    if (row.quantidade_confirmada != null) campos.push({ label: "Quantidade recebida", valor: fmt(row.quantidade_confirmada) });
    if (row.data_prevista) campos.push({ label: "Data prevista de entrega", valor: fmt(row.data_prevista) });
    if (row.observacao) campos.push({ label: "Observação", valor: fmt(row.observacao) });
    link = `/ong/interesses`;
    linkTexto = "Ver todos os interesses";
  } else if (userTipo === "ong" && ["necessidade_inicio", "necessidade_fim"].includes(tipo)) {
    campos.push({ label: "ID da necessidade", valor: `#${fmt(row.id)}` });
    campos.push({ label: "Necessidade", valor: fmt(row.titulo) });
    campos.push({ label: "Tipo", valor: TIPO_NEC_LABEL[row.tipo_necessidade] ?? fmt(row.tipo_necessidade) });
    if (row.categoria) campos.push({ label: "Categoria", valor: fmt(row.categoria) });
    campos.push({ label: "Status", valor: STATUS_LABEL[row.status] ?? fmt(row.status) });
    if (row.descricao) campos.push({ label: "Descrição", valor: fmt(row.descricao) });
    campos.push({ label: "Meta", valor: fmt(row.quantidade) });
    campos.push({ label: "Recebido", valor: fmt(row.quantidade_recebida) });
    if (row.data_inicio) campos.push({ label: "Início", valor: fmt(row.data_inicio) });
    if (row.data_fim) campos.push({ label: "Término", valor: fmt(row.data_fim) });
    if (row.local_atividade) campos.push({ label: "Local", valor: fmt(row.local_atividade) });
    if (row.turno) campos.push({ label: "Turno", valor: fmt(row.turno) });
    link = `/necessidades/${row.id}`;
    linkTexto = "Ver necessidade";
  } else if (userTipo === "ong" && tipo === "relatorio") {
    campos.push({ label: "ID do relatório", valor: `#${fmt(row.id)}` });
    campos.push({ label: "Título", valor: fmt(row.titulo) });
    campos.push({ label: "Status", valor: STATUS_LABEL[row.status] ?? fmt(row.status) });
    if (row.data_publicacao) campos.push({ label: "Publicado em", valor: fmt(row.data_publicacao) });
    if (row.pessoas_beneficiadas) campos.push({ label: "Pessoas beneficiadas", valor: fmt(row.pessoas_beneficiadas) });
    if (row.descricao) campos.push({ label: "Descrição", valor: fmt(row.descricao) });
    link = `/relatorios/${row.id}`;
    linkTexto = "Ver relatório";
  } else if (userTipo === "ong" && tipo === "evidencia") {
    if (row.legenda) campos.push({ label: "Legenda", valor: fmt(row.legenda) });
    campos.push({ label: "Necessidade", valor: fmt(row.necessidade_titulo) });
    if (row.criado_em_fmt) campos.push({ label: "Registrado em", valor: fmt(row.criado_em_fmt) });
    link = `/necessidades/${row.necessidade_id}`;
    linkTexto = "Ver necessidade";
  } else if (userTipo === "empresa" && tipo === "marketplace") {
    campos.push({ label: "ID do item", valor: `#${fmt(row.id)}` });
    campos.push({ label: "Título", valor: fmt(row.titulo) });
    campos.push({ label: "Tipo", valor: fmt(row.tipo) });
    campos.push({ label: "Status", valor: STATUS_LABEL[row.status_publicacao] ?? fmt(row.status_publicacao) });
    campos.push({ label: "Preço", valor: MODO_PRECO_LABEL[row.modo_preco] ?? fmt(row.modo_preco) });
    if (row.preco) campos.push({ label: "Valor", valor: `R$ ${Number(row.preco).toFixed(2)}` });
    if (row.descricao) campos.push({ label: "Descrição", valor: fmt(row.descricao) });
    if (row.criado_em_fmt) campos.push({ label: "Publicado em", valor: fmt(row.criado_em_fmt) });
    link = `/empresa/marketplace`;
    linkTexto = "Ver marketplace";
  }

  return { campos, link, linkTexto };
}

export async function getMesPorId(params: {
  id: number;
  userTipo: string;
  userId: number;
}): Promise<{ ok: boolean; mes?: string; data?: string }> {
  const row = await calendarioRepo.buscarMesPorId(params.id, params.userTipo, params.userId);
  if (!row) return { ok: false };
  return { ok: true, mes: row.mes, data: row.data };
}

export async function getDetalheEvento(params: {
  tipo: string;
  id: number;
  userTipo: string;
  userId: number;
}): Promise<{ ok: true; campos: Campo[]; link: string; linkTexto: string } | { ok: false; error: string }> {
  try {
    const row = await calendarioRepo.buscarDetalheEvento(
      params.tipo,
      params.id,
      params.userTipo,
      params.userId
    );
    if (!row) return { ok: false, error: "Evento não encontrado" };
    const { campos, link, linkTexto } = buildCampos(params.tipo, params.userTipo, row);
    return { ok: true, campos, link, linkTexto };
  } catch {
    return { ok: false, error: "Erro ao buscar detalhes" };
  }
}
