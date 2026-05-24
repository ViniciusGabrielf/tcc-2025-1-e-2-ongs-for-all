type LoginData = {
  email?: string;
  password?: string;
};

type ValidationResult = {
  isValid: boolean;
  errors: string[];
};

export function validateLogin(data: LoginData): ValidationResult {
  const genericError = "E-mail ou senha incorretos";

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const emailOk = data.email && data.email.trim() !== "" && emailValido.test(data.email);
  const passwordOk = data.password && data.password.trim() !== "" && data.password.length >= 6;

  if (!emailOk || !passwordOk) {
    return { isValid: false, errors: [genericError] };
  }

  return { isValid: true, errors: [] };
}