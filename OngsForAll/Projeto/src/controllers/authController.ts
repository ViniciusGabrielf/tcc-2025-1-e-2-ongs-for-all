// src/controllers/authController.ts
import { FastifyReply, FastifyRequest } from "fastify";
import bcrypt from "bcryptjs";
import { z, ZodError } from "zod";
import { validateLogin } from "../validators/authValidator";

import * as authService from "../services/authService";
import * as emailService from "../services/emailService";
import { validateAndLookupCnpj } from "../services/cnpjService";
import { pool } from "../config/ds"; // ainda usado em registerUser/registerONG por enquanto (pode refatorar depois)

// =======================
// Schemas (validaÃ§Ã£o)
// =======================
const registerUserSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  cpf: z.string().length(11),
  telefone: z.string().min(10).max(11),
});

const ongSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
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
  const redirectTo = getSafeRedirectPath((request.query as any).redirect);
  const registerUrl = redirectTo ? `/register?redirect=${encodeURIComponent(redirectTo)}` : "/register";
  return reply.view(
    "/templates/auth/login.hbs",
    { logoutSuccess, resetSuccess, redirectTo, registerUrl },
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

// =======================
// Cadastro (mantido com SQL direto por enquanto)
// =======================
export async function registerUser(request: FastifyRequest, reply: FastifyReply) {
  try {
    const rawBody = request.body as Record<string, string>;
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

    await pool.query(
      `INSERT INTO usuarios (nome, email, senha, cpf, telefone)
       VALUES (?, ?, ?, ?, ?)`,
      [body.nome, body.email, hashedPassword, body.cpf, body.telefone]
    );

    const redirectTo = getSafeRedirectPath(rawBody.redirect);
    const loginTarget = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";
    return reply.redirect(loginTarget);
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
    };

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

    await pool.query(
      `INSERT INTO ongs (nome, email, senha, cnpj, area_atuacao, telefone)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ong.nome, ong.email, hashedPassword, cnpjValidation.cnpj, ong.area_atuacao, ong.telefone]
    );

    const redirectTo = getSafeRedirectPath((request.body as any)?.redirect);
    const loginTarget = redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : "/login";
    return reply.redirect(loginTarget);
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
  const { nome, email, cpf } = request.body as { nome: string; email: string; cpf: string };

  try {
    const result = await authService.requestPasswordReset(nome, email, cpf);

    if (!result.ok) {
      return reply.view(
        "/templates/auth/forgotPassword.hbs",
        { error: "Dados incorretos. Verifique seu nome, e-mail e CPF." },
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

  if (!password || password.length < 6) {
    return reply.view(
      "/templates/auth/resetPassword.hbs",
      { error: "A senha deve ter no mínimo 6 caracteres." },
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
