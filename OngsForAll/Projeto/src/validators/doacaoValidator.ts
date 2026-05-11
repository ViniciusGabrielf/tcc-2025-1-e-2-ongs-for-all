type DoacaoInput = {
  ong_id?: number;
  valor?: number;
  tipo?: string;
};

export function validateDoacao(data: DoacaoInput) {
  const errors: string[] = [];

  if (!data.ong_id || isNaN(Number(data.ong_id))) {
    errors.push("ONG inválida.");
  }

  if (!data.valor || isNaN(Number(data.valor))) {
    errors.push("Valor inválido.");
  } else if (Number(data.valor) <= 0) {
    errors.push("O valor da doação deve ser maior que zero.");
  }

  if (!data.tipo || data.tipo.trim() === "") {
    errors.push("O tipo de doação é obrigatório.");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}