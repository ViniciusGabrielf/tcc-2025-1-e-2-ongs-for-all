type ViacepResponse = {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean | string;
};

export type EnderecoViaCep = {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
};

export async function buscarCep(cep: string): Promise<EnderecoViaCep | null> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return null;

  try {
    const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: AbortSignal.timeout(5000),
      headers: { Accept: "application/json" },
    });
    if (!resp.ok) return null;

    const data = (await resp.json()) as ViacepResponse;
    if (data.erro) return null;

    return {
      logradouro: data.logradouro ?? "",
      bairro: data.bairro ?? "",
      cidade: data.localidade ?? "",
      estado: data.uf ?? "",
    };
  } catch {
    return null;
  }
}
