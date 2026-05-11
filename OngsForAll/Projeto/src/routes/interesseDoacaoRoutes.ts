import { FastifyInstance } from "fastify";
import {
    renderNovaPaginaInteresse,
    criarInteresse,
    renderInteressesOngPage,
    aceitarInteresse,
    receberInteresse,
    cancelarInteresse,
} from "../controllers/interesseDoacaoController";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import { ensureUser } from "../middlewares/ensureUser";
import { ensureOng } from "../middlewares/ensureOng";

export async function interesseDoacaoRoutes(fastify: FastifyInstance) {
    fastify.get(
        "/interesses/nova",
        { preHandler: [ensureAuthenticated, ensureUser] },
        renderNovaPaginaInteresse
    );

    fastify.post(
        "/interesses",
        { preHandler: [ensureAuthenticated, ensureUser] },
        criarInteresse
    );

    fastify.get(
        "/ong/interesses",
        { preHandler: [ensureAuthenticated, ensureOng] },
        renderInteressesOngPage
    );

    fastify.post(
        "/ong/interesses/:id/aceitar",
        { preHandler: [ensureAuthenticated, ensureOng] },
        aceitarInteresse
    );

    fastify.post(
        "/ong/interesses/:id/receber",
        { preHandler: [ensureAuthenticated, ensureOng] },
        receberInteresse
    );

    fastify.post(
        "/ong/interesses/:id/cancelar",
        { preHandler: [ensureAuthenticated, ensureOng] },
        cancelarInteresse
    );
}
