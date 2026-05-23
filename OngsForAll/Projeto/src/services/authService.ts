import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  findUserByEmail,
  insertLoginLog,
  findUserIdByNomeEmailCpf,
  setResetTokenHash,
  findUserIdByValidResetTokenHash,
  updatePasswordAndClearReset,
  findOngByEmail,
  findEmpresaByEmailAuth,
} from "../repositories/authRepository";

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateResetToken(): { token: string; tokenHash: string } {
  const token = crypto.randomInt(100000, 999999).toString();
  return { token, tokenHash: hashResetToken(token) };
}

export async function login(email: string, password: string, ip: string) {
  const dataHora = new Date();

  let user: any = await findUserByEmail(email);
  let tipo: "usuario" | "ong" | "empresa" = "usuario";

  // se não encontrou usuário, tenta ONG
  if (!user) {
    user = await findOngByEmail(email);
    tipo = "ong";
  }

  // se não encontrou ONG, tenta empresa
  if (!user) {
    user = await findEmpresaByEmailAuth(email);
    tipo = "empresa";
  }

  const ok = user ? await bcrypt.compare(password, user.senha) : false;

  await insertLoginLog(email, ip, dataHora, ok);

  if (!user || !ok) return { ok: false as const };

  return {
    ok: true as const,
    user: {
      id: user.id || user.ong_id,
      nome: user.nome,
      email: user.email,
      tipo,
      ...(tipo === "ong" && user.logo ? { logo: user.logo } : {}),
    },
  };
}

export async function requestPasswordReset(nome: string, email: string, cpf: string) {
  const userId = await findUserIdByNomeEmailCpf(nome.trim(), email.trim(), normalizeDigits(cpf));
  if (!userId) return { ok: false as const };

  const { token, tokenHash } = generateResetToken();
  await setResetTokenHash(userId, tokenHash);

  return { ok: true as const, token };
}

export async function resetPassword(token: string, password: string) {
  const tokenHash = hashResetToken(token);
  const userId = await findUserIdByValidResetTokenHash(tokenHash);

  if (!userId) return { ok: false as const };

  const passwordHash = await bcrypt.hash(password, 10);
  await updatePasswordAndClearReset(userId, passwordHash);

  return { ok: true as const };
}

