import * as localizacaoRepo from "../repositories/localizacaoRepository";

export type EstadoLocalizacao = "com_coordenadas" | "endereco_apenas" | "sem_localizacao" | "remoto";

export type LocalizacaoPublica = {
  estado: EstadoLocalizacao;
  ong: { id: number; nome: string };
  localizacaoAproximada: boolean;
  enderecoTexto: string | null;
  bairro: string | null;
  cidade: string | null;
  estadoUF: string | null;
  latitude: number | null;
  longitude: number | null;
  instrucoesChegada: string | null;
  googleMapsUrl: string | null;
};

function buildEnderecoTexto(row: any): string | null {
  const partes = [
    row.logradouro,
    row.numero,
    row.complemento,
    row.bairro,
    row.cidade,
    row.estado ? `${row.estado}` : null,
  ].filter(Boolean) as string[];
  return partes.length > 0 ? partes.join(", ") : null;
}

function buildGoogleMapsUrl(row: any): string | null {
  const lat = row.latitude ? Number(row.latitude) : null;
  const lon = row.longitude ? Number(row.longitude) : null;

  if (lat !== null && lon !== null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
  }

  const texto = buildEnderecoTexto(row);
  if (texto) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(texto)}`;
  }

  return null;
}

export async function getLocalizacaoPublica(ongId: number): Promise<LocalizacaoPublica | null> {
  const row = await localizacaoRepo.findLocalizacaoPublicaByOngId(ongId);
  if (!row) return null;

  const base = { ong: { id: Number(row.id), nome: row.nome } };

  const semGeo = { bairro: null, cidade: null, estadoUF: null };

  if (row.atendimento_remoto) {
    return {
      ...base, ...semGeo,
      estado: "remoto",
      localizacaoAproximada: false,
      enderecoTexto: null,
      latitude: null,
      longitude: null,
      instrucoesChegada: row.instrucoes_chegada ?? null,
      googleMapsUrl: null,
    };
  }

  if (!row.localizacao_publica) {
    return {
      ...base, ...semGeo,
      estado: "sem_localizacao",
      localizacaoAproximada: false,
      enderecoTexto: null,
      latitude: null,
      longitude: null,
      instrucoesChegada: null,
      googleMapsUrl: null,
    };
  }

  const lat = row.latitude ? Number(row.latitude) : null;
  const lon = row.longitude ? Number(row.longitude) : null;
  const temCoordenadas = lat !== null && lon !== null;

  return {
    ...base,
    estado: temCoordenadas ? "com_coordenadas" : "endereco_apenas",
    localizacaoAproximada: !!row.localizacao_aproximada,
    enderecoTexto: buildEnderecoTexto(row),
    bairro:   row.bairro  ?? null,
    cidade:   row.cidade  ?? null,
    estadoUF: row.estado  ?? null,
    latitude: lat,
    longitude: lon,
    instrucoesChegada: row.instrucoes_chegada ?? null,
    googleMapsUrl: buildGoogleMapsUrl(row),
  };
}

export function buildGoogleMapsUrlComOrigem(params: {
  destinoLat?: number | null;
  destinoLon?: number | null;
  destinoTexto?: string | null;
  origemTexto?: string;
}): string | null {
  const { destinoLat, destinoLon, destinoTexto, origemTexto } = params;

  let destino: string;
  if (destinoLat !== null && destinoLat !== undefined && destinoLon !== null && destinoLon !== undefined) {
    destino = `${destinoLat},${destinoLon}`;
  } else if (destinoTexto) {
    destino = encodeURIComponent(destinoTexto);
  } else {
    return null;
  }

  if (origemTexto && origemTexto.trim()) {
    const origem = encodeURIComponent(origemTexto.trim());
    return `https://www.google.com/maps/dir/?api=1&origin=${origem}&destination=${destino}`;
  }

  return `https://www.google.com/maps/dir/?api=1&destination=${destino}`;
}
