import bcrypt from "bcryptjs";
import * as perfilRepo from "../repositories/perfilRepository";
import { validatePerfil } from "../validators/perfilValidator";
import * as notificacaoService from "./notificacaoService";

function onlyDigits(value?: string | null): string {
  return (value ?? "").replace(/\D/g, "");
}

export function formatCpf(value?: string | null): string {
  const digits = onlyDigits(value);
  if (digits.length !== 11) return value ?? "";
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

export function formatCnpj(value?: string | null): string {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return value ?? "";
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

function mapDocumentoStatus(controle: any, label: "CPF" | "CNPJ") {
  const statusSolicitacao =
    controle?.status_solicitacao === "pendente" || controle?.status_solicitacao === "rejeitado"
      ? controle.status_solicitacao
      : null;
  const pendenteRaw = label === "CPF" ? controle?.cpf_pendente : controle?.cnpj_pendente;
  const documentoPendente = label === "CPF" ? formatCpf(pendenteRaw) : formatCnpj(pendenteRaw);
  const possuiSolicitacaoPendente = statusSolicitacao === "pendente";
  const solicitacaoRejeitada = statusSolicitacao === "rejeitado";

  let mensagem: string | null = null;
  if (possuiSolicitacaoPendente) {
    mensagem = `A alteração do ${label} está pendente de aprovação do admin.`;
  } else if (solicitacaoRejeitada) {
    mensagem = `A última solicitação de alteração do ${label} foi rejeitada.`;
  }

  return {
    label,
    documentoPendente,
    statusSolicitacao,
    observacaoAdmin: controle?.observacao_admin ?? null,
    possuiSolicitacaoPendente,
    solicitacaoRejeitada,
    mensagem,
  };
}

export async function getUserProfile(userId: number) {
  const user = await perfilRepo.findUserById(userId);
  if (!user) return { ok: false as const };

  let controle = await perfilRepo.findUserCpfControle(userId);
  if (!controle) {
    await perfilRepo.upsertUserCpfControle({ userId, statusAtual: "validado" });
    controle = await perfilRepo.findUserCpfControle(userId);
  }

  return {
    ok: true as const,
    user: { ...user, cpf: formatCpf(user.cpf), documentoStatus: mapDocumentoStatus(controle, "CPF") },
  };
}

export async function getOngProfile(ongId: number) {
  const ong = await perfilRepo.findOngById(ongId);
  if (!ong) return { ok: false as const };

  let controle = await perfilRepo.findOngCnpjControle(ongId);
  if (!controle) {
    await perfilRepo.upsertOngCnpjControle({ ongId, statusAtual: "validado" });
    controle = await perfilRepo.findOngCnpjControle(ongId);
  }

  return {
    ok: true as const,
    user: { ...ong, cnpj: formatCnpj(ong.cnpj), documentoStatus: mapDocumentoStatus(controle, "CNPJ") },
  };
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
  cpf?: string;
  password?: string;
}) {
  const { userId, nome, email, telefone, cpf, password } = params;

  const validation = validatePerfil({ nome, email, telefone, password, isOng: false });
  if (!validation.isValid) {
    return { ok: false as const, error: validation.errors[0] };
  }

  const user = await perfilRepo.findUserById(userId);
  if (!user) return { ok: false as const, error: "Perfil não encontrado." };

  let documentoSolicitacaoCriada = false;
  const cpfNormalizado = onlyDigits(cpf);
  const cpfAtual = onlyDigits(user.cpf);

  if (cpfNormalizado && cpfNormalizado !== cpfAtual) {
    if (cpfNormalizado.length !== 11) {
      return { ok: false as const, error: "Informe um CPF válido com 11 dígitos." };
    }

    const usuarioComMesmoCpf = await perfilRepo.findUserByNormalizedCpfExcludingId(cpfNormalizado, userId);
    if (usuarioComMesmoCpf) {
      return { ok: false as const, error: "Este CPF já está vinculado a outro usuário." };
    }

    const usuarioComMesmoCpfPendente = await perfilRepo.findUserByPendingNormalizedCpfExcludingId(cpfNormalizado, userId);
    if (usuarioComMesmoCpfPendente) {
      return { ok: false as const, error: "Este CPF já está pendente de aprovação para outro usuário." };
    }

    await perfilRepo.upsertUserCpfControle({
      userId,
      statusAtual: "validado",
      cpfPendente: formatCpf(cpfNormalizado),
      statusSolicitacao: "pendente",
      observacaoAdmin: null,
    });
    documentoSolicitacaoCriada = true;
  }

  const passwordHash = await hashPassword(password);

  await perfilRepo.updateUserProfile(userId, nome.trim(), email.trim(), telefone ?? null, passwordHash);
  return { ok: true as const, documentoSolicitacaoCriada };
}

export async function updateOngProfile(params: {
  ongId: number;
  nome: string;
  email: string;
  telefone?: string;
  areaAtuacao?: string;
  cnpj?: string;
  password?: string;
}) {
  const { ongId, nome, email, telefone, areaAtuacao, cnpj, password } = params;

  const validation = validatePerfil({ nome, email, telefone, password, areaAtuacao, isOng: true });
  if (!validation.isValid) {
    return { ok: false as const, error: validation.errors[0] };
  }

  const ong = await perfilRepo.findOngById(ongId);
  if (!ong) return { ok: false as const, error: "Perfil não encontrado." };

  let documentoSolicitacaoCriada = false;
  const cnpjNormalizado = onlyDigits(cnpj);
  const cnpjAtual = onlyDigits(ong.cnpj);

  if (cnpjNormalizado && cnpjNormalizado !== cnpjAtual) {
    if (cnpjNormalizado.length !== 14) {
      return { ok: false as const, error: "Informe um CNPJ válido com 14 dígitos." };
    }

    const ongComMesmoCnpj = await perfilRepo.findOngByNormalizedCnpjExcludingId(cnpjNormalizado, ongId);
    if (ongComMesmoCnpj) {
      return { ok: false as const, error: "Este CNPJ já está vinculado a outra ONG." };
    }

    const ongComMesmoCnpjPendente = await perfilRepo.findOngByPendingNormalizedCnpjExcludingId(cnpjNormalizado, ongId);
    if (ongComMesmoCnpjPendente) {
      return { ok: false as const, error: "Este CNPJ já está pendente de aprovação para outra ONG." };
    }

    await perfilRepo.upsertOngCnpjControle({
      ongId,
      statusAtual: "validado",
      cnpjPendente: formatCnpj(cnpjNormalizado),
      statusSolicitacao: "pendente",
      observacaoAdmin: null,
    });
    documentoSolicitacaoCriada = true;
  }

  const passwordHash = await hashPassword(password);

  await perfilRepo.updateOngProfile(ongId, nome.trim(), email.trim(), telefone ?? null, areaAtuacao ?? null, passwordHash);
  return { ok: true as const, documentoSolicitacaoCriada };
}

export async function getDocumentosPendentesAdmin() {
  const pendencias = await perfilRepo.listarDocumentosPendentesParaAdmin();
  return {
    usuarios: pendencias.usuarios.map((u: any) => ({
      ...u,
      documento_atual: formatCpf(u.documento_atual),
      documento_pendente: formatCpf(u.documento_pendente),
    })),
    ongs: pendencias.ongs.map((o: any) => ({
      ...o,
      documento_atual: formatCnpj(o.documento_atual),
      documento_pendente: formatCnpj(o.documento_pendente),
    })),
  };
}

export async function aprovarDocumentoPerfil(tipo: "usuario" | "ong", id: number) {
  if (tipo === "usuario") {
    await perfilRepo.aprovarCpfPendente(id);
    await notificacaoService.criarNotificacaoParaUsuario({
      usuarioId: id,
      titulo: "CPF aprovado",
      mensagem: "Sua alteração de CPF foi aprovada pelo admin e já está atualizada no perfil.",
      tipo: "documento_aprovado",
    });
    return;
  }

  await perfilRepo.aprovarOngCnpjPendente(id);
  await notificacaoService.criarNotificacaoParaOng({
    ongId: id,
    titulo: "CNPJ aprovado",
    mensagem: "Sua alteração de CNPJ foi aprovada pelo admin e já está atualizada no perfil.",
    tipo: "documento_aprovado",
  });
}

export async function rejeitarDocumentoPerfil(tipo: "usuario" | "ong", id: number, observacao?: string) {
  const obs = observacao?.trim() || null;
  if (tipo === "usuario") {
    await perfilRepo.rejeitarCpfPendente(id, obs);
    await notificacaoService.criarNotificacaoParaUsuario({
      usuarioId: id,
      titulo: "CPF não aprovado",
      mensagem: `Sua alteração de CPF não foi aprovada pelo admin.${obs ? ` Motivo: ${obs}` : ""}`,
      tipo: "documento_rejeitado",
    });
    return;
  }

  await perfilRepo.rejeitarOngCnpjPendente(id, obs);
  await notificacaoService.criarNotificacaoParaOng({
    ongId: id,
    titulo: "CNPJ não aprovado",
    mensagem: `Sua alteração de CNPJ não foi aprovada pelo admin.${obs ? ` Motivo: ${obs}` : ""}`,
    tipo: "documento_rejeitado",
  });
}
