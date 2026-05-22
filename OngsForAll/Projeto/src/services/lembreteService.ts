import { schedule } from "node-cron";
import * as interesseRepo from "../repositories/interesseDoacaoRepository";
import * as emailService from "../services/emailService";

async function processarLembretes(tipo: "2dias" | "hoje") {
    const interesses = await interesseRepo.buscarInteressesParaLembrete(tipo);

    for (const interesse of interesses) {
        try {
            await emailService.enviarLembreteEntrega({
                interesseId: interesse.id,
                emailUsuario: interesse.email_usuario,
                nomeUsuario: interesse.nome_usuario,
                tituloNecessidade: interesse.titulo_necessidade,
                nomeOng: interesse.nome_ong,
                dataPrevista: interesse.data_prevista,
                quantidade: interesse.quantidade ?? null,
                tipo,
            });
            await interesseRepo.marcarLembreteEnviado(interesse.id, tipo);
        } catch (err: any) {
            console.error(`[LEMBRETE] Falha ao enviar lembrete "${tipo}" para interesse #${interesse.id}:`, err.message);
        }
    }

    if (interesses.length > 0) {
        console.log(`[LEMBRETE] ${interesses.length} lembrete(s) "${tipo}" enviado(s).`);
    }
}

export function registrarJobLembretes() {
    // Executa todo dia às 8h da manhã
    schedule("0 8 * * *", async () => {
        await processarLembretes("2dias");
        await processarLembretes("hoje");
    });

    console.log("[LEMBRETE] Job de lembretes de entrega registrado (executa às 08:00 diariamente).");
}
