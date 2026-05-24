import { FastifyRequest, FastifyReply } from "fastify";
import * as interesseService from "../services/interesseDoacaoService";
import * as notificacaoService from "../services/notificacaoService";
import { buildPagination, normalizePage } from "../utils/pagination";

const PAGE_SIZE_INTERESSES = 10;

export async function renderNovaPaginaInteresse(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const user = request.session.user;

    if (!user) {
        return reply.redirect("/login");
    }

    const { necessidade_id } = request.query as { necessidade_id?: string };

    try {
        if (!necessidade_id) {
            return reply.code(400).send("Necessidade não informada.");
        }

        const { necessidade } = await interesseService.getNovaPaginaInteresse(
            Number(user.id),
            Number(necessidade_id)
        );

        const { naoLidas } = await notificacaoService.contarNaoLidas({
            tipoConta: user.tipo,
            id: Number(user.id),
        });

        return reply.view(
            "/templates/interesses/nova.hbs",
            {
                user,
                naoLidas,
                necessidade,
                formData: {
                    necessidade_id,
                },
            },
            { layout: "layouts/dashboardLayout" }
        );
    } catch (error: any) {
        console.error("Erro ao carregar página de interesse:", error);
        return reply
            .code(500)
            .send(error?.message ?? "Erro ao carregar página de interesse.");
    }
}

export async function criarInteresse(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const user = request.session.user;

    if (!user) {
        return reply.redirect("/login");
    }

    const { necessidade_id, quantidade, observacao, data_prevista } =
        request.body as {
            necessidade_id: string;
            quantidade?: string;
            observacao?: string;
            data_prevista?: string;
        };

    try {
        const result = await interesseService.criarInteresse({
            userId: Number(user.id),
            necessidadeId: Number(necessidade_id),
            quantidade: quantidade ? Number(quantidade) : undefined,
            observacao,
            dataPrevista: data_prevista,
        });

        if (!result.ok) {
            return reply.code(400).send(result.error);
        }

        return reply.redirect("/dashboard?interesse=1");
    } catch (error: any) {
        console.error("Erro ao criar interesse:", error);
        return reply.code(500).send(error?.message ?? "Erro ao criar interesse.");
    }
}

export async function renderInteressesOngPage(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const sessionUser = request.session.user;

    if (!sessionUser) {
        return reply.redirect("/login");
    }

    if (sessionUser.tipo !== "ong") {
        return reply.redirect("/dashboard");
    }

    const { status, pagina } = request.query as {
        status?: string;
        busca?: string;
        pagina?: string;
    };

    const currentPage = normalizePage(pagina);

    const result = await interesseService.listarInteressesDaOng(
        Number(sessionUser.id),
        status,
        (request.query as any)?.busca
    );

    const pagination = buildPagination({
        basePath: "/ong/interesses",
        currentPage,
        totalItems: result.interesses.length,
        pageSize: PAGE_SIZE_INTERESSES,
        extraParams: {
            status: result.filtroAtual,
            busca: result.buscaAtual || undefined,
        },
    });

    const interessesPaginados = result.interesses.slice(
        (pagination.currentPage - 1) * PAGE_SIZE_INTERESSES,
        pagination.currentPage * PAGE_SIZE_INTERESSES
    );

    const { naoLidas } = await notificacaoService.contarNaoLidas({
        tipoConta: sessionUser.tipo,
        id: Number(sessionUser.id),
    });

    return reply.view(
        "/templates/interesses/lista-ong.hbs",
        {
            user: sessionUser,
            naoLidas,
            interesses: interessesPaginados,
            filtroAtual: result.filtroAtual,
            buscaAtual: result.buscaAtual,
            pagination,
            success: (request.query as any)?.sucesso === "1",
            error: (request.query as any)?.erro,
        },
        { layout: "layouts/ongDashboardLayout" }
    );
}

export async function aceitarInteresse(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const sessionUser = request.session.user;

    if (!sessionUser) {
        return reply.redirect("/login");
    }

    if (sessionUser.tipo !== "ong") {
        return reply.redirect("/dashboard");
    }

    const { id } = request.params as { id: string };

    const result = await interesseService.aceitarInteresse({
        interesseId: Number(id),
        ongId: Number(sessionUser.id),
    });

    if (!result.ok) {
        return reply.code(400).send(result.error);
    }

    return reply.redirect("/ong/interesses?status=pendente&sucesso=1");
}

export async function receberInteresse(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const sessionUser = request.session.user;

    if (!sessionUser) {
        return reply.redirect("/login");
    }

    if (sessionUser.tipo !== "ong") {
        return reply.redirect("/dashboard");
    }

    const { id } = request.params as { id: string };
    const { quantidade_recebida, observacao_recebimento } = request.body as {
        quantidade_recebida?: string;
        observacao_recebimento?: string;
    };

    const result = await interesseService.receberInteresse({
        interesseId: Number(id),
        ongId: Number(sessionUser.id),
        quantidadeRecebida: quantidade_recebida,
        observacaoRecebimento: observacao_recebimento,
    });

    if (!result.ok) {
        return reply.redirect(`/ong/interesses?status=aceito&erro=${encodeURIComponent(result.error)}`);
    }

    return reply.redirect("/ong/interesses?status=recebido&sucesso=1");
}

export async function cancelarInteresse(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const sessionUser = request.session.user;

    if (!sessionUser) {
        return reply.redirect("/login");
    }

    if (sessionUser.tipo !== "ong") {
        return reply.redirect("/dashboard");
    }

    const { id } = request.params as { id: string };
    const { motivo_cancelamento, status_retorno } = request.body as {
        motivo_cancelamento?: string;
        status_retorno?: string;
    };

    const result = await interesseService.cancelarInteresse({
        interesseId: Number(id),
        ongId: Number(sessionUser.id),
        motivo: motivo_cancelamento,
    });

    if (!result.ok) {
        return reply.code(400).send(result.error);
    }

    const statusRetornoNormalizado =
        status_retorno === "aceito" || status_retorno === "pendente"
            ? status_retorno
            : "pendente";

    return reply.redirect(`/ong/interesses?status=${statusRetornoNormalizado}&sucesso=1`);
}
