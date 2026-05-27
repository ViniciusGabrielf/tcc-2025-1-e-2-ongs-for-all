import * as repo from "../repositories/apoiadoresRepository";
import type { PlanApoiador, StatusApoiador } from "../repositories/apoiadoresRepository";

export const PLANO_CONFIG: Record<PlanApoiador, { prioridade: number; valor: number; label: string; descMax: number }> = {
  basico:        { prioridade: 1, valor: 29.90, label: "Apoiador", descMax: 200 },
  local:         { prioridade: 1, valor: 29.90, label: "Apoiador", descMax: 200 },
  destaque:      { prioridade: 1, valor: 29.90, label: "Apoiador", descMax: 200 },
  institucional: { prioridade: 1, valor: 29.90, label: "Apoiador", descMax: 200 },
};

function validarUrl(url: string | undefined): string | null {
  if (!url || url.trim() === "") return null;
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

function validarData(data: string | undefined): string | null {
  if (!data || data.trim() === "") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data.trim())) return null;
  return data.trim();
}

export async function criarApoiador(params: {
  nome: string;
  logo_url?: string | null;
  website_url?: string;
  descricao?: string;
  plano: string;
  valor_mensal?: string;
  data_inicio: string;
  data_fim?: string;
  status?: string;
}): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const nome = params.nome?.trim();
  if (!nome) return { ok: false, error: "Nome é obrigatório." };

  const plano = params.plano as PlanApoiador;
  if (!PLANO_CONFIG[plano]) return { ok: false, error: "Plano inválido." };

  const dataInicio = validarData(params.data_inicio);
  if (!dataInicio) return { ok: false, error: "Data de início inválida." };

  const dataFim = params.data_fim ? validarData(params.data_fim) : null;
  if (params.data_fim && params.data_fim.trim() !== "" && !dataFim)
    return { ok: false, error: "Data de término inválida." };
  if (dataFim && dataFim < dataInicio)
    return { ok: false, error: "Data de término deve ser posterior à data de início." };

  const websiteUrl = validarUrl(params.website_url);
  if (params.website_url && params.website_url.trim() !== "" && !websiteUrl)
    return { ok: false, error: "Link externo inválido. Use http:// ou https://." };

  const cfg = PLANO_CONFIG[plano];
  const valorRaw = parseFloat(params.valor_mensal ?? "");
  const valorMensal = isNaN(valorRaw) || valorRaw <= 0 ? cfg.valor : valorRaw;

  const descricao = params.descricao?.trim().slice(0, cfg.descMax) || null;
  const status = (["ativo", "pausado"].includes(params.status ?? "")) ? params.status as StatusApoiador : "pausado";

  const id = await repo.criar({
    nome,
    logo_url: params.logo_url ?? null,
    website_url: websiteUrl,
    descricao,
    plano,
    valor_mensal: valorMensal,
    prioridade: cfg.prioridade,
    status,
    data_inicio: dataInicio,
    data_fim: dataFim,
  });

  return { ok: true, id };
}

export async function atualizarApoiador(id: number, params: {
  nome: string;
  logo_url?: string | null;
  website_url?: string;
  descricao?: string;
  plano: string;
  valor_mensal?: string;
  data_inicio: string;
  data_fim?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const nome = params.nome?.trim();
  if (!nome) return { ok: false, error: "Nome é obrigatório." };

  const plano = params.plano as PlanApoiador;
  if (!PLANO_CONFIG[plano]) return { ok: false, error: "Plano inválido." };

  const dataInicio = validarData(params.data_inicio);
  if (!dataInicio) return { ok: false, error: "Data de início inválida." };

  const dataFim = params.data_fim ? validarData(params.data_fim) : null;
  if (params.data_fim && params.data_fim.trim() !== "" && !dataFim)
    return { ok: false, error: "Data de término inválida." };
  if (dataFim && dataFim < dataInicio)
    return { ok: false, error: "Data de término deve ser posterior à data de início." };

  const websiteUrl = validarUrl(params.website_url);
  if (params.website_url && params.website_url.trim() !== "" && !websiteUrl)
    return { ok: false, error: "Link externo inválido. Use http:// ou https://." };

  const cfg = PLANO_CONFIG[plano];
  const valorRaw = parseFloat(params.valor_mensal ?? "");
  const valorMensal = isNaN(valorRaw) || valorRaw <= 0 ? cfg.valor : valorRaw;

  const descricao = params.descricao?.trim().slice(0, cfg.descMax) || null;

  await repo.atualizar(id, {
    nome,
    logo_url: params.logo_url,
    website_url: websiteUrl,
    descricao,
    plano,
    valor_mensal: valorMensal,
    prioridade: cfg.prioridade,
    data_inicio: dataInicio,
    data_fim: dataFim,
  });

  return { ok: true };
}

export async function ativar(id: number): Promise<void> {
  await repo.atualizarStatus(id, "ativo");
}

export async function pausar(id: number): Promise<void> {
  await repo.atualizarStatus(id, "pausado");
}

export async function encerrar(id: number): Promise<void> {
  await repo.atualizarStatus(id, "encerrado");
}

export { PLANO_CONFIG as planosConfig };
