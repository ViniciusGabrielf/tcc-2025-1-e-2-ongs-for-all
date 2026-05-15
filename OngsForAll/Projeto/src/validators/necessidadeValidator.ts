import { isValidNeedCategory, isValidNeedItem } from "../constants/necessidadeCatalogo";

type NecessidadeInput = {
  titulo?: string;
  descricao?: string;
  categoria?: string;
  quantidade?: number;
  tipo_necessidade?: string;
  local_atividade?: string;
  turno?: string;
  data_inicio?: string;
  data_fim?: string;
};

const LOCAIS_VALIDOS = ["presencial", "remoto", "hibrido"];
const TURNOS_VALIDOS = ["manha", "tarde", "noite", "integral"];
const TIPOS_VALIDOS = ["bem", "servico", "voluntariado"];

export function validateNecessidade(data: NecessidadeInput) {
  const errors: string[] = [];

  const titulo = data.titulo?.trim();
  const descricao = data.descricao?.trim();
  const categoria = data.categoria?.trim();
  const quantidade = Number(data.quantidade);
  const tipo = data.tipo_necessidade || "bem";

  if (!titulo || titulo.length < 3) {
    errors.push("Selecione o item da necessidade.");
  }

  if (!descricao || descricao.length === 0) {
    errors.push("Informe uma descricao.");
  }

  if (!categoria || categoria.length === 0) {
    errors.push("Selecione uma categoria.");
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    errors.push("Tipo de necessidade invalido.");
  }

  if (categoria && TIPOS_VALIDOS.includes(tipo) && !isValidNeedCategory(tipo, categoria)) {
    errors.push("Selecione uma categoria valida do catalogo.");
  }

  if (titulo && categoria && TIPOS_VALIDOS.includes(tipo) && !isValidNeedItem(tipo, categoria, titulo)) {
    errors.push("Selecione um item valido da lista.");
  }

  if (tipo === "voluntariado") {
    if (!data.local_atividade || !LOCAIS_VALIDOS.includes(data.local_atividade)) {
      errors.push("Informe o local da atividade (presencial, remoto ou hibrido).");
    }

    if (data.turno && !TURNOS_VALIDOS.includes(data.turno)) {
      errors.push("Turno invalido.");
    }

    if (data.data_inicio && data.data_fim && data.data_inicio > data.data_fim) {
      errors.push("A data de inicio nao pode ser posterior a data de termino.");
    }
  }

  if (tipo !== "voluntariado") {
    if (Number.isNaN(quantidade) || quantidade < 1) {
      errors.push("A quantidade deve ser maior que zero.");
    }
  } else if (!Number.isNaN(quantidade) && quantidade < 0) {
    errors.push("O numero de vagas nao pode ser negativo.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

const STATUS_VALIDOS = ["aberta", "em_andamento", "concluida", "cancelada"];

export function validateStatus(status?: string) {
  if (!status || !STATUS_VALIDOS.includes(status)) {
    return { isValid: false, error: "Status invalido." };
  }

  return { isValid: true, error: null };
}
