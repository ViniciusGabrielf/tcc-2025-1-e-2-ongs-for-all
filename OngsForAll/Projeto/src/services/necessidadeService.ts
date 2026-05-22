import * as necessidadeRepository from "../repositories/necessidadeRepository";
import { findNeedCategory, getNeedCategoryDisplayName } from "../constants/necessidadeCatalogo";
import { notificarTodosUsuarios } from "./notificacaoService";
import { validateNecessidade, validateStatus } from "../validators/necessidadeValidator";

function enrichNecessidade(n: any) {
  return {
    ...n,
    isVoluntariado: n.tipo_necessidade === "voluntariado",
    isBem: n.tipo_necessidade === "bem",
    isServico: n.tipo_necessidade === "servico",
    tipoLabel:
      n.tipo_necessidade === "voluntariado"
        ? "Voluntariado"
        : n.tipo_necessidade === "servico"
        ? "Serviço"
        : "Doação de bem",
  };
}

export async function criarNecessidade(params: {
  ongId: number;
  titulo: string;
  descricao: string;
  categoria: string;
  quantidade: number;
  tipo_necessidade: string;
  local_atividade?: string;
  turno?: string;
  data_inicio?: string;
  data_fim?: string;
}) {
  const tipo = params.tipo_necessidade || "bem";

  const validation = validateNecessidade({
    titulo: params.titulo,
    descricao: params.descricao,
    categoria: params.categoria,
    quantidade: params.quantidade,
    tipo_necessidade: tipo,
    local_atividade: params.local_atividade,
    turno: params.turno,
    data_inicio: params.data_inicio,
    data_fim: params.data_fim,
  });

  if (!validation.isValid) {
    return { ok: false as const, error: validation.errors[0] };
  }

  const titulo = params.titulo.trim();
  const descricao = params.descricao.trim();
  const categoria = getNeedCategoryDisplayName(tipo, params.categoria.trim());
  const quantidade = tipo === "voluntariado" ? (Number(params.quantidade) || 1) : Number(params.quantidade);

  await necessidadeRepository.createNecessidade({
    ongId: params.ongId,
    titulo,
    descricao,
    categoria,
    quantidade,
    tipo_necessidade: tipo as "bem" | "servico" | "voluntariado",
    local_atividade: params.local_atividade || null,
    turno: params.turno || null,
    data_inicio: params.data_inicio || null,
    data_fim: params.data_fim || null,
  });

  const ong = await necessidadeRepository.buscarNomeOngPorId(params.ongId);
  const nomeOng = ong?.nome ?? "Uma ONG";

  await notificarTodosUsuarios({
    titulo: "Nova necessidade cadastrada!",
    mensagem: `${nomeOng} cadastrou uma nova necessidade: "${titulo}". Confira e veja como você pode ajudar!`,
    tipo: "nova_necessidade",
  });

  return { ok: true as const };
}

export async function listarNecessidadesAbertas(
  ongId?: number,
  tipo?: string,
  categoria?: string,
  busca?: string,
  page = 1,
  pageSize = 9
) {
  const categoriaFiltro = categoria ? getNeedCategoryDisplayName(tipo || "", categoria) : undefined;
  const textoBusca = busca?.trim();
  const result = await necessidadeRepository.findAllAbertas({
    ongId,
    tipoNecessidade: tipo,
    categoria: categoriaFiltro,
    busca: textoBusca || undefined,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return {
    ok: true as const,
    necessidades: result.items.map(enrichNecessidade),
    total: result.total,
  };
}

export async function buscarNecessidadePorId(id: number) {
  const necessidade = await necessidadeRepository.findById(id);

  if (!necessidade) {
    return { ok: false as const, error: "Necessidade não encontrada." };
  }

  return {
    ok: true as const,
    necessidade: enrichNecessidade(necessidade),
  };
}

const STATUS_FILTRO_VALIDOS = ["aberta", "em_andamento", "concluida", "cancelada", "todos"];

export async function listarNecessidadesDaOng(ongId: number, status?: string, busca?: string) {
  const filtro = STATUS_FILTRO_VALIDOS.includes(status || "") ? status : undefined;
  const buscaNormalizada = busca?.trim() || undefined;
  const rows = await necessidadeRepository.findByOngId(ongId, filtro, buscaNormalizada);
  const necessidades = rows.map(enrichNecessidade);
  return { ok: true as const, necessidades, filtroAtual: filtro ?? "todos", buscaAtual: buscaNormalizada ?? "" };
}

export async function alterarStatusNecessidade(params: {
  id: number;
  ongId: number;
  status: string;
}) {
  const statusValidation = validateStatus(params.status);
  if (!statusValidation.isValid) {
    return { ok: false as const, error: statusValidation.error! };
  }

  await necessidadeRepository.updateStatus(params.id, params.ongId, params.status);

  return { ok: true as const };
}

export async function buscarNecessidadeDaOngParaEdicao(id: number, ongId: number) {
  const necessidade = await necessidadeRepository.findById(id);

  if (!necessidade) {
    return { ok: false as const, error: "Necessidade nao encontrada." };
  }

  if (Number(necessidade.ong_id) !== Number(ongId)) {
    return { ok: false as const, error: "Voce nao pode editar esta necessidade." };
  }

  const categoriaEncontrada = findNeedCategory(necessidade.tipo_necessidade, necessidade.categoria);

  return {
    ok: true as const,
    necessidade: enrichNecessidade(necessidade),
    form: {
      titulo: necessidade.titulo,
      descricao: necessidade.descricao,
      categoria: categoriaEncontrada?.codigo ?? necessidade.categoria,
      quantidade: necessidade.quantidade,
      tipo_necessidade: necessidade.tipo_necessidade,
      local_atividade: necessidade.local_atividade ?? "",
      turno: necessidade.turno ?? "",
      data_inicio: necessidade.data_inicio ?? "",
      data_fim: necessidade.data_fim ?? "",
    },
  };
}

export async function editarNecessidade(params: {
  id: number;
  ongId: number;
  titulo: string;
  descricao: string;
  categoria: string;
  quantidade: number;
  tipo_necessidade: string;
  local_atividade?: string;
  turno?: string;
  data_inicio?: string;
  data_fim?: string;
}) {
  const necessidadeAtual = await necessidadeRepository.findById(params.id);

  if (!necessidadeAtual) {
    return { ok: false as const, error: "Necessidade nao encontrada." };
  }

  if (Number(necessidadeAtual.ong_id) !== Number(params.ongId)) {
    return { ok: false as const, error: "Voce nao pode editar esta necessidade." };
  }

  const tipo = params.tipo_necessidade || "bem";
  const validation = validateNecessidade({
    titulo: params.titulo,
    descricao: params.descricao,
    categoria: params.categoria,
    quantidade: params.quantidade,
    tipo_necessidade: tipo,
    local_atividade: params.local_atividade,
    turno: params.turno,
    data_inicio: params.data_inicio,
    data_fim: params.data_fim,
  });

  if (!validation.isValid) {
    return { ok: false as const, error: validation.errors[0] };
  }

  const quantidadeRecebidaAtual = Number(necessidadeAtual.quantidade_recebida ?? 0);
  const quantidadeFinal = tipo === "voluntariado" ? (Number(params.quantidade) || 1) : Number(params.quantidade);

  if (quantidadeFinal < quantidadeRecebidaAtual) {
    return {
      ok: false as const,
      error: "A quantidade total nao pode ser menor que o que ja foi recebido.",
    };
  }

  const titulo = params.titulo.trim();
  const descricao = params.descricao.trim();
  const categoria = getNeedCategoryDisplayName(tipo, params.categoria.trim());

  await necessidadeRepository.updateNecessidade({
    id: params.id,
    ongId: params.ongId,
    titulo,
    descricao,
    categoria,
    quantidade: quantidadeFinal,
    tipo_necessidade: tipo as "bem" | "servico" | "voluntariado",
    local_atividade: params.local_atividade || null,
    turno: params.turno || null,
    data_inicio: params.data_inicio || null,
    data_fim: params.data_fim || null,
  });

  return { ok: true as const };
}
