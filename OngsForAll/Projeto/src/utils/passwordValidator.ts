export const SENHA_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export const SENHA_MSG =
  "A senha deve ter no mínimo 8 caracteres, incluindo letra maiúscula, minúscula, número e caractere especial (ex.: . ! @ #).";

export function senhaForte(senha: string): boolean {
  return SENHA_REGEX.test(senha);
}
