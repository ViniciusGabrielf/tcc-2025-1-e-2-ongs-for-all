import * as gamRepo from "../repositories/gamificacaoRepository";

/**
 * Registra pontos e verifica selos após uma ação do usuário.
 * Chamado de forma assíncrona (fire-and-forget) nos outros services.
 */
export async function processarAcao(params: {
  usuarioId: number;
  acao: "primeiro_interesse" | "interesse_confirmado" | "interesse_voluntariado";
}) {
  const PONTOS: Record<string, number> = {
    primeiro_interesse: 10,
    interesse_confirmado: 20,
    interesse_voluntariado: 25,
  };

  // primeiro_interesse só concede XP se for de fato o primeiro
  if (params.acao === "primeiro_interesse") {
    const total = await gamRepo.contarInteressesDoUsuario(params.usuarioId);
    if (total === 1) await gamRepo.adicionarPontos(params.usuarioId, PONTOS.primeiro_interesse);
  } else {
    const pontos = PONTOS[params.acao] ?? 0;
    if (pontos > 0) await gamRepo.adicionarPontos(params.usuarioId, pontos);
  }

  await verificarEConcederSelos(params.usuarioId);
}

async function verificarEConcederSelos(usuarioId: number) {
  const [
    totalInteresses,
    totalOngs,
    totalConfirmados,
    tipos,
  ] = await Promise.all([
    gamRepo.contarInteressesDoUsuario(usuarioId),
    gamRepo.contarOngsApoiadas(usuarioId),
    gamRepo.contarInteressesConfirmados(usuarioId),
    gamRepo.contarTiposContribuidos(usuarioId),
  ]);

  // Primeiro interesse
  if (totalInteresses >= 1) await gamRepo.concederSelo(usuarioId, "primeiro_interesse");

  // Primeira entrega confirmada (código legado do selo mantido para compatibilidade)
  if (totalConfirmados >= 1) await gamRepo.concederSelo(usuarioId, "primeira_doacao");

  // Voluntariado
  if (tipos.includes("voluntariado")) await gamRepo.concederSelo(usuarioId, "voluntario");

  // 3 ONGs diferentes apoiadas
  if (totalOngs >= 3) await gamRepo.concederSelo(usuarioId, "apoiou_3_ongs");

  // 5 ONGs diferentes apoiadas
  if (totalOngs >= 5) await gamRepo.concederSelo(usuarioId, "apoiou_5_ongs");

  // 10 interesses demonstrados
  if (totalInteresses >= 10) await gamRepo.concederSelo(usuarioId, "10_interesses");

  // Ajudou com todas as categorias
  const temTodas = tipos.includes("bem") && tipos.includes("servico") && tipos.includes("voluntariado");
  if (temTodas) await gamRepo.concederSelo(usuarioId, "multiplas_categorias");
}

export async function getDadosGamificacaoCompleto(usuarioId: number) {
  await gamRepo.garantirPontuacao(usuarioId);

  const [pontuacao, selosConquistados, todosSelos] = await Promise.all([
    gamRepo.getPontuacao(usuarioId),
    gamRepo.getSelosDoUsuario(usuarioId),
    gamRepo.getTodosOsSelos(),
  ]);

  const nivel = pontuacao?.nivel ?? 1;
  const totalAcumulado = pontuacao?.total_acumulado ?? 0;
  const limites = [0, 20, 50, 100, 200];
  const limiteAtual = limites[nivel - 1] ?? 0;
  const limiteProximo = limites[nivel] ?? 200;
  const progressoXP = Math.min(
    100,
    limiteProximo > limiteAtual
      ? Math.round(((totalAcumulado - limiteAtual) / (limiteProximo - limiteAtual)) * 100)
      : 100
  );

  const conquistadosMap = new Map(selosConquistados.map((s: any) => [s.codigo, s]));

  const selos = todosSelos.map((s: any) => {
    const conquistado = conquistadosMap.get(s.codigo);
    return {
      ...s,
      conquistado: !!conquistado,
      conquistado_em: conquistado?.conquistado_em ?? null,
    };
  });

  const niveis = [
    { numero: 1, label: "Iniciante",   xpMin: 0,   xpMax: 20,  ativo: nivel === 1, concluido: nivel > 1 },
    { numero: 2, label: "Colaborador", xpMin: 20,  xpMax: 50,  ativo: nivel === 2, concluido: nivel > 2 },
    { numero: 3, label: "Engajado",    xpMin: 50,  xpMax: 100, ativo: nivel === 3, concluido: nivel > 3 },
    { numero: 4, label: "Dedicado",    xpMin: 100, xpMax: 200, ativo: nivel === 4, concluido: nivel > 4 },
    { numero: 5, label: "Embaixador",  xpMin: 200, xpMax: 200, ativo: nivel === 5, concluido: nivel >= 5 },
  ];

  return {
    totalAcumulado,
    nivel,
    nivelLabel: gamRepo.nivelLabel(nivel),
    progressoXP,
    proximoNivelXP: limiteProximo,
    selos,
    niveis,
    totalConquistados: selosConquistados.length,
    totalSelos: todosSelos.length,
  };
}

export async function getDadosGamificacao(usuarioId: number) {
  await gamRepo.garantirPontuacao(usuarioId);

  const [pontuacao, selos] = await Promise.all([
    gamRepo.getPontuacao(usuarioId),
    gamRepo.getSelosDoUsuario(usuarioId),
  ]);

  const nivel = pontuacao?.nivel ?? 1;
  const totalAcumulado = pontuacao?.total_acumulado ?? 0;

  // Limites de XP por nível
  const limites = [0, 20, 50, 100, 200];
  const limiteAtual = limites[nivel - 1] ?? 0;
  const limiteProximo = limites[nivel] ?? 200;
  const progressoXP = Math.min(
    100,
    limiteProximo > limiteAtual
      ? Math.round(((totalAcumulado - limiteAtual) / (limiteProximo - limiteAtual)) * 100)
      : 100
  );

  return {
    pontos: pontuacao?.pontos ?? 0,
    totalAcumulado,
    nivel,
    nivelLabel: gamRepo.nivelLabel(nivel),
    progressoXP,
    proximoNivelXP: limiteProximo,
    selos,
    temSelos: selos.length > 0,
  };
}
