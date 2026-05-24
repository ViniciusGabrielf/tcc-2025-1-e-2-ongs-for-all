import * as atividadesRepo from "../repositories/atividadesRepository";

const TIPO_LABEL: Record<string, string> = {
  bem:          "Doação",
  servico:      "Serviço",
  voluntariado: "Voluntariado",
};

const STATUS_LABEL: Record<string, string> = {
  pendente:  "Pendente",
  aceito:    "Em andamento",
  recebido:  "Concluída",
  cancelado: "Cancelado",
};

const STATUS_TAB_MAP: Record<string, string> = {
  "":          "todos",
  "pendente":  "pendentes",
  "aceito":    "andamento",
  "recebido":  "concluidas",
  "cancelado": "cancelados",
};

function processarLista(lista: atividadesRepo.AtividadeUsuario[]) {
  return lista.map((a) => ({
    ...a,
    tipoLabel:          TIPO_LABEL[a.tipo_necessidade] ?? a.tipo_necessidade,
    statusLabel:        STATUS_LABEL[a.status] ?? a.status,
    tipoIsBem:          a.tipo_necessidade === "bem",
    tipoIsServico:      a.tipo_necessidade === "servico",
    tipoIsVoluntariado: a.tipo_necessidade === "voluntariado",
    isPendente:  a.status === "pendente",
    isAceito:    a.status === "aceito",
    isRecebido:  a.status === "recebido",
    isCancelado: a.status === "cancelado",
  }));
}

function buildTabs(statusFiltro?: string) {
  const tabAtivo = STATUS_TAB_MAP[statusFiltro ?? ""] ?? "todos";
  return {
    isTabTodos:      tabAtivo === "todos",
    isTabPendentes:  tabAtivo === "pendentes",
    isTabAndamento:  tabAtivo === "andamento",
    isTabConcluidas: tabAtivo === "concluidas",
    isTabCancelados: tabAtivo === "cancelados",
  };
}

export async function getAtividades(userId: number, statusFiltro?: string) {
  const [resumo, lista] = await Promise.all([
    atividadesRepo.buscarResumoAtividades(userId),
    atividadesRepo.buscarAtividadesUsuario(userId, statusFiltro),
  ]);

  return {
    resumo,
    atividades: processarLista(lista),
    total: lista.length,
    ...buildTabs(statusFiltro),
  };
}

export async function getAtividadesOng(ongId: number, statusFiltro?: string) {
  const [resumo, lista] = await Promise.all([
    atividadesRepo.buscarResumoAtividadesOng(ongId),
    atividadesRepo.buscarAtividadesOng(ongId, statusFiltro),
  ]);

  return {
    resumo,
    atividades: processarLista(lista),
    total: lista.length,
    ...buildTabs(statusFiltro),
  };
}
