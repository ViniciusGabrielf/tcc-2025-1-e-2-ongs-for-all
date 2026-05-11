import * as evidenciaRepo from "../repositories/evidenciaRepository";

export async function uploadEvidencia(params: {
  interesseId: number;
  ongId: number;
  imagemUrl: string;
  legenda?: string;
}) {
  const interesse = await evidenciaRepo.buscarInteressePorId(params.interesseId);

  if (!interesse) {
    return { ok: false as const, error: "Interesse não encontrado." };
  }

  if (Number(interesse.ong_id) !== Number(params.ongId)) {
    return { ok: false as const, error: "Você não tem permissão para adicionar evidências a este interesse." };
  }

  if (interesse.status !== "recebido") {
    return { ok: false as const, error: "Só é possível adicionar evidências a interesses já recebidos." };
  }

  await evidenciaRepo.createEvidencia({
    interesseId: params.interesseId,
    ongId: params.ongId,
    imagemUrl: params.imagemUrl,
    legenda: params.legenda,
  });

  return { ok: true as const };
}

export async function listarEvidencias(interesseId: number) {
  return evidenciaRepo.findByInteresseId(interesseId);
}
