// src/controllers/authController.ts
import { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { z, ZodError } from "zod";
import { validateLogin } from "../validators/authValidator";

import { SENHA_MSG, senhaForte } from "../utils/passwordValidator";
import { ensureEmailVerificadoColumns, atualizarEmailNaoVerificado } from "../repositories/authRepository";
import * as authService from "../services/authService";
import * as emailService from "../services/emailService";
import { validateAndLookupCnpj } from "../services/cnpjService";
import { pool } from "../config/ds"; // ainda usado em registerUser/registerONG por enquanto (pode refatorar depois)

const TERMOS_USO_VERSAO = "2026-05-29";
const TERMOS_ACEITE_MSG = "Para criar sua conta, voce precisa aceitar os Termos de Uso e a Politica de Privacidade.";

// =======================
// Schemas (validaÃ§Ã£o)
// =======================
const registerUserSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  password: z.string().refine(senhaForte, { message: SENHA_MSG }),
  cpf: z.string().length(11),
  telefone: z.string().min(10).max(11),
});

const ongSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  password: z.string().refine(senhaForte, { message: SENHA_MSG }),
  cnpj: z.string().length(14),
  area_atuacao: z.string().min(1),
  telefone: z.string().min(10).max(11),
});

function normalizeDigits(value: string | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim();
}

function getSafeRedirectPath(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();

  if (!normalized.startsWith("/")) return null;
  if (normalized.startsWith("//")) return null;

  return normalized;
}

function getDuplicateFieldMessage(error: any, fields: Record<string, string>, fallback: string): string {
  const rawMessage = `${error?.sqlMessage ?? ""} ${error?.message ?? ""}`.toLowerCase();

  for (const [field, message] of Object.entries(fields)) {
    if (rawMessage.includes(field.toLowerCase())) {
      return message;
    }
  }

  return fallback;
}

function hasAcceptedTerms(value: unknown): boolean {
  return value === "on" || value === "true" || value === "1";
}

function renderRegisterUserError(reply: FastifyReply, error: string, form?: Record<string, string>) {
  const redirectTo = getSafeRedirectPath(form?.redirect);
  return reply.status(400).view(
    "/templates/auth/register.hbs",
    { error, form, redirectTo, activeTab: "#tab1" },
    { layout: "layouts/authLayout" }
  );
}

function renderRegisterOngError(reply: FastifyReply, error: string, form?: Record<string, string>) {
  const redirectTo = getSafeRedirectPath(form?.redirect);
  return reply.status(400).view(
    "/templates/auth/register.hbs",
    { error, form, redirectTo, activeTab: "#tab2" },
    { layout: "layouts/authLayout" }
  );
}

// =======================
// Pages
// =======================
export async function renderAuthLoginPage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const logoutSuccess = (request.query as any).logout === "1";
  const resetSuccess = (request.query as any).reset === "1";
  const verificadoSuccess = (request.query as any).verificado === "1";
  const redirectTo = getSafeRedirectPath((request.query as any).redirect);
  const registerUrl = redirectTo ? `/register?redirect=${encodeURIComponent(redirectTo)}` : "/register";
  return reply.view(
    "/templates/auth/login.hbs",
    { logoutSuccess, resetSuccess, verificadoSuccess, redirectTo, registerUrl },
    { layout: "layouts/authLayout" }
  );
}

export async function renderAuthRegisterPage(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const tab = (request.query as any)?.tab;
  const redirectTo = getSafeRedirectPath((request.query as any)?.redirect);
  const loginUrl = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";
  const activeTab =
    tab === "empresa" ? "#tab3" :
    tab === "ong" ? "#tab2" :
    "#tab1";

  return reply.view("/templates/auth/register.hbs", { activeTab, redirectTo, loginUrl }, { layout: "layouts/authLayout" });
}

export async function renderTermosUsoPage(_request: FastifyRequest, reply: FastifyReply): Promise<void> {
  return reply.view(
    "/templates/auth/termos-uso.hbs",
    { versaoTermos: TERMOS_USO_VERSAO },
    { layout: "layouts/authLayout" }
  );
}

// =======================
// Cadastro (mantido com SQL direto por enquanto)
// =======================
export async function registerUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    const rawBody = request.body as Record<string, string>;
    if (!hasAcceptedTerms(rawBody.aceite_termos)) {
      return renderRegisterUserError(reply, TERMOS_ACEITE_MSG, rawBody);
    }

    const body = registerUserSchema.parse({
      nome: normalizeText(rawBody.nome),
      email: normalizeText(rawBody.email),
      password: rawBody.password,
      cpf: normalizeDigits(rawBody.cpf),
      telefone: normalizeDigits(rawBody.telefone),
    });

    const [cpfRows]: any = await pool.query(
      `SELECT id
       FROM usuarios
       WHERE REPLACE(REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', ''), '/', '') = ?
       LIMIT 1`,
      [body.cpf]
    );

    if (cpfRows?.length) {
      return renderRegisterUserError(reply, "CPF jÃ¡ cadastrado.", rawBody);
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);

    await ensureEmailVerificadoColumns();
    await pool.query(
      `INSERT INTO usuarios (nome, email, senha, cpf, telefone, email_verificado, termos_aceitos_em, termos_versao)
       VALUES (?, ?, ?, ?, ?, 0, NOW(), ?)`,
      [body.nome, body.email, hashedPassword, body.cpf, body.telefone, TERMOS_USO_VERSAO]
    );

    const codigo = await authService.gerarEEnviarCodigoVerificacao(body.email, body.nome, "usuario");
    emailService.enviarCodigoVerificacaoEmail({ email: body.email, nome: body.nome, codigo })
      .catch(err => console.error("[EMAIL] Falha ao enviar verificação:", err.message));

    return reply.redirect(`/verificar-email?email=${encodeURIComponent(body.email)}`);
  } catch (error: any) {
    console.error("Erro ao registrar usuÃ¡rio:", error);

    if (error instanceof ZodError) {
      return renderRegisterUserError(
        reply,
        error.errors[0]?.message ?? "Dados inválidos.",
        request.body as Record<string, string>
      );
    }

    if (error?.code === "ER_DUP_ENTRY") {
      const message = getDuplicateFieldMessage(
        error,
        {
          email: "Email jÃ¡ cadastrado.",
          cpf: "CPF jÃ¡ cadastrado.",
        },
        "UsuÃ¡rio jÃ¡ cadastrado."
      );

      return renderRegisterUserError(reply, message, request.body as Record<string, string>);
    }

    return reply.status(500).send({ message: "Erro ao registrar usuario" });
  }
}

export async function registerONG(request: FastifyRequest, reply: FastifyReply) {
  try {
    const body = request.body as {
      nomeong: string;
      emailong: string;
      passwordong: string;
      cnpj_ong: string;
      areadeatuacao: string;
      telefoneong: string;
      aceite_termos?: string;
    };

    if (!hasAcceptedTerms(body.aceite_termos)) {
      return renderRegisterOngError(reply, TERMOS_ACEITE_MSG, body as any);
    }

    const ong = ongSchema.parse({
      nome: normalizeText(body.nomeong),
      email: normalizeText(body.emailong),
      password: body.passwordong,
      cnpj: normalizeDigits(body.cnpj_ong),
      area_atuacao: normalizeText(body.areadeatuacao),
      telefone: normalizeDigits(body.telefoneong),
    });

    const cnpjValidation = await validateAndLookupCnpj(ong.cnpj);
    if (!cnpjValidation.ok) {
      return renderRegisterOngError(
        reply,
        `${cnpjValidation.message} Informe um CNPJ valido e ativo para cadastrar a ONG.`,
        body as any
      );
    }

    const [cnpjRows]: any = await pool.query(
      `SELECT ong_id
       FROM ongs
       WHERE REPLACE(REPLACE(REPLACE(REPLACE(cnpj, '.', ''), '-', ''), ' ', ''), '/', '') = ?
       LIMIT 1`,
      [ong.cnpj]
    );

    if (cnpjRows?.length) {
      return renderRegisterOngError(reply, "CNPJ da ONG jÃ¡ cadastrado.", body as any);
    }

    const hashedPassword = await bcrypt.hash(ong.password, 10);

    await ensureEmailVerificadoColumns();
    await pool.query(
      `INSERT INTO ongs (nome, email, senha, cnpj, area_atuacao, telefone, email_verificado, termos_aceitos_em, termos_versao)
       VALUES (?, ?, ?, ?, ?, ?, 0, NOW(), ?)`,
      [ong.nome, ong.email, hashedPassword, cnpjValidation.cnpj, ong.area_atuacao, ong.telefone, TERMOS_USO_VERSAO]
    );

    const codigo = await authService.gerarEEnviarCodigoVerificacao(ong.email, ong.nome, "ong");
    emailService.enviarCodigoVerificacaoEmail({ email: ong.email, nome: ong.nome, codigo })
      .catch(err => console.error("[EMAIL] Falha ao enviar verificação:", err.message));

    return reply.redirect(`/verificar-email?email=${encodeURIComponent(ong.email)}`);
  } catch (error: any) {
    console.error("Erro ao cadastrar ONG:", error);

    if (error instanceof ZodError) {
      return renderRegisterOngError(
        reply,
        error.errors[0]?.message ?? "Dados inválidos.",
        request.body as Record<string, string>
      );
    }

    if (error?.code === "ER_DUP_ENTRY") {
      const message = getDuplicateFieldMessage(
        error,
        {
          email: "Email da ONG jÃ¡ cadastrado.",
          cnpj: "CNPJ da ONG jÃ¡ cadastrado.",
        },
        "ONG jÃ¡ cadastrada."
      );

      return renderRegisterOngError(reply, message, request.body as Record<string, string>);
    }

    return reply.status(500).send({ message: "Erro ao cadastrar ONG" });
  }
}

// =======================
// Login (agora via Service)
// =======================
export async function loginUser(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
    const { email, password } = request.body as {
    email: string;
    password: string;
    redirect?: string;
  };
  const redirectTo = getSafeRedirectPath((request.body as any)?.redirect);

  const ip = request.ip;

  const validation = validateLogin({ email, password });

  if (!validation.isValid) {
    if (process.env.NODE_ENV === "test") {
      return reply.status(400).send({ error: validation.errors[0] });
    }

    return reply.status(400).view(
      "/templates/auth/login.hbs",
        {
          error: validation.errors[0],
          email,
          redirectTo,
        },
        { layout: "layouts/authLayout" }
      );
  }

  try {
    const result = await authService.login(email.trim(), password, ip);

    if (!result.ok) {
      if ("naoVerificado" in result && result.naoVerificado) {
        return reply.redirect(
          `/verificar-email?email=${encodeURIComponent(result.email)}&pendente=1`
        );
      }

      if (process.env.NODE_ENV === "test") {
        return reply.status(401).send({ error: "E-mail ou senha incorretos" });
      }

      return reply.view(
        "/templates/auth/login.hbs",
        {
          error: "E-mail ou senha incorretos",
          email,
          redirectTo,
        },
        { layout: "layouts/authLayout" }
      );
    }

    await request.session.regenerate();
    request.session.user = result.user;
    console.log(`[LOGIN] ${result.user.tipo.toUpperCase()} | usuario_id=${result.user.id}`);

    if (redirectTo) {
      return reply.redirect(redirectTo);
    }

    if (result.user.tipo === "ong") {
      return reply.redirect("/dashboard/ong");
    }

    if (result.user.tipo === "empresa") {
      return reply.redirect("/empresa/dashboard");
    }

    return reply.redirect("/dashboard");
  } catch (error) {
    console.error("Erro ao fazer login:", error);

    if (process.env.NODE_ENV === "test") {
      return reply.status(500).send({ error: "Erro interno no servidor" });
    }

    return reply.status(500).send({ message: "Erro no servidor" });
  }
}

export async function logoutUser(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const user = request.session.user;
  try {
    await request.session.destroy();
  } catch (err) {
    // sessÃ£o jÃ¡ expirada
  }
  if (user) {
    console.log(`[LOGOUT] ${user.tipo.toUpperCase()} | usuario_id=${user.id}`);
  }
  return reply.redirect("/login?logout=1");
}

// =======================
// Esqueci senha (agora via Service)
// =======================
export async function renderForgotPasswordPage(request: FastifyRequest, reply: FastifyReply) {
  return reply.view("/templates/auth/forgotPassword.hbs", {}, { layout: "layouts/authLayout" });
}

export async function handleForgotPassword(request: FastifyRequest, reply: FastifyReply) {
  const { nome, email, cpf_cnpj } = request.body as { nome: string; email: string; cpf_cnpj: string };

  try {
    const result = await authService.requestPasswordReset(nome, email, cpf_cnpj);

    if (!result.ok) {
      return reply.view(
        "/templates/auth/forgotPassword.hbs",
        { error: "Dados incorretos. Verifique seu nome, e-mail e CPF/CNPJ." },
        { layout: "layouts/authLayout" }
      );
    }

    emailService.enviarCodigoRedefinicaoSenha({
      email: email.trim(),
      nome: nome.trim(),
      codigo: result.token,
    }).catch((err) => console.error("[EMAIL] Falha ao enviar código de redefinição:", err.message));

    return reply.redirect("/redefinir-senha?enviado=1");
  } catch (error) {
    console.error("Erro ao gerar reset:", error);
    return reply.status(500).send({ message: "Erro no servidor" });
  }
}

// =======================
// Redefinir senha (token)
// =======================
export async function renderResetPasswordPage(request: FastifyRequest, reply: FastifyReply) {
  const emailEnviado = (request.query as any).enviado === "1";
  return reply.view(
    "/templates/auth/resetPassword.hbs",
    { emailEnviado },
    { layout: "layouts/authLayout" }
  );
}

export async function handleResetPassword(request: FastifyRequest, reply: FastifyReply) {
  const { codigo, password, confirmarSenha } = request.body as {
    codigo: string;
    password: string;
    confirmarSenha?: string;
  };

  const codigoNormalizado = (codigo ?? "").trim();

  if (!codigoNormalizado) {
    return reply.view(
      "/templates/auth/resetPassword.hbs",
      { error: "Informe o código recebido por e-mail." },
      { layout: "layouts/authLayout" }
    );
  }

  if (!password || !senhaForte(password)) {
    return reply.view(
      "/templates/auth/resetPassword.hbs",
      { error: SENHA_MSG },
      { layout: "layouts/authLayout" }
    );
  }

  if (confirmarSenha !== undefined && password !== confirmarSenha) {
    return reply.view(
      "/templates/auth/resetPassword.hbs",
      { error: "As senhas não coincidem." },
      { layout: "layouts/authLayout" }
    );
  }

  try {
    const result = await authService.resetPassword(codigoNormalizado, password);

    if (!result.ok) {
      return reply.view(
        "/templates/auth/resetPassword.hbs",
        { error: "Código inválido ou expirado. Solicite novamente." },
        { layout: "layouts/authLayout" }
      );
    }

    return reply.redirect("/login?reset=1");
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    return reply.view(
      "/templates/auth/resetPassword.hbs",
      { error: "Erro interno ao redefinir. Tente novamente." },
      { layout: "layouts/authLayout" }
    );
  }
}

// =======================
// Verificação de e-mail
// =======================
export async function renderVerificarEmailPage(request: FastifyRequest, reply: FastifyReply) {
  const email = ((request.query as any).email ?? "").trim();
  const pendente = (request.query as any).pendente === "1";
  const reenviado = (request.query as any).reenviado === "1";
  return reply.view(
    "/templates/auth/verificarEmail.hbs",
    { email, pendente, reenviado },
    { layout: "layouts/authLayout" }
  );
}

export async function handleVerificarEmail(request: FastifyRequest, reply: FastifyReply) {
  const { email, codigo } = request.body as { email: string; codigo: string };

  const emailNorm = (email ?? "").trim();
  const codigoNorm = (codigo ?? "").trim();

  if (!emailNorm || !codigoNorm) {
    return reply.view(
      "/templates/auth/verificarEmail.hbs",
      { email: emailNorm, error: "Informe o código de verificação." },
      { layout: "layouts/authLayout" }
    );
  }

  const result = await authService.verificarCodigoEmail(emailNorm, codigoNorm);

  if (!result.ok) {
    return reply.view(
      "/templates/auth/verificarEmail.hbs",
      { email: emailNorm, error: "Código inválido ou expirado. Solicite um novo código." },
      { layout: "layouts/authLayout" }
    );
  }

  return reply.redirect("/login?verificado=1");
}

export async function handleReenviarVerificacao(request: FastifyRequest, reply: FastifyReply) {
  const { email } = request.body as { email: string };
  const emailNorm = (email ?? "").trim();

  if (!emailNorm) return reply.redirect("/register");

  try {
    const conta = await authService.buscarContaPorEmail(emailNorm);

    if (conta) {
      const codigo = await authService.gerarEEnviarCodigoVerificacao(emailNorm, conta.nome, conta.tipo);
      emailService.enviarCodigoVerificacaoEmail({ email: emailNorm, nome: conta.nome, codigo })
        .catch(err => console.error("[EMAIL] Falha ao reenviar verificação:", err.message));
    }
  } catch (err) {
    console.error("[VERIFICACAO] Erro ao reenviar código:", err);
  }

  return reply.redirect(`/verificar-email?email=${encodeURIComponent(emailNorm)}&reenviado=1`);
}

export async function handleAlterarEmailVerificacao(request: FastifyRequest, reply: FastifyReply) {
  const { email_antigo, email_novo } = request.body as { email_antigo: string; email_novo: string };

  const emailAntigo = (email_antigo ?? "").trim().toLowerCase();
  const emailNovo = (email_novo ?? "").trim().toLowerCase();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailNovo || !emailRegex.test(emailNovo)) {
    return reply.view(
      "/templates/auth/verificarEmail.hbs",
      { email: emailAntigo, error: "Informe um e-mail válido." },
      { layout: "layouts/authLayout" }
    );
  }

  if (emailNovo === emailAntigo) {
    return reply.redirect(`/verificar-email?email=${encodeURIComponent(emailAntigo)}`);
  }

  try {
    const atualizado = await atualizarEmailNaoVerificado(emailAntigo, emailNovo);

    if (!atualizado) {
      return reply.view(
        "/templates/auth/verificarEmail.hbs",
        { email: emailAntigo, error: "Não foi possível alterar o e-mail. Tente se cadastrar novamente." },
        { layout: "layouts/authLayout" }
      );
    }

    const conta = await authService.buscarContaPorEmail(emailNovo);
    if (conta) {
      const codigo = await authService.gerarEEnviarCodigoVerificacao(emailNovo, conta.nome, conta.tipo);
      emailService.enviarCodigoVerificacaoEmail({ email: emailNovo, nome: conta.nome, codigo })
        .catch(err => console.error("[EMAIL] Falha ao enviar verificação:", err.message));
    }

    return reply.redirect(`/verificar-email?email=${encodeURIComponent(emailNovo)}&reenviado=1`);
  } catch (err) {
    console.error("[VERIFICACAO] Erro ao alterar e-mail:", err);
    return reply.view(
      "/templates/auth/verificarEmail.hbs",
      { email: emailAntigo, error: "Erro ao alterar o e-mail. Tente novamente." },
      { layout: "layouts/authLayout" }
    );
  }
}
