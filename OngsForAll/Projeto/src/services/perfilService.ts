import bcrypt from "bcryptjs";
import * as perfilRepo from "../repositories/perfilRepository";
import { validatePerfil } from "../validators/perfilValidator";

export async function getUserProfile(userId: number) {
  const user = await perfilRepo.findUserById(userId);
  if (!user) return { ok: false as const };
  return { ok: true as const, user };
}

export async function getOngProfile(ongId: number) {
  const ong = await perfilRepo.findOngById(ongId);
  if (!ong) return { ok: false as const };
  return { ok: true as const, user: ong };
}

async function hashPassword(password?: string): Promise<string | null> {
  if (!password || password.length === 0) return null;
  return await bcrypt.hash(password, 10);
}

export async function updateProfile(params: {
  userId: number;
  nome: string;
  email: string;
  telefone?: string;
  password?: string;
}) {
  const { userId, nome, email, telefone, password } = params;

  const validation = validatePerfil({ nome, email, telefone, password, isOng: false });
  if (!validation.isValid) {
    return { ok: false as const, error: validation.errors[0] };
  }

  const passwordHash = await hashPassword(password);

  await perfilRepo.updateUserProfile(userId, nome.trim(), email.trim(), telefone ?? null, passwordHash);
  return { ok: true as const };
}

export async function updateOngProfile(params: {
  ongId: number;
  nome: string;
  email: string;
  telefone?: string;
  areaAtuacao?: string;
  password?: string;
}) {
  const { ongId, nome, email, telefone, areaAtuacao, password } = params;

  const validation = validatePerfil({ nome, email, telefone, password, areaAtuacao, isOng: true });
  if (!validation.isValid) {
    return { ok: false as const, error: validation.errors[0] };
  }

  const passwordHash = await hashPassword(password);

  await perfilRepo.updateOngProfile(ongId, nome.trim(), email.trim(), telefone ?? null, areaAtuacao ?? null, passwordHash);
  return { ok: true as const };
}