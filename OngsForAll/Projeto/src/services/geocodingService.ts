export type Coordenadas = {
  latitude: number;
  longitude: number;
};

type NominatimResult = {
  lat: string;
  lon: string;
};

export async function geocodificarEndereco(params: {
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
}): Promise<Coordenadas | null> {
  const { logradouro, numero, bairro, cidade, estado } = params;

  const partes: string[] = [];
  if (logradouro) partes.push(numero ? `${logradouro}, ${numero}` : logradouro);
  if (bairro)     partes.push(bairro);
  if (cidade)     partes.push(cidade);
  if (estado)     partes.push(estado);
  partes.push("Brasil");

  // Exige ao menos cidade para geocodificar
  if (!cidade) return null;

  const q = encodeURIComponent(partes.join(", "));
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=br`;

  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": "ONGsForAll/1.0 (TCC-2025; ruiz.victorvieira@gmail.com)",
        "Accept-Language": "pt-BR,pt;q=0.9",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;

    const results = (await resp.json()) as NominatimResult[];
    if (!results.length) return null;

    return {
      latitude: parseFloat(results[0].lat),
      longitude: parseFloat(results[0].lon),
    };
  } catch {
    return null;
  }
}
