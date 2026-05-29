import bcrypt from "bcryptjs";
import { z } from "zod";
import { SENHA_MSG, senhaForte } from "../utils/passwordValidator";
import * as empresaRepo from "../repositories/empresaRepository";
import * as marketplaceRepo from "../repositories/marketplaceRepository";
import { formatCnpj, isValidCnpj, normalizeCnpj, validateAndLookupCnpj } from "./cnpjService";

export const TERMOS_USO_VERSAO = "2026-05-29";
const TERMOS_ACEITE_MSG = "Para criar sua conta, voce precisa aceitar os Termos de Uso e a Politica de Privacidade.";

const PLANOS = {
  starter: {
    label: "Starter",
    preco: "Gratis",
    limite: 3,
    limiteLabel: "3 itens",
    beneficio: "Cadastro, apoio a necessidades e vitrine basica",
  },
  parceiro: {
    label: "Parceiro",
    preco: "R$ 149/mes",
    limite: 15,
    limiteLabel: "15 itens",
    beneficio: "Selo Parceiro Verificado, destaque na vitrine e relatorio ESG mensal",
  },
  premium: {
    label: "Premium",
    preco: "R$ 399/mes",
    limite: 999,
    limiteLabel: "Ilimitado",
    beneficio: "Selo Premium, banner na home e relatorio ESG detalhado",
  },
} as const;

type PlanoEmpresa = keyof typeof PLANOS;

function getPlanoInfo(plano?: string | null) {
  const codigo = (plano && plano in PLANOS ? plano : "starter") as PlanoEmpresa;
  return {
    codigo,
    ...PLANOS[codigo],
  };
}

export function listarPlanos(planoAtual?: string | null) {
  const atual = getPlanoInfo(planoAtual).codigo;
  return (Object.keys(PLANOS) as PlanoEmpresa[]).map((codigo) => ({
    codigo,
    ...PLANOS[codigo],
    isAtual: codigo === atual,
    isStarter: codigo === "starter",
    isParceiro: codigo === "parceiro",
    isPremium: codigo === "premium",
  }));
}

function formatPrecoLabel(modoPreco: string, preco: any): string {
  if (modoPreco === "gratuito") return "Gratuito";
  if (modoPreco === "fixo" && preco != null) {
    return `R$ ${Number(preco).toFixed(2).replace(".", ",")}`;
  }
  return "Sob consulta";
}

async function validarLimitePlano(empresaId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const empresa = await empresaRepo.findEmpresaById(empresaId);
  if (!empresa) return { ok: false, error: "Empresa nao encontrada." };

  const planoInfo = getPlanoInfo(empresa.plano);
  const totalItensNoLimite = await marketplaceRepo.contarItensNoLimiteDaEmpresa(empresaId);

  if (totalItensNoLimite >= planoInfo.limite) {
    return {
      ok: false,
      error: `Limite de ${planoInfo.limiteLabel} atingido. Faca upgrade do plano para publicar mais itens.`,
    };
  }

  return { ok: true };
}

const cadastroSchema = z.object({
  nome_fantasia: z.string().min(2, "Nome fantasia obrigatorio"),
  razao_social: z.string().optional(),
  email: z.string().email("Email invalido"),
  cnpj: z.string().length(14, "CNPJ deve ter 14 digitos."),
  telefone: z.string().min(8).optional(),
  descricao: z.string().optional(),
  setor: z.string().optional(),
  senha: z.string().refine(senhaForte, { message: SENHA_MSG }),
});

const perfilEmpresaSchema = z.object({
  nome_fantasia: z.string().min(2, "Nome fantasia obrigatorio"),
  razao_social: z.string().optional(),
  email: z.string().email("Email invalido"),
  cnpj: z.string().length(14, "CNPJ deve ter 14 digitos."),
  telefone: z.string().optional(),
  descricao: z.string().optional(),
  setor: z.string().optional(),
});

function normalizeText(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function hasAcceptedTerms(value: unknown): boolean {
  return value === "on" || value === "true" || value === "1";
}

type EmpresaCnpjStatus = {
  statusAtual: "validado" | "invalido";
  statusSolicitacao: "pendente" | "rejeitado" | null;
  cnpjPendente: string | null;
  observacaoAdmin: string | null;
  bloqueiaAtividades: boolean;
  possuiSolicitacaoPendente: boolean;
  solicitacaoRejeitada: boolean;
  mensagem: string | null;
};

function formatCnpjDigitado(cnpj: string) {
  return /^\d{14}$/.test(cnpj) ? formatCnpj(cnpj) : cnpj;
}

function mapControleToStatus(controle: any): EmpresaCnpjStatus {
  const statusAtual = controle?.status_atual === "validado" ? "validado" : "invalido";
  const statusSolicitacao =
    controle?.status_solicitacao === "pendente" || controle?.status_solicitacao === "rejeitado"
      ? controle.status_solicitacao
      : null;
  const bloqueiaAtividades = statusAtual !== "validado";
  const possuiSolicitacaoPendente = statusSolicitacao === "pendente";
  const solicitacaoRejeitada = statusSolicitacao === "rejeitado";

  let mensagem: string | null = null;
  if (bloqueiaAtividades && possuiSolicitacaoPendente) {
    mensagem =
      "A atualizacao do CNPJ esta pendente de aprovacao do admin. Sua empresa permanece com atividades bloqueadas ate a analise.";
  } else if (bloqueiaAtividades && solicitacaoRejeitada) {
    mensagem =
      "A ultima solicitacao de alteracao do CNPJ foi rejeitada. Informe um CNPJ valido no perfil para liberar as atividades.";
  } else if (bloqueiaAtividades) {
    mensagem =
      "Sua empresa nao pode realizar atividades ate informar um CNPJ valido em Perfil da empresa.";
  } else if (possuiSolicitacaoPendente) {
    mensagem =
      "Existe uma solicitacao de alteracao de CNPJ pendente. O CNPJ atual segue valido ate a decisao do admin.";
  } else if (solicitacaoRejeitada) {
    mensagem = "A ultima solicitacao de alteracao do CNPJ foi rejeitada.";
  }

  return {
    statusAtual,
    statusSolicitacao,
    cnpjPendente: controle?.cnpj_pendente ?? null,
    observacaoAdmin: controle?.observacao_admin ?? null,
    bloqueiaAtividades,
    possuiSolicitacaoPendente,
    solicitacaoRejeitada,
    mensagem,
  };
}

export async function getEmpresaCnpjStatus(empresaId: number): Promise<EmpresaCnpjStatus> {
  const empresa = await empresaRepo.findEmpresaById(empresaId);
  if (!empresa) throw new Error("Empresa nao encontrada.");

  let controle = await empresaRepo.findEmpresaCnpjControle(empresaId);
  if (!controle) {
    await empresaRepo.upsertEmpresaCnpjControle({
      empresaId,
      statusAtual: isValidCnpj(empresa.cnpj) ? "validado" : "invalido",
    });
    controle = await empresaRepo.findEmpresaCnpjControle(empresaId);
  }

  return mapControleToStatus(controle);
}

async function validarEmpresaPodeRealizarAtividades(
  empresaId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const status = await getEmpresaCnpjStatus(empresaId);
  if (!status.bloqueiaAtividades) {
    return { ok: true };
  }

  return {
    ok: false,
    error: status.mensagem ?? "Sua empresa nao pode realizar atividades ate regularizar o CNPJ no perfil.",
  };
}

export async function cadastrarEmpresa(body: Record<string, string>) {
  if (!hasAcceptedTerms(body.aceite_termos)) {
    return { ok: false as const, error: TERMOS_ACEITE_MSG };
  }

  const parsed = cadastroSchema.safeParse({
    nome_fantasia: normalizeText(body.nome_fantasia),
    razao_social: normalizeText(body.razao_social),
    email: normalizeText(body.email)?.toLowerCase(),
    cnpj: normalizeCnpj(body.cnpj),
    telefone: normalizeText(body.telefone),
    descricao: normalizeText(body.descricao),
    setor: normalizeText(body.setor),
    senha: body.senha,
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.errors[0].message };
  }

  const { senha, ...dados } = parsed.data;
  const senhaHash = await bcrypt.hash(senha, 10);
  const cnpjValidation = await validateAndLookupCnpj(parsed.data.cnpj);
  const cnpjStatusAtual = cnpjValidation.ok ? "validado" : "invalido";
  const cnpjPersistido = cnpjValidation.ok ? cnpjValidation.cnpj : formatCnpjDigitado(parsed.data.cnpj);
  const razaoSocial = dados.razao_social ?? (cnpjValidation.ok ? cnpjValidation.razaoSocial : undefined);
  const nomeFantasia = dados.nome_fantasia;

  try {
    const empresaId = await empresaRepo.createEmpresa({
      ...dados,
      nome_fantasia: nomeFantasia,
      razao_social: razaoSocial,
      cnpj: cnpjPersistido,
      senhaHash,
      termosVersao: TERMOS_USO_VERSAO,
    });

    await empresaRepo.upsertEmpresaCnpjControle({
      empresaId,
      statusAtual: cnpjStatusAtual,
      cnpjPendente: null,
      statusSolicitacao: null,
      observacaoAdmin: null,
    });

    return { ok: true as const };
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY") {
      return { ok: false as const, error: "Email ou CNPJ ja cadastrado." };
    }
    throw err;
  }
}

function enrichApoio(a: any) {
  const status = a.status_necessidade as string;
  const tipo = a.tipo_necessidade as string;
  return {
    ...a,
    statusLabel:
      status === "aberta" ? "Pendente"
      : status === "em_andamento" ? "Em andamento"
      : status === "concluida" ? "Concluído"
      : status === "cancelada" ? "Cancelado"
      : status,
    isAberta: status === "aberta",
    isEmAndamento: status === "em_andamento",
    isConcluida: status === "concluida",
    isCancelada: status === "cancelada",
    tipoLabel: tipo === "bem" ? "Doação" : tipo === "servico" ? "Serviço" : "Voluntariado",
    tipoIsBem: tipo === "bem",
    tipoIsServico: tipo === "servico",
    tipoIsVoluntariado: tipo === "voluntariado",
  };
}

export async function listarApoiosEmpresa(
  empresaId: number,
  status?: string,
  busca?: string
) {
  const todos = await empresaRepo.listarApoiosDaEmpresa(empresaId);

  const resumo = todos.reduce(
    (acc: { pendentes: number; em_andamento: number; concluidas: number; canceladas: number }, a: any) => {
      if (a.status_necessidade === "aberta") acc.pendentes++;
      else if (a.status_necessidade === "em_andamento") acc.em_andamento++;
      else if (a.status_necessidade === "concluida") acc.concluidas++;
      else if (a.status_necessidade === "cancelada") acc.canceladas++;
      return acc;
    },
    { pendentes: 0, em_andamento: 0, concluidas: 0, canceladas: 0 }
  );

  const STATUS_VALIDOS = ["aberta", "em_andamento", "concluida", "cancelada"];
  const filtro = STATUS_VALIDOS.includes(status || "") ? status : undefined;
  const buscaNorm = busca?.trim().toLowerCase() ?? "";

  let filtrados = todos;
  if (filtro) filtrados = filtrados.filter((a: any) => a.status_necessidade === filtro);
  if (buscaNorm) {
    filtrados = filtrados.filter(
      (a: any) =>
        a.titulo_necessidade?.toLowerCase().includes(buscaNorm) ||
        a.nome_ong?.toLowerCase().includes(buscaNorm)
    );
  }

  return {
    apoios: filtrados.map(enrichApoio),
    resumo,
    statusFiltro: filtro ?? "",
    buscaAtual: buscaNorm,
    total: filtrados.length,
  };
}

export async function getDashboardData(
  empresaId: number,
  status?: string,
  busca?: string
) {
  const [empresa, cnpjStatus, apoiosData] = await Promise.all([
    empresaRepo.findEmpresaById(empresaId),
    getEmpresaCnpjStatus(empresaId),
    listarApoiosEmpresa(empresaId, status, busca),
  ]);

  if (!empresa) throw new Error("Empresa nao encontrada.");

  return {
    empresa,
    cnpjStatus,
    ...apoiosData,
    isTabTodos: !apoiosData.statusFiltro,
    isTabPendentes: apoiosData.statusFiltro === "aberta",
    isTabAndamento: apoiosData.statusFiltro === "em_andamento",
    isTabConcluidas: apoiosData.statusFiltro === "concluida",
    isTabCancelados: apoiosData.statusFiltro === "cancelada",
  };
}

export async function atualizarPerfilEmpresa(
  empresaId: number,
  body: Record<string, string>
): Promise<{ ok: true; cnpjSolicitacaoCriada: boolean } | { ok: false; error: string }> {
  const empresa = await empresaRepo.findEmpresaById(empresaId);
  if (!empresa) {
    return { ok: false, error: "Empresa nao encontrada." };
  }

  const parsed = perfilEmpresaSchema.safeParse({
    nome_fantasia: normalizeText(body.nome_fantasia),
    razao_social: normalizeText(body.razao_social),
    email: normalizeText(body.email)?.toLowerCase(),
    cnpj: normalizeCnpj(body.cnpj),
    telefone: normalizeText(body.telefone),
    descricao: normalizeText(body.descricao),
    setor: normalizeText(body.setor),
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const cnpjAtual = normalizeCnpj(empresa.cnpj);
  const controleAtual = await getEmpresaCnpjStatus(empresaId);
  let cnpjSolicitacaoCriada = false;

  if (parsed.data.cnpj !== cnpjAtual) {
    const cnpjValidation = await validateAndLookupCnpj(parsed.data.cnpj);
    if (!cnpjValidation.ok) {
      return {
        ok: false,
        error: `${cnpjValidation.message} Informe um CNPJ valido para enviar a alteracao para aprovacao.`,
      };
    }

    const empresaComMesmoCnpj = await empresaRepo.findEmpresaByNormalizedCnpjExcludingId(
      normalizeCnpj(cnpjValidation.cnpj),
      empresaId
    );
    if (empresaComMesmoCnpj) {
      return { ok: false, error: "Este CNPJ ja esta vinculado a outra empresa." };
    }

    const empresaComMesmoCnpjPendente = await empresaRepo.findEmpresaByPendingNormalizedCnpjExcludingId(
      normalizeCnpj(cnpjValidation.cnpj),
      empresaId
    );
    if (empresaComMesmoCnpjPendente) {
      return { ok: false, error: "Este CNPJ ja esta pendente de aprovacao para outra empresa." };
    }

    await empresaRepo.upsertEmpresaCnpjControle({
      empresaId,
      statusAtual: controleAtual.statusAtual,
      cnpjPendente: cnpjValidation.cnpj,
      statusSolicitacao: "pendente",
      observacaoAdmin: null,
    });
    cnpjSolicitacaoCriada = true;
  }

  try {
    await empresaRepo.updateEmpresaPerfil(empresaId, {
      nome_fantasia: parsed.data.nome_fantasia,
      razao_social: parsed.data.razao_social,
      email: parsed.data.email,
      telefone: parsed.data.telefone,
      descricao: parsed.data.descricao,
      setor: parsed.data.setor,
    });
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY") {
      return { ok: false, error: "Este e-mail ja esta em uso por outra empresa." };
    }
    throw err;
  }

  return { ok: true, cnpjSolicitacaoCriada };
}

export async function aprovarCnpjEmpresa(
  empresaId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const empresa = await empresaRepo.findEmpresaById(empresaId);
  if (!empresa) return { ok: false, error: "Empresa nao encontrada." };

  const status = await getEmpresaCnpjStatus(empresaId);
  if (!status.possuiSolicitacaoPendente || !status.cnpjPendente) {
    return { ok: false, error: "Nao existe solicitacao de CNPJ pendente para esta empresa." };
  }

  const empresaComMesmoCnpj = await empresaRepo.findEmpresaByNormalizedCnpjExcludingId(
    normalizeCnpj(status.cnpjPendente),
    empresaId
  );
  if (empresaComMesmoCnpj) {
    return { ok: false, error: "O CNPJ pendente ja esta vinculado a outra empresa." };
  }

  await empresaRepo.aprovarCnpjPendente(empresaId);
  return { ok: true };
}

export async function rejeitarCnpjEmpresa(
  empresaId: number,
  observacao?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const empresa = await empresaRepo.findEmpresaById(empresaId);
  if (!empresa) return { ok: false, error: "Empresa nao encontrada." };

  const status = await getEmpresaCnpjStatus(empresaId);
  if (!status.possuiSolicitacaoPendente) {
    return { ok: false, error: "Nao existe solicitacao de CNPJ pendente para esta empresa." };
  }

  await empresaRepo.rejeitarCnpjPendente(empresaId, normalizeText(observacao));
  return { ok: true };
}

export async function apoiarNecessidade(params: {
  empresaId: number;
  necessidadeId: number;
  ongId: number;
  observacao?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const validacaoAtividades = await validarEmpresaPodeRealizarAtividades(params.empresaId);
  if (!validacaoAtividades.ok) return validacaoAtividades;

  const jaApoiou = await empresaRepo.jaApoiou(params.empresaId, params.necessidadeId);
  if (jaApoiou) return { ok: false, error: "Sua empresa ja apoiou esta necessidade." };

  await empresaRepo.createApoio(params);
  await empresaRepo.verificarElegibilidade(params.empresaId);

  return { ok: true };
}

export async function alterarPlanoEmpresa(params: {
  empresaId: number;
  plano: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(params.plano in PLANOS)) {
    return { ok: false, error: "Plano invalido." };
  }

  const planoInfo = getPlanoInfo(params.plano);
  const totalItens = await marketplaceRepo.contarItensNoLimiteDaEmpresa(params.empresaId);

  if (totalItens > planoInfo.limite) {
    return {
      ok: false,
      error: `Sua empresa possui ${totalItens} itens ativos no limite. O plano ${planoInfo.label} permite ${planoInfo.limiteLabel}.`,
    };
  }

  await empresaRepo.updatePlanoEmpresa(params.empresaId, planoInfo.codigo);
  return { ok: true };
}

export async function criarItemMarketplace(params: {
  empresaId: number;
  titulo: string;
  descricao: string;
  tipo: string;
  categoriaId?: number;
  imagemUrl?: string;
  linkExterno?: string;
  modoPreco?: "gratuito" | "fixo" | "sob_consulta";
  preco?: number | null;
}): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  const validacaoAtividades = await validarEmpresaPodeRealizarAtividades(params.empresaId);
  if (!validacaoAtividades.ok) return validacaoAtividades;

  const empresa = await empresaRepo.findEmpresaById(params.empresaId);
  if (!empresa) return { ok: false, error: "Empresa nao encontrada." };

  if (empresa.status_marketplace === "bloqueada") {
    return { ok: false, error: "Sua empresa precisa apoiar pelo menos 3 necessidades para publicar na vitrine." };
  }

  const limitePlano = await validarLimitePlano(params.empresaId);
  if (!limitePlano.ok) return limitePlano;

  const titulo = params.titulo.trim();
  const descricao = params.descricao.trim();

  if (titulo.length < 3) return { ok: false, error: "Titulo deve ter ao menos 3 caracteres." };
  if (descricao.length < 10) return { ok: false, error: "Descricao deve ter ao menos 10 caracteres." };

  const tipo = ["produto", "servico", "campanha", "banner", "link"].includes(params.tipo)
    ? params.tipo
    : "produto";

  const modoPreco = params.modoPreco ?? "sob_consulta";
  if (modoPreco === "fixo" && (params.preco == null || params.preco < 0)) {
    return { ok: false, error: "Informe um valor valido para o preco fixo." };
  }
  const preco = modoPreco === "fixo" ? (params.preco ?? null) : null;

  const id = await marketplaceRepo.createItem({
    empresaId: params.empresaId,
    titulo,
    descricao,
    tipo,
    categoriaId: params.categoriaId,
    imagemUrl: params.imagemUrl,
    linkExterno: params.linkExterno,
    statusPublicacao: "pendente",
    modoPreco,
    preco: preco ?? undefined,
  });

  return { ok: true, id };
}

export async function listarItensPublicos(categoriaId?: number, tipo?: string) {
  const itens = await marketplaceRepo.listarItensAprovados({ categoriaId, tipo });
  return itens.map((i: any) => ({
    ...i,
    isProduto: i.tipo === "produto",
    isServico: i.tipo === "servico",
    isCampanha: i.tipo === "campanha",
    isBanner: i.tipo === "banner",
    isLink: i.tipo === "link",
    tipoLabel: ({ produto: "Produto", servico: "Servico", campanha: "Campanha", banner: "Institucional", link: "Link" } as Record<string, string>)[i.tipo] ?? i.tipo,
    precoLabel: formatPrecoLabel(i.modo_preco ?? "sob_consulta", i.preco),
    isGratuito: i.modo_preco === "gratuito",
    isFixo: i.modo_preco === "fixo",
    isSobConsulta: i.modo_preco === "sob_consulta" || !i.modo_preco,
  }));
}

export async function listarItensEmpresa(empresaId: number) {
  const itens = await marketplaceRepo.listarItensDaEmpresa(empresaId);
  return itens.map((i: any) => ({
    ...i,
    tipoLabel: ({ produto: "Produto", servico: "Servico", campanha: "Campanha", banner: "Institucional", link: "Link" } as Record<string, string>)[i.tipo] ?? i.tipo,
    statusLabel: ({ aprovado: "Aprovado", pendente: "Pendente", rejeitado: "Rejeitado", rascunho: "Rascunho" } as Record<string, string>)[i.status_publicacao] ?? i.status_publicacao,
    isAprovado: i.status_publicacao === "aprovado",
    isPendente: i.status_publicacao === "pendente",
    isRejeitado: i.status_publicacao === "rejeitado",
    isRascunho: i.status_publicacao === "rascunho",
    canDesativar: ["aprovado", "pendente", "rejeitado"].includes(i.status_publicacao),
    canReenviar: ["rejeitado", "rascunho"].includes(i.status_publicacao),
    precoLabel: formatPrecoLabel(i.modo_preco ?? "sob_consulta", i.preco),
    isGratuito: i.modo_preco === "gratuito",
    isFixo: i.modo_preco === "fixo",
    isSobConsulta: i.modo_preco === "sob_consulta" || !i.modo_preco,
  }));
}

const editarItemSchema = z.object({
  titulo: z.string().min(3, "Titulo deve ter ao menos 3 caracteres.").max(255),
  descricao: z.string().min(10, "Descricao deve ter ao menos 10 caracteres.").max(2000),
  tipo: z.enum(["produto", "servico", "campanha", "banner", "link"], {
    errorMap: () => ({ message: "Tipo invalido." }),
  }),
  linkExterno: z.string().max(500, "Link muito longo.").optional(),
  modoPreco: z.enum(["gratuito", "fixo", "sob_consulta"]).default("sob_consulta"),
  preco: z.preprocess(
    (v) => {
      if (v === undefined || v === null || v === "") return null;
      const n = parseFloat(String(v).replace(",", "."));
      return isNaN(n) ? null : n;
    },
    z.number().min(0, "O valor nao pode ser negativo.").nullable().optional()
  ),
});

export async function editarItemMarketplace(params: {
  empresaId: number;
  itemId: number;
  titulo: string;
  descricao: string;
  tipo: string;
  categoriaId?: number;
  imagemUrl: string | null;
  linkExterno?: string;
  acao?: "salvar" | "reenviar";
  modoPreco?: string;
  preco?: string | number | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const validacaoAtividades = await validarEmpresaPodeRealizarAtividades(params.empresaId);
  if (!validacaoAtividades.ok) return validacaoAtividades;

  const parsed = editarItemSchema.safeParse({
    titulo: params.titulo,
    descricao: params.descricao,
    tipo: params.tipo,
    linkExterno: params.linkExterno || undefined,
    modoPreco: params.modoPreco || "sob_consulta",
    preco: params.preco,
  });

  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0].message };
  }

  const modoPreco = parsed.data.modoPreco;
  if (modoPreco === "fixo" && (parsed.data.preco == null || parsed.data.preco < 0)) {
    return { ok: false, error: "Informe um valor valido para o preco fixo." };
  }
  const preco = modoPreco === "fixo" ? (parsed.data.preco ?? null) : null;

  const item = await marketplaceRepo.findItemByIdDaEmpresa(params.itemId, params.empresaId);
  if (!item) return { ok: false, error: "Item nao encontrado." };

  let novoStatus: "rascunho" | "pendente" | "rejeitado" | "aprovado" = item.status_publicacao;
  if (params.acao === "reenviar") {
    novoStatus = "pendente";
  } else if (item.status_publicacao === "aprovado" || item.status_publicacao === "pendente") {
    novoStatus = "pendente";
  } else if (item.status_publicacao === "rascunho") {
    novoStatus = "rascunho";
  } else if (item.status_publicacao === "rejeitado") {
    novoStatus = "rejeitado";
  }

  if (["rascunho", "rejeitado"].includes(item.status_publicacao) && novoStatus === "pendente") {
    const limitePlano = await validarLimitePlano(params.empresaId);
    if (!limitePlano.ok) return limitePlano;
  }

  const updated = await marketplaceRepo.updateItemDaEmpresa({
    id: params.itemId,
    empresaId: params.empresaId,
    titulo: parsed.data.titulo,
    descricao: parsed.data.descricao,
    tipo: parsed.data.tipo,
    categoriaId: params.categoriaId ?? null,
    imagemUrl: params.imagemUrl,
    linkExterno: parsed.data.linkExterno ?? null,
    statusPublicacao: novoStatus,
    modoPreco,
    preco,
  });
  if (!updated) return { ok: false, error: "Nao foi possivel atualizar o item." };

  return { ok: true };
}

export async function desativarItemMarketplace(params: {
  empresaId: number;
  itemId: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const validacaoAtividades = await validarEmpresaPodeRealizarAtividades(params.empresaId);
  if (!validacaoAtividades.ok) return validacaoAtividades;

  const item = await marketplaceRepo.findItemByIdDaEmpresa(params.itemId, params.empresaId);
  if (!item) return { ok: false, error: "Item nao encontrado." };
  if (item.status_publicacao === "rascunho") return { ok: false, error: "Item ja esta em rascunho." };

  const updated = await marketplaceRepo.atualizarStatusItemDaEmpresa(params.itemId, params.empresaId, "rascunho");
  if (!updated) return { ok: false, error: "Nao foi possivel desativar o item." };
  return { ok: true };
}

export async function reenviarItemMarketplace(params: {
  empresaId: number;
  itemId: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const validacaoAtividades = await validarEmpresaPodeRealizarAtividades(params.empresaId);
  if (!validacaoAtividades.ok) return validacaoAtividades;

  const item = await marketplaceRepo.findItemByIdDaEmpresa(params.itemId, params.empresaId);
  if (!item) return { ok: false, error: "Item nao encontrado." };
  if (!["rejeitado", "rascunho"].includes(item.status_publicacao)) {
    return { ok: false, error: "Somente itens rejeitados ou em rascunho podem ser reenviados." };
  }

  const limitePlano = await validarLimitePlano(params.empresaId);
  if (!limitePlano.ok) return limitePlano;

  const updated = await marketplaceRepo.atualizarStatusItemDaEmpresa(params.itemId, params.empresaId, "pendente");
  if (!updated) return { ok: false, error: "Nao foi possivel reenviar o item." };
  return { ok: true };
}
