const CNPJ_WS_BASE_URL = (process.env.CNPJ_WS_BASE_URL || "https://publica.cnpj.ws/cnpj").replace(/\/$/, "");
const CNPJ_WS_TIMEOUT_MS = Number(process.env.CNPJ_WS_TIMEOUT_MS ?? "4000");
const CNPJ_WS_DISABLE_LOOKUP = process.env.CNPJ_WS_DISABLE_LOOKUP === "1";

type CnpjApiResponse = {
  razao_social?: string;
  estabelecimento?: {
    nome_fantasia?: string;
    situacao_cadastral?: string;
    situacao_cadastral_descricao?: string;
  };
};

export type CnpjValidationResult =
  | {
      ok: true;
      cnpj: string;
      lookupSource: "api" | "fallback";
      razaoSocial?: string;
      nomeFantasia?: string;
    }
  | {
      ok: false;
      message: string;
    };

export function normalizeCnpj(value: string | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function formatCnpj(value: string): string {
  return value.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

export function isValidCnpj(rawValue: string | undefined): boolean {
  const cnpj = normalizeCnpj(rawValue);

  if (!/^\d{14}$/.test(cnpj)) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const digits = cnpj.split("").map(Number);
  const calcDigit = (base: number[], weights: number[]) => {
    const sum = base.reduce((acc, digit, index) => acc + digit * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const digit1 = calcDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const digit2 = calcDigit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return digit1 === digits[12] && digit2 === digits[13];
}

function normalizeText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

async function fetchCnpjData(cnpj: string): Promise<CnpjApiResponse | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CNPJ_WS_TIMEOUT_MS);

  try {
    const response = await fetch(`${CNPJ_WS_BASE_URL}/${cnpj}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`CNPJ lookup failed with status ${response.status}`);
    }

    return (await response.json()) as CnpjApiResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function validateAndLookupCnpj(rawCnpj: string): Promise<CnpjValidationResult> {
  const cnpj = normalizeCnpj(rawCnpj);

  if (!isValidCnpj(cnpj)) {
    return { ok: false, message: "CNPJ inválido." };
  }

  if (CNPJ_WS_DISABLE_LOOKUP) {
    return {
      ok: true,
      cnpj: formatCnpj(cnpj),
      lookupSource: "fallback",
    };
  }

  try {
    const data = await fetchCnpjData(cnpj);

    if (!data) {
      return { ok: false, message: "CNPJ não encontrado." };
    }

    const situacaoDescricao = normalizeText(
      data.estabelecimento?.situacao_cadastral_descricao ?? data.estabelecimento?.situacao_cadastral
    );

    if (situacaoDescricao && situacaoDescricao.toLowerCase() !== "ativa") {
      return { ok: false, message: "CNPJ encontrado, mas não está ativo." };
    }

    return {
      ok: true,
      cnpj: formatCnpj(cnpj),
      lookupSource: "api",
      razaoSocial: normalizeText(data.razao_social),
      nomeFantasia: normalizeText(data.estabelecimento?.nome_fantasia),
    };
  } catch {
    return {
      ok: true,
      cnpj: formatCnpj(cnpj),
      lookupSource: "fallback",
    };
  }
}
