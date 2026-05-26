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
    tipo: "aceitacao" | "2dias" | "hoje";
}) {
    const titulo = params.tipo === "hoje"
        ? "Hoje é o dia da sua entrega!"
        : params.tipo === "2dias"
        ? "Sua entrega é em 2 dias!"
        : "Lembrete: data de entrega agendada";

    const subtitulo = params.tipo === "hoje"
        ? `Olá, <strong>${params.nomeUsuario}</strong>! Hoje é o dia combinado para entregar sua doação à ONG <strong>${params.nomeOng}</strong>.`
        : params.tipo === "2dias"
        ? `Olá, <strong>${params.nomeUsuario}</strong>! Daqui a 2 dias é o prazo combinado para entregar sua doação à ONG <strong>${params.nomeOng}</strong>.`
        : `Olá, <strong>${params.nomeUsuario}</strong>! Seu interesse foi aceito pela ONG <strong>${params.nomeOng}</strong>. Não esqueça da data combinada para a entrega!`;

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
        subject: params.tipo === "aceitacao"
            ? `Lembrete de entrega — ${params.tituloNecessidade}`
            : `Lembrete: ${titulo} — ${params.tituloNecessidade}`,
        html,
    });
}

export async function enviarAceitacaoInteresseUsuario(params: {
    interesseId: number;
    emailUsuario: string;
    nomeUsuario: string;
    nomeOng: string;
    tituloNecessidade: string;
    dataPrevista?: string | null;
    quantidade?: number | null;
}) {
    const detalheData = params.dataPrevista
        ? `<tr><td style="padding:6px 0;color:#555;">Data prevista de entrega:</td><td style="padding:6px 0;font-weight:600;">${params.dataPrevista}</td></tr>`
        : "";
    const detalheQtd = params.quantidade
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
          <td style="background:#16a34a;padding:28px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;">OngsForAll</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#111;margin:0 0 8px;">Seu interesse foi aceito!</h2>
            <p style="color:#444;margin:0 0 24px;">Olá, <strong>${params.nomeUsuario}</strong>! A ONG <strong>${params.nomeOng}</strong> aceitou seu interesse de doação. Agora é só realizar a entrega na data combinada.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:24px;">
              <tr><td colspan="2" style="padding-bottom:12px;font-weight:700;color:#16a34a;border-bottom:1px solid #e5e7eb;margin-bottom:12px;">Detalhes do interesse</td></tr>
              <tr><td style="padding:6px 0;color:#555;">ID do interesse:</td><td style="padding:6px 0;font-weight:600;">#${params.interesseId}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Necessidade:</td><td style="padding:6px 0;font-weight:600;">${params.tituloNecessidade}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">ONG:</td><td style="padding:6px 0;font-weight:600;">${params.nomeOng}</td></tr>
              ${detalheQtd}
              ${detalheData}
            </table>
            <p style="color:#444;">Entre em contato com a ONG pelo chat da plataforma caso tenha dúvidas sobre a entrega.</p>
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
        subject: `Seu interesse #${params.interesseId} foi aceito pela ONG ${params.nomeOng}!`,
        html,
    });
}

export async function enviarCancelamentoInteresseUsuario(params: {
    interesseId: number;
    emailUsuario: string;
    nomeUsuario: string;
    nomeOng: string;
    tituloNecessidade: string;
    motivo?: string | null;
}) {
    const detalheMotivo = params.motivo
        ? `<tr><td colspan="2" style="padding-top:16px;">
             <p style="margin:0 0 6px;font-weight:600;color:#dc2626;">Motivo informado pela ONG:</p>
             <p style="margin:0;color:#444;line-height:1.6;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px;">${params.motivo}</p>
           </td></tr>`
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
          <td style="background:#dc2626;padding:28px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;">OngsForAll</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#111;margin:0 0 8px;">Seu interesse foi cancelado</h2>
            <p style="color:#444;margin:0 0 24px;">Olá, <strong>${params.nomeUsuario}</strong>. Infelizmente a ONG <strong>${params.nomeOng}</strong> cancelou seu interesse de doação.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:24px;">
              <tr><td colspan="2" style="padding-bottom:12px;font-weight:700;color:#dc2626;border-bottom:1px solid #e5e7eb;margin-bottom:12px;">Detalhes do cancelamento</td></tr>
              <tr><td style="padding:6px 0;color:#555;">ID do interesse:</td><td style="padding:6px 0;font-weight:600;">#${params.interesseId}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Necessidade:</td><td style="padding:6px 0;font-weight:600;">${params.tituloNecessidade}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">ONG:</td><td style="padding:6px 0;font-weight:600;">${params.nomeOng}</td></tr>
              ${detalheMotivo}
            </table>
            <p style="color:#444;">Você pode explorar outras necessidades na plataforma e demonstrar interesse em novas causas.</p>
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
        subject: `Seu interesse #${params.interesseId} foi cancelado pela ONG ${params.nomeOng}`,
        html,
    });
}

export async function enviarCancelamentoInteresseParaOng(params: {
    interesseId: number;
    emailOng: string;
    nomeOng: string;
    nomeUsuario: string;
    tituloNecessidade: string;
    motivo?: string | null;
}) {
    const detalheMotivo = params.motivo
        ? `<tr><td colspan="2" style="padding-top:16px;">
             <p style="margin:0 0 6px;font-weight:600;color:#dc2626;">Motivo informado pelo usuário:</p>
             <p style="margin:0;color:#444;line-height:1.6;background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:12px;">${params.motivo}</p>
           </td></tr>`
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
          <td style="background:#dc2626;padding:28px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;">OngsForAll</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#111;margin:0 0 8px;">Interesse cancelado pelo usuário</h2>
            <p style="color:#444;margin:0 0 24px;">Olá, <strong>${params.nomeOng}</strong>! O usuário <strong>${params.nomeUsuario}</strong> cancelou o interesse de doação a seguir.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:24px;">
              <tr><td colspan="2" style="padding-bottom:12px;font-weight:700;color:#dc2626;border-bottom:1px solid #e5e7eb;margin-bottom:12px;">Detalhes do cancelamento</td></tr>
              <tr><td style="padding:6px 0;color:#555;">ID do interesse:</td><td style="padding:6px 0;font-weight:600;">#${params.interesseId}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Necessidade:</td><td style="padding:6px 0;font-weight:600;">${params.tituloNecessidade}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Usuário:</td><td style="padding:6px 0;font-weight:600;">${params.nomeUsuario}</td></tr>
              ${detalheMotivo}
            </table>
            <p style="color:#444;">Este interesse foi removido da fila de pendentes automaticamente.</p>
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
        subject: `Interesse #${params.interesseId} cancelado pelo usuário — ${params.tituloNecessidade}`,
        html,
    });
}

export async function enviarEdicaoInteresseParaOng(params: {
    interesseId: number;
    emailOng: string;
    nomeOng: string;
    nomeUsuario: string;
    tituloNecessidade: string;
    novaObservacao?: string | null;
    novaDataPrevista?: string | null;
    novaQuantidade?: number | null;
}) {
    const detalheObs = params.novaObservacao
        ? `<tr><td style="padding:6px 0;color:#555;">Observação:</td><td style="padding:6px 0;">${params.novaObservacao}</td></tr>`
        : "";
    const detalheData = params.novaDataPrevista
        ? `<tr><td style="padding:6px 0;color:#555;">Data prevista:</td><td style="padding:6px 0;font-weight:600;">${params.novaDataPrevista}</td></tr>`
        : "";
    const detalheQtd = params.novaQuantidade
        ? `<tr><td style="padding:6px 0;color:#555;">Quantidade:</td><td style="padding:6px 0;font-weight:600;">${params.novaQuantidade}</td></tr>`
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
          <td style="background:#2D4BA6;padding:28px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;">OngsForAll</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#111;margin:0 0 8px;">Interesse atualizado pelo usuário</h2>
            <p style="color:#444;margin:0 0 24px;">Olá, <strong>${params.nomeOng}</strong>! O usuário <strong>${params.nomeUsuario}</strong> atualizou os detalhes do interesse de doação a seguir.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:24px;">
              <tr><td colspan="2" style="padding-bottom:12px;font-weight:700;color:#2D4BA6;border-bottom:1px solid #e5e7eb;margin-bottom:12px;">Dados atualizados</td></tr>
              <tr><td style="padding:6px 0;color:#555;">ID do interesse:</td><td style="padding:6px 0;font-weight:600;">#${params.interesseId}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Necessidade:</td><td style="padding:6px 0;font-weight:600;">${params.tituloNecessidade}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">Usuário:</td><td style="padding:6px 0;font-weight:600;">${params.nomeUsuario}</td></tr>
              ${detalheQtd}
              ${detalheData}
              ${detalheObs}
            </table>
            <p style="color:#444;">Acesse a plataforma para visualizar todos os detalhes atualizados.</p>
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
        subject: `Interesse #${params.interesseId} atualizado pelo usuário — ${params.tituloNecessidade}`,
        html,
    });
}

export async function enviarCodigoRedefinicaoSenha(params: {
    email: string;
    nome: string;
    codigo: string;
}) {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#2D4BA6;padding:28px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;">OngsForAll</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#111;margin:0 0 8px;">Redefinição de senha</h2>
            <p style="color:#444;margin:0 0 24px;">Olá, <strong>${params.nome}</strong>! Recebemos uma solicitação para redefinir a senha da sua conta.</p>
            <p style="color:#444;margin:0 0 16px;">Use o código abaixo para redefinir sua senha:</p>
            <div style="text-align:center;margin:32px 0;">
              <span style="display:inline-block;background:#1D3273;color:#ffffff;font-size:36px;font-weight:700;letter-spacing:12px;padding:16px 32px;border-radius:8px;">${params.codigo}</span>
            </div>
            <p style="color:#888;font-size:13px;margin:0 0 8px;">O código é válido por 30 minutos.</p>
            <p style="color:#888;font-size:13px;margin:0;">Se você não solicitou a redefinição, ignore este e-mail — sua senha permanece a mesma.</p>
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
        to: params.email,
        subject: `Seu código de redefinição de senha — OngsForAll`,
        html,
    });
}

export async function enviarCodigoVerificacaoEmail(params: {
    email: string;
    nome: string;
    codigo: string;
}) {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#2D4BA6;padding:28px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;">OngsForAll</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#111;margin:0 0 8px;">Confirme seu e-mail</h2>
            <p style="color:#444;margin:0 0 24px;">Olá, <strong>${params.nome}</strong>! Para ativar sua conta, insira o código abaixo na tela de verificação.</p>
            <div style="text-align:center;margin:32px 0;">
              <span style="display:inline-block;background:#1D3273;color:#ffffff;font-size:36px;font-weight:700;letter-spacing:12px;padding:16px 32px;border-radius:8px;">${params.codigo}</span>
            </div>
            <p style="color:#888;font-size:13px;margin:0 0 8px;">O código é válido por 30 minutos.</p>
            <p style="color:#888;font-size:13px;margin:0;">Se você não criou uma conta, ignore este e-mail.</p>
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
        to: params.email,
        subject: `Seu código de verificação de e-mail — OngsForAll`,
        html,
    });
}

export async function enviarMensagemContato(params: {
    nome: string;
    email: string;
    mensagem: string;
}) {
    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:#2D4BA6;padding:28px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;">OngsForAll</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <h2 style="color:#111;margin:0 0 8px;">Nova mensagem de contato</h2>
            <p style="color:#444;margin:0 0 24px;">Você recebeu uma nova mensagem pelo formulário do site.</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:24px;">
              <tr><td colspan="2" style="padding-bottom:12px;font-weight:700;color:#2D4BA6;border-bottom:1px solid #e5e7eb;margin-bottom:12px;">Dados do remetente</td></tr>
              <tr><td style="padding:6px 0;color:#555;width:120px;">Nome:</td><td style="padding:6px 0;font-weight:600;">${params.nome}</td></tr>
              <tr><td style="padding:6px 0;color:#555;">E-mail:</td><td style="padding:6px 0;"><a href="mailto:${params.email}" style="color:#2D4BA6;">${params.email}</a></td></tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:6px;padding:16px;">
              <tr><td style="padding-bottom:12px;font-weight:700;color:#2D4BA6;border-bottom:1px solid #e5e7eb;">Mensagem</td></tr>
              <tr><td style="padding-top:12px;color:#444;line-height:1.6;white-space:pre-wrap;">${params.mensagem}</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:20px 32px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="color:#9ca3af;font-size:12px;margin:0;">Mensagem enviada pelo formulário de contato do site OngsForAll.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    await transporter.sendMail({
        from: FROM,
        to: process.env.EMAIL_USER,
        replyTo: params.email,
        subject: `[Contato] Nova mensagem de ${params.nome}`,
        html,
    });
}
