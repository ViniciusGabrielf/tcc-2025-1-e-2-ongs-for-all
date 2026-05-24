import * as notificacaoRepository from "../repositories/notificacaoRepository";

export async function criarNotificacaoParaOng(params: {
    ongId: number;
    titulo: string;
    mensagem: string;
    tipo: string;
}) {
    await notificacaoRepository.createNotificacao({
        ongId: params.ongId,
        titulo: params.titulo,
        mensagem: params.mensagem,
        tipo: params.tipo,
    });
}

export async function criarNotificacaoParaUsuario(params: {
    usuarioId: number;
    titulo: string;
    mensagem: string;
    tipo: string;
}) {
    await notificacaoRepository.createNotificacao({
        usuarioId: params.usuarioId,
        titulo: params.titulo,
        mensagem: params.mensagem,
        tipo: params.tipo,
    });
}

export async function notificarTodosUsuarios(params: {
    titulo: string;
    mensagem: string;
    tipo: string;
}) {
    await notificacaoRepository.createNotificacaoParaTodosUsuarios(params);
}

export async function listarNotificacoes(params: {
    tipoConta: "usuario" | "ong" | "empresa";
    id: number;
}) {
    if (params.tipoConta === "empresa") {
        return { notificacoes: [], naoLidas: 0 };
    }

    if (params.tipoConta === "ong") {
        const notificacoes = await notificacaoRepository.listarNotificacoesOng(params.id);
        const naoLidas = await notificacaoRepository.contarNaoLidasOng(params.id);
        return { notificacoes, naoLidas };
    }

    const notificacoes = await notificacaoRepository.listarNotificacoesUsuario(params.id);
    const naoLidas = await notificacaoRepository.contarNaoLidasUsuario(params.id);
    return { notificacoes, naoLidas };
}

export async function marcarComoLida(id: number) {
    await notificacaoRepository.marcarComoLida(id);
}

export async function marcarTodasComoLidas(params: {
    destinatarioId: number;
    destinatarioTipo: "usuario" | "ong" | "empresa";
}) {
    await notificacaoRepository.marcarTodasComoLidas(params);
}

export async function contarNaoLidas(params: {
    tipoConta: "usuario" | "ong" | "empresa";
    id: number;
}) {
    if (params.tipoConta === "empresa") {
        return { naoLidas: 0 };
    }

    if (params.tipoConta === "ong") {
        const naoLidas = await notificacaoRepository.contarNaoLidasOng(params.id);
        return { naoLidas };
    }

    const naoLidas = await notificacaoRepository.contarNaoLidasUsuario(params.id);
    return { naoLidas };
}

const TIPO_META: Record<string, { label: string }> = {
    nova_necessidade:    { label: "Nova necessidade"    },
    novo_interesse:      { label: "Novo interesse"      },
    interesse_aceito:    { label: "Interesse aceito"    },
    interesse_recebido:  { label: "Interesse recebido"  },
    interesse_cancelado: { label: "Interesse cancelado" },
    meta_atingida:       { label: "Meta atingida"       },
};

function parseDataBR(dataFormatada: string): Date | null {
    if (!dataFormatada) return null;
    const parts = dataFormatada.split(" ")[0].split("/");
    if (parts.length !== 3) return null;
    return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
}

function getGrupoLabel(dataFormatada: string): string {
    const eventDate = parseDataBR(dataFormatada);
    if (!eventDate) return "Anterior";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
        (today.getTime() - eventDate.getTime()) / 86400000
    );
    if (diffDays === 0) return "Hoje";
    if (diffDays === 1) return "Ontem";
    if (diffDays <= 7) return "Esta semana";
    if (diffDays <= 30) return "Este mês";
    return eventDate.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
    });
}

export async function listarOngsParaFiltro() {
    return notificacaoRepository.listarOngsParaFiltro();
}

export async function listarFeed(params?: {
    limit?: number;
    ongId?: number;
    tipo?: string;
    de?: string;
    ate?: string;
}) {
    const eventos = await notificacaoRepository.getFeedGlobal({
        limit: params?.limit ?? 60,
        ongId: params?.ongId,
        tipo: params?.tipo,
        de: params?.de,
        ate: params?.ate,
    });

    let ultimoGrupo = "";

    return eventos.map((e: any) => {
        const meta = TIPO_META[e.tipo] ?? { label: e.tipo };
        const grupoLabel = getGrupoLabel(e.data_formatada);
        const showGrupo = grupoLabel !== ultimoGrupo;
        ultimoGrupo = grupoLabel;

        return {
            ...e,
            tipoLabel: meta.label,
            grupoLabel,
            showGrupo,
            isNovaNecessidade:    e.tipo === "nova_necessidade",
            isNovoInteresse:      e.tipo === "novo_interesse",
            isInteresseAceito:    e.tipo === "interesse_aceito",
            isInteresseRecebido:  e.tipo === "interesse_recebido",
            isInteresseCancelado: e.tipo === "interesse_cancelado",
            isMetaAtingida:       e.tipo === "meta_atingida",
        };
    });
}
