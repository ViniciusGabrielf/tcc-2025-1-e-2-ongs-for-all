import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

export async function verificarConexaoEmail() {
    try {
        await transporter.verify();
        console.log("[EMAIL] Conexão SMTP verificada com sucesso.");
    } catch (err: any) {
        console.error("[EMAIL] Falha na conexão SMTP:", err.message);
    }
}

const FROM = `"OngsForAll" <${process.env.EMAIL_USER}>`;

export async function enviarConfirmacaoInteresseUsuario(params: {
    interesseId: number;
    emailUsuario: string;
    nomeUsuario: string;
    tituloNecessidade: string;
    nomeOng: string;
    quantidade?: number | null;
    dataPrevista?: string | null;
    observacao?: string | null;
}) {
    const detalheQuantidade = params.quantidade
        ? `<tr><td style="padding:6px 0;color:#555;">Quantidade oferecida:</td><td style="padding:6px 0;font-weight:600;">${params.quantidade}</td></tr>`
        : "";

    const detalheData = params.dataPrevista
        ? `<tr><td style="padding:6px 0;color:#555;">Data prevista de entrega:</td><td style="padding:6px 0;font-weight:600;">${params.dataPrevista}</td></tr>`
        : "";

    const detalheObs = params.observacao
        ? `<tr><td style="padding:6px 0;color:#555;">Observação:</td><td style="padding:6px 0;">${params.observacao}</td></tr>`
        : "";

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#16a34a;padding:28px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;">OngsForAll</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#111;margin:0 0 8px;">Interesse registrado com sucesso!</h2>
            <p style="color:#444;margin:0 0 24px;">Olá, <strong>${params.nomeUsuario}</strong>! Recebemos seu interesse em ajudar a ONG <strong>${params.nomeOng}</strong>.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:24px;">
              <tr><td colspan="2" style="padding-bottom:12px;font-weight:700;color:#16a34a;border-bottom:1px solid #e5e7eb;margin-bottom:12px;">Detalhes do interesse</td></tr>
              <tr><td style="padding:6px 0;color:#555;">ID do interesse:</td><td style="padding:6px 0;font-weight:600;">#${params.interesseId}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Necessidade:</td><td style="padding:6px 0;font-weight:600;">${params.tituloNecessidade}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">ONG:</td><td style="padding:6px 0;font-weight:600;">${params.nomeOng}</td></tr>
              ${detalheQuantidade}
              ${detalheData}
              ${detalheObs}
            </table>
            <p style="color:#444;">A ONG irá analisar seu interesse e, caso seja aceito, você receberá uma notificação por email.</p>
            <p style="color:#444;">Obrigado por fazer parte da transformação social!</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">Este é um email automático. Por favor, não responda.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
        from: FROM,
        to: params.emailUsuario,
        subject: `Seu interesse em "${params.tituloNecessidade}" foi registrado!`,
        html,
    });
}

export async function enviarNotificacaoInteresseOng(params: {
    interesseId: number;
    emailOng: string;
    nomeOng: string;
    nomeUsuario: string;
    emailUsuario: string;
    tituloNecessidade: string;
    quantidade?: number | null;
    dataPrevista?: string | null;
    observacao?: string | null;
}) {
    const detalheQuantidade = params.quantidade
        ? `<tr><td style="padding:6px 0;color:#555;">Quantidade oferecida:</td><td style="padding:6px 0;font-weight:600;">${params.quantidade}</td></tr>`
        : "";

    const detalheData = params.dataPrevista
        ? `<tr><td style="padding:6px 0;color:#555;">Data prevista de entrega:</td><td style="padding:6px 0;font-weight:600;">${params.dataPrevista}</td></tr>`
        : "";

    const detalheObs = params.observacao
        ? `<tr><td style="padding:6px 0;color:#555;">Observação:</td><td style="padding:6px 0;">${params.observacao}</td></tr>`
        : "";

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#16a34a;padding:28px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;">OngsForAll</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#111;margin:0 0 8px;">Novo interesse de doação recebido!</h2>
            <p style="color:#444;margin:0 0 24px;">Olá, <strong>${params.nomeOng}</strong>! O usuário <strong>${params.nomeUsuario}</strong> demonstrou interesse em ajudar uma de suas necessidades.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:24px;">
              <tr><td colspan="2" style="padding-bottom:12px;font-weight:700;color:#16a34a;border-bottom:1px solid #e5e7eb;margin-bottom:12px;">Detalhes do interesse</td></tr>
              <tr><td style="padding:6px 0;color:#555;">ID do interesse:</td><td style="padding:6px 0;font-weight:600;">#${params.interesseId}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Necessidade:</td><td style="padding:6px 0;font-weight:600;">${params.tituloNecessidade}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Usuário:</td><td style="padding:6px 0;font-weight:600;">${params.nomeUsuario}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Email do usuário:</td><td style="padding:6px 0;">${params.emailUsuario}</td></tr>
              ${detalheQuantidade}
              ${detalheData}
              ${detalheObs}
            </table>
            <p style="color:#444;">Acesse a plataforma para aceitar ou cancelar este interesse.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">Este é um email automático. Por favor, não responda.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
        from: FROM,
        to: params.emailOng,
        subject: `Novo interesse recebido: "${params.tituloNecessidade}"`,
        html,
    });
}

export async function enviarConfirmacaoRecebimentoUsuario(params: {
    interesseId: number;
    emailUsuario: string;
    nomeUsuario: string;
    nomeOng: string;
    tituloNecessidade: string;
    quantidadeRecebida: number;
    observacaoRecebimento?: string | null;
}) {
    const detalheObs = params.observacaoRecebimento
        ? `<tr><td style="padding:6px 0;color:#555;">Observação da ONG:</td><td style="padding:6px 0;">${params.observacaoRecebimento}</td></tr>`
        : "";

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#16a34a;padding:28px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;">OngsForAll</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#111;margin:0 0 8px;">Doação confirmada! Obrigado!</h2>
            <p style="color:#444;margin:0 0 24px;">Olá, <strong>${params.nomeUsuario}</strong>! A ONG <strong>${params.nomeOng}</strong> confirmou o recebimento da sua doação.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:24px;">
              <tr><td colspan="2" style="padding-bottom:12px;font-weight:700;color:#16a34a;border-bottom:1px solid #e5e7eb;margin-bottom:12px;">Detalhes do recebimento</td></tr>
              <tr><td style="padding:6px 0;color:#555;">ID do interesse:</td><td style="padding:6px 0;font-weight:600;">#${params.interesseId}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Necessidade:</td><td style="padding:6px 0;font-weight:600;">${params.tituloNecessidade}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">ONG:</td><td style="padding:6px 0;font-weight:600;">${params.nomeOng}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Quantidade recebida:</td><td style="padding:6px 0;font-weight:600;">${params.quantidadeRecebida}</td></tr>
              ${detalheObs}
            </table>
            <p style="color:#444;">Sua generosidade faz diferença! Você pode continuar ajudando outras ONGs pela plataforma.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">Este é um email automático. Por favor, não responda.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
        from: FROM,
        to: params.emailUsuario,
        subject: `${params.nomeOng} confirmou o recebimento da sua doação!`,
        html,
    });
}

export async function enviarLembreteEntrega(params: {
    interesseId: number;
    emailUsuario: string;
    nomeUsuario: string;
    tituloNecessidade: string;
    nomeOng: string;
    dataPrevista: string;
    quantidade?: number | null;
    tipo: "2dias" | "hoje";
}) {
    const titulo = params.tipo === "hoje"
        ? "Hoje é o dia da sua entrega!"
        : "Sua entrega é em 2 dias!";

    const subtitulo = params.tipo === "hoje"
        ? `Olá, <strong>${params.nomeUsuario}</strong>! Hoje é o dia combinado para entregar sua doação à ONG <strong>${params.nomeOng}</strong>.`
        : `Olá, <strong>${params.nomeUsuario}</strong>! Daqui a 2 dias é o prazo combinado para entregar sua doação à ONG <strong>${params.nomeOng}</strong>.`;

    const detalheQuantidade = params.quantidade
        ? `<tr><td style="padding:6px 0;color:#555;">Quantidade combinada:</td><td style="padding:6px 0;font-weight:600;">${params.quantidade}</td></tr>`
        : "";

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#d97706;padding:28px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;">OngsForAll</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#111;margin:0 0 8px;">${titulo}</h2>
            <p style="color:#444;margin:0 0 24px;">${subtitulo}</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:24px;">
              <tr><td colspan="2" style="padding-bottom:12px;font-weight:700;color:#d97706;border-bottom:1px solid #e5e7eb;margin-bottom:12px;">Detalhes da entrega</td></tr>
              <tr><td style="padding:6px 0;color:#555;">ID do interesse:</td><td style="padding:6px 0;font-weight:600;">#${params.interesseId}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Necessidade:</td><td style="padding:6px 0;font-weight:600;">${params.tituloNecessidade}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">ONG:</td><td style="padding:6px 0;font-weight:600;">${params.nomeOng}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Data prevista:</td><td style="padding:6px 0;font-weight:600;">${params.dataPrevista}</td></tr>
              ${detalheQuantidade}
            </table>
            <p style="color:#444;">Entre em contato com a ONG caso precise reagendar a entrega.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">Este é um email automático. Por favor, não responda.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
        from: FROM,
        to: params.emailUsuario,
        subject: `Lembrete: ${titulo} — ${params.tituloNecessidade}`,
        html,
    });
}
