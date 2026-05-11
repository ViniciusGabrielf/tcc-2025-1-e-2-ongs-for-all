import * as relatorioRepo from "../repositories/relatorioRepository";

export async function criarRelatorio(params: {
  ongId: number;
  titulo: string;
  descricao: string;
  necessidadeId?: number;
  pessoasBeneficiadas?: number;
  dataPublicacao: string;
  status: "rascunho" | "publicado";
  anexoUrl?: string;
}) {
  const titulo = params.titulo?.trim();
  const descricao = params.descricao?.trim();

  if (!titulo || titulo.length < 3) {
    return { ok: false as const, error: "O título deve ter pelo menos 3 caracteres." };
  }

  if (!descricao || descricao.length < 10) {
    return { ok: false as const, error: "A descrição deve ter pelo menos 10 caracteres." };
  }

  if (!params.dataPublicacao) {
    return { ok: false as const, error: "Informe a data de publicação." };
  }

  const id = await relatorioRepo.createRelatorio({
    ongId: params.ongId,
    titulo,
    descricao,
    necessidadeId: params.necessidadeId || null,
    pessoasBeneficiadas: params.pessoasBeneficiadas || null,
    dataPublicacao: params.dataPublicacao,
    status: params.status,
  });

  if (params.anexoUrl) {
    await relatorioRepo.addAnexo(id, params.anexoUrl);
  }

  return { ok: true as const, id };
}

export async function listarRelatoriosDaOng(ongId: number) {
  const relatorios = await relatorioRepo.findByOngId(ongId);
  return relatorios.map((r: any) => ({
    ...r,
    isPublicado: r.status === "publicado",
  }));
}

export async function buscarRelatorioPorId(id: number, ongId?: number) {
  const relatorio = await relatorioRepo.findById(id);
  if (!relatorio) return { ok: false as const, error: "Relatório não encontrado." };
  if (ongId && Number(relatorio.ong_id) !== Number(ongId)) {
    return { ok: false as const, error: "Você não tem acesso a este relatório." };
  }
  return { ok: true as const, relatorio: { ...relatorio, isPublicado: relatorio.status === "publicado" } };
}

export async function buscarNecessidadesParaSelect(ongId: number) {
  return relatorioRepo.buscarNecessidadesDaOng(ongId);
}
