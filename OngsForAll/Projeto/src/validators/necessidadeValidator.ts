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
    errors.push("O título deve ter pelo menos 3 caracteres.");
  }

  if (!descricao || descricao.length < 10) {
    errors.push("A descrição deve ter pelo menos 10 caracteres.");
  }

  if (!categoria || categoria.length === 0) {
    errors.push("Informe a categoria.");
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    errors.push("Tipo de necessidade inválido.");
  }

  if (tipo === "voluntariado") {
    if (!data.local_atividade || !LOCAIS_VALIDOS.includes(data.local_atividade)) {
      errors.push("Informe o local da atividade (presencial, remoto ou híbrido).");
    }

    if (data.turno && !TURNOS_VALIDOS.includes(data.turno)) {
      errors.push("Turno inválido.");
    }

    if (data.data_inicio && data.data_fim && data.data_inicio > data.data_fim) {
      errors.push("A data de início não pode ser posterior à data de término.");
    }
  }

  if (tipo !== "voluntariado") {
    if (Number.isNaN(quantidade) || quantidade < 1) {
      errors.push("A quantidade deve ser maior que zero.");
    }
  } else {
    // para voluntariado, quantidade = vagas (opcional, default 1)
    if (!Number.isNaN(quantidade) && quantidade < 0) {
      errors.push("O número de vagas não pode ser negativo.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

const STATUS_VALIDOS = ["aberta", "em_andamento", "concluida", "cancelada"];

export function validateStatus(status?: string) {
  if (!status || !STATUS_VALIDOS.includes(status)) {
    return { isValid: false, error: "Status inválido." };
  }
  return { isValid: true, error: null };
}
