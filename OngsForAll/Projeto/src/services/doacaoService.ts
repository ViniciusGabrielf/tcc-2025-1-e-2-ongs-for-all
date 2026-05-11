import * as doacaoRepo from "../repositories/doacaoRepository";

function parseValorToNumber(valor: string): number {
  const n = Number(String(valor).replace(",", "."));
  if (Number.isNaN(n) || n <= 0) throw new Error("Valor inválido.");
  return n;
}

export async function getNovaDoacaoPageData(
  userId: number,
  necessidadeId?: number
) {
  const ongs = await doacaoRepo.listOngs();

  let necessidade = null;

  if (necessidadeId) {
    necessidade = await doacaoRepo.buscarNecessidadePorId(necessidadeId);

    if (!necessidade) {
      throw new Error("Necessidade não encontrada.");
    }
  }

  return { ongs, necessidade };
}

export async function criarDoacao(params: {
  userId: number;
  valor: string;
  tipo: string;
  ong_id: number;
  necessidade_id?: number;
}) {
  const exists = await doacaoRepo.userExists(params.userId);

  if (!exists) {
    return {
      ok: false as const,
      error: "Apenas usuários podem realizar doações.",
    };
  }

  const valorNumber = parseValorToNumber(params.valor);

  let necessidade = null;

  if (params.necessidade_id) {
    necessidade = await doacaoRepo.buscarNecessidadePorId(params.necessidade_id);

    if (!necessidade) {
      return {
        ok: false as const,
        error: "Necessidade não encontrada.",
      };
    }

    if (Number(necessidade.ong_id) !== Number(params.ong_id)) {
      return {
        ok: false as const,
        error: "A necessidade não pertence à ONG selecionada.",
      };
    }
  }

  await doacaoRepo.createDoacao({
    usuarioId: params.userId,
    valor: valorNumber,
    tipo: params.tipo,
    ongId: Number(params.ong_id),
    necessidadeId: params.necessidade_id ?? null,
  });

  return { ok: true as const };
}

export async function listarHistorico(userId: number) {
  const doacoes = await doacaoRepo.listHistoricoByUser(userId);
  return { doacoes };
}

export async function totaisPorOng() {
  const dados = await doacaoRepo.totalPorOng();
  return { dados };
}