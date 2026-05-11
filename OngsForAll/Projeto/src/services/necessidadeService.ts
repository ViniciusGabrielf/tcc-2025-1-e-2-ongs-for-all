import * as necessidadeRepository from "../repositories/necessidadeRepository";
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
  const categoria = params.categoria.trim();
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

export async function listarNecessidadesAbertas(ongId?: number, tipo?: string) {
  const necessidades = await necessidadeRepository.findAllAbertas(ongId, tipo);
  return {
    ok: true as const,
    necessidades: necessidades.map(enrichNecessidade),
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

export async function listarNecessidadesDaOng(ongId: number, status?: string) {
  const filtro = STATUS_FILTRO_VALIDOS.includes(status || "") ? status : undefined;
  const rows = await necessidadeRepository.findByOngId(ongId, filtro);
  const necessidades = rows.map(enrichNecessidade);
  return { ok: true as const, necessidades, filtroAtual: filtro ?? "todos" };
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
