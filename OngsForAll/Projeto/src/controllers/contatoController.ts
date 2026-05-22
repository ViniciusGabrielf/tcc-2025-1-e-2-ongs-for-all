import { FastifyRequest, FastifyReply } from "fastify";
import { enviarMensagemContato } from "../services/emailService";

export async function enviarContato(
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> {
    const { nome, email, mensagem } = request.body as {
        nome?: string;
        email?: string;
        mensagem?: string;
    };

    if (!nome?.trim() || !email?.trim() || !mensagem?.trim()) {
        return reply.view("/templates/index.hbs", {
            title: "Sobre Nós",
            stitle: "Sobre Nós",
            contatoErro: true,
        }, { layout: "layouts/main" });
    }

    try {
        await enviarMensagemContato({
            nome: nome.trim(),
            email: email.trim(),
            mensagem: mensagem.trim(),
        });

        return reply.view("/templates/index.hbs", {
            title: "Sobre Nós",
            stitle: "Sobre Nós",
            contatoSucesso: true,
        }, { layout: "layouts/main" });
    } catch (err: any) {
        console.error("[CONTATO] Falha ao enviar mensagem de contato:", err.message);
        return reply.view("/templates/index.hbs", {
            title: "Sobre Nós",
            stitle: "Sobre Nós",
            contatoErro: true,
        }, { layout: "layouts/main" });
    }
}
