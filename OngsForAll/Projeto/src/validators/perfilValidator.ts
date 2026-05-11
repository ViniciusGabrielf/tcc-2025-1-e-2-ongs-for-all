type PerfilInput = {
  nome?: string;
  email?: string;
  telefone?: string;
  password?: string;
  areaAtuacao?: string;
  isOng?: boolean;
};

export function validatePerfil(data: PerfilInput) {
  const errors: string[] = [];

  const nome = data.nome?.trim();
  const email = data.email?.trim();

  if (!nome || nome.length < 2) {
    errors.push("O nome deve ter pelo menos 2 caracteres.");
  }

  if (!email || email.length === 0) {
    errors.push("O e-mail é obrigatório.");
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push("Informe um e-mail válido.");
    }
  }

  if (data.telefone && data.telefone.trim().length > 0) {
    const tel = data.telefone.replace(/\D/g, "");
    if (tel.length < 10 || tel.length > 11) {
      errors.push("Informe um telefone válido com DDD (10 ou 11 dígitos).");
    }
  }

  if (data.password && data.password.length > 0) {
    if (data.password.length < 6) {
      errors.push("A senha deve ter no mínimo 6 caracteres.");
    }
  }

  if (data.isOng && data.areaAtuacao && data.areaAtuacao.trim().length > 0) {
    if (data.areaAtuacao.trim().length < 3) {
      errors.push("A área de atuação deve ter pelo menos 3 caracteres.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
