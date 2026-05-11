type LoginData = {
  email?: string;
  password?: string;
};

type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

export function validateLogin(data: LoginData): ValidationResult {
  const errors: string[] = [];

  if (!data.email || data.email.trim() === "") {
    errors.push("O e-mail é obrigatório.");
  } else {
    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValido.test(data.email)) {
      errors.push("Informe um e-mail válido.");
    }
  }

  if (!data.password || data.password.trim() === "") {
    errors.push("A senha é obrigatória.");
  } else if (data.password.length < 6) {
    errors.push("A senha deve ter pelo menos 6 caracteres.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}