import * as repo from "../repositories/relatorioGerencialRepository";

export interface FiltrosInput {
  de?: string;
  ate?: string;
  tipo?: string;
  categoria?: string;
  status?: string;
  busca?: string;
}

const STATUS_VALIDOS_NECESSIDADE = ["aberta", "concluida", "cancelada"];
const STATUS_VALIDOS_INTERESSE   = ["pendente", "aceito", "recebido", "cancelado"];
const TIPOS_VALIDOS              = ["bem", "servico", "voluntariado"];
const TIPOS_ATIVIDADE_VALIDOS    = [
  "necessidade_criada", "interesse_pendente", "interesse_aceito",
  "entrega_recebida",   "interesse_cancelado",
  "evidencia_registrada",
];

function normalizarFiltros(raw: FiltrosInput): repo.FiltrosGerencial {
  const f: repo.FiltrosGerencial = {};

  if (raw.de  && /^\d{4}-\d{2}-\d{2}$/.test(raw.de))  f.de  = raw.de;
  if (raw.ate && /^\d{4}-\d{2}-\d{2}$/.test(raw.ate)) f.ate = raw.ate;
  if (f.de && f.ate && f.de > f.ate) { f.ate = undefined; }

  if (raw.tipo      && TIPOS_VALIDOS.includes(raw.tipo))                        f.tipo      = raw.tipo;
  if (raw.status    && STATUS_VALIDOS_NECESSIDADE.includes(raw.status))         f.status    = raw.status;
  if (raw.busca     && raw.busca.trim().length > 0)                             f.busca     = raw.busca.trim().slice(0, 100);
  if (raw.categoria && raw.categoria.trim().length > 0)                        f.categoria = raw.categoria.trim();

  return f;
}

function normalizarFiltrosDoacoes(raw: FiltrosInput): repo.FiltrosGerencial {
  const f: repo.FiltrosGerencial = {};
  if (raw.de  && /^\d{4}-\d{2}-\d{2}$/.test(raw.de))  f.de  = raw.de;
  if (raw.ate && /^\d{4}-\d{2}-\d{2}$/.test(raw.ate)) f.ate = raw.ate;
  if (f.de && f.ate && f.de > f.ate) { f.ate = undefined; }
  if (raw.status && STATUS_VALIDOS_INTERESSE.includes(raw.status)) f.status = raw.status;
  if (raw.tipo   && TIPOS_VALIDOS.includes(raw.tipo))              f.tipo   = raw.tipo;
  if (raw.busca  && raw.busca.trim().length > 0)                   f.busca  = raw.busca.trim().slice(0, 100);
  return f;
}

function normalizarFiltrosAtividades(raw: FiltrosInput): repo.FiltrosGerencial {
  const f: repo.FiltrosGerencial = {};
  if (raw.de  && /^\d{4}-\d{2}-\d{2}$/.test(raw.de))  f.de  = raw.de;
  if (raw.ate && /^\d{4}-\d{2}-\d{2}$/.test(raw.ate)) f.ate = raw.ate;
  if (f.de && f.ate && f.de > f.ate) { f.ate = undefined; }
  if (raw.tipo && TIPOS_ATIVIDADE_VALIDOS.includes(raw.tipo)) f.tipo = raw.tipo;
  return f;
}

// ─── Serviços públicos ────────────────────────────────────────────────────────

export async function getVisaoGeral(ongId: number) {
  return repo.buscarResumoGerencial(ongId);
}

export async function getRelatorioNecessidades(ongId: number, raw: FiltrosInput) {
  const f = normalizarFiltros(raw);
  const [dados, resumo, categorias] = await Promise.all([
    repo.buscarNecessidades(ongId, f),
    repo.buscarResumoNecessidades(ongId, { de: f.de, ate: f.ate }),
    repo.buscarCategoriasNecessidades(ongId),
  ]);
  return { dados, resumo, categorias, filtros: f };
}

export async function getRelatorioDoacoes(ongId: number, raw: FiltrosInput) {
  const f = normalizarFiltrosDoacoes(raw);
  const [dados, resumo] = await Promise.all([
    repo.buscarDoacoes(ongId, f),
    repo.buscarResumoDoacoes(ongId, { de: f.de, ate: f.ate }),
  ]);
  return { dados, resumo, filtros: f };
}

export async function getRelatorioVoluntariado(ongId: number, raw: FiltrosInput) {
  const f = normalizarFiltros(raw);
  // Para voluntariado, status se refere ao status da necessidade
  const fVol: repo.FiltrosGerencial = { de: f.de, ate: f.ate, busca: f.busca, status: undefined };
  if (raw.status && STATUS_VALIDOS_NECESSIDADE.includes(raw.status)) fVol.status = raw.status;
  const [dados, resumo] = await Promise.all([
    repo.buscarVoluntariados(ongId, fVol),
    repo.buscarResumoVoluntariado(ongId),
  ]);
  return { dados, resumo, filtros: fVol };
}

export async function getRelatorioAtividades(ongId: number, raw: FiltrosInput) {
  const f = normalizarFiltrosAtividades(raw);
  const dados = await repo.buscarAtividades(ongId, f);
  return { dados, filtros: f };
}

export async function getRelatorioImpacto(ongId: number, raw: FiltrosInput) {
  const f: repo.FiltrosGerencial = {};
  if (raw.de  && /^\d{4}-\d{2}-\d{2}$/.test(raw.de))  f.de  = raw.de;
  if (raw.ate && /^\d{4}-\d{2}-\d{2}$/.test(raw.ate)) f.ate = raw.ate;
  const dados = await repo.buscarImpactoConsolidado(ongId, f);
  return { dados, filtros: f };
}

// ─── CSV ──────────────────────────────────────────────────────────────────────

function escapeCsv(v: any): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function linhasCsv(rows: any[], headers: string[], keys: string[]): string {
  const head = headers.join(",");
  const body = rows
    .map(r => keys.map(k => escapeCsv(r[k])).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

export async function gerarCsv(ongId: number, secao: string, raw: FiltrosInput): Promise<{ nome: string; conteudo: string } | null> {
  const hoje = new Date().toISOString().slice(0, 10);

  if (secao === "necessidades") {
    const f = normalizarFiltros(raw);
    f.limite = 10000;
    const rows = await repo.buscarNecessidades(ongId, f);
    const csv = linhasCsv(rows,
      ["ID","Título","Tipo","Categoria","Qtd. Solicitada","Qtd. Recebida","Qtd. Pendente","% Concluído","Status","Criado em","Atualizado em"],
      ["id","titulo","tipo_necessidade","categoria","quantidade","quantidade_recebida","pendente","percentual","status","criado_em","atualizado_em"]
    );
    return { nome: `necessidades_${hoje}.csv`, conteudo: csv };
  }

  if (secao === "doacoes") {
    const f = normalizarFiltrosDoacoes(raw);
    f.limite = 10000;
    const rows = await repo.buscarDoacoes(ongId, f);
    const csv = linhasCsv(rows,
      ["ID","Necessidade","Tipo","Categoria","Doador","Status","Qtd. Oferecida","Qtd. Confirmada","Data Prevista","Criado em","Observação"],
      ["id","necessidade_titulo","tipo_necessidade","categoria","doador_nome","status","quantidade","quantidade_confirmada","data_prevista","criado_em","observacao"]
    );
    return { nome: `doacoes_${hoje}.csv`, conteudo: csv };
  }

  if (secao === "voluntariado") {
    const f: repo.FiltrosGerencial = {};
    f.limite = 10000;
    const rows = await repo.buscarVoluntariados(ongId, f);
    const csv = linhasCsv(rows,
      ["ID","Atividade","Categoria","Local","Turno","Início","Fim","Vagas","Inscritos","Aceitos","Confirmados","Cancelados","Status"],
      ["id","titulo","categoria","local_atividade","turno","data_inicio","data_fim","vagas","inscritos","aceitos","confirmados","cancelados","status"]
    );
    return { nome: `voluntariado_${hoje}.csv`, conteudo: csv };
  }

  if (secao === "atividades") {
    const f = normalizarFiltrosAtividades(raw);
    f.limite = 10000;
    const rows = await repo.buscarAtividades(ongId, f);
    const csv = linhasCsv(rows,
      ["Data","Tipo","Título","Doador/Usuário","Status"],
      ["data_evento","tipo","titulo","doador_nome","status"]
    );
    return { nome: `atividades_${hoje}.csv`, conteudo: csv };
  }

  return null;
}
