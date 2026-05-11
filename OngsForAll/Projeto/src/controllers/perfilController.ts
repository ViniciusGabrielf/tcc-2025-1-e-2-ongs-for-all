import { FastifyRequest, FastifyReply } from "fastify";
import * as perfilService from "../services/perfilService";
import * as notificacaoService from "../services/notificacaoService";
import * as perfilRepo from "../repositories/perfilRepository";
import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";

const UPLOADS_DIR = path.join(__dirname, "..", "..", "public", "uploads", "logos");

async function getNaoLidas(user: { tipo: "usuario" | "ong" | "empresa"; id: number }) {
  const { naoLidas } = await notificacaoService.contarNaoLidas({
    tipoConta: user.tipo,
    id: Number(user.id),
  });
  return naoLidas;
}

function getLayout(tipo: string) {
  return tipo === "ong" ? "layouts/ongDashboardLayout" : "layouts/dashboardLayout";
}

function getBackUrl(tipo: string) {
  return tipo === "ong" ? "/dashboard/ong" : "/dashboard";
}

const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB


function parseMultipartFields(fields: Record<string, any>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, field] of Object.entries(fields)) {
    if (field && typeof field === "object" && "value" in field) {
      result[key] = field.value;
    }
  }
  return result;
}

export async function renderPerfilPage(request: FastifyRequest, reply: FastifyReply) {
  const session = request.session.user;
  if (!session) return reply.redirect("/login");

  const isOng = session.tipo === "ong";
  const result = isOng
    ? await perfilService.getOngProfile(Number(session.id))
    : await perfilService.getUserProfile(Number(session.id));

  if (!result.ok) return reply.status(404).send({ message: "Perfil não encontrado" });

  const naoLidas = await getNaoLidas(session);

  return reply.view("/templates/perfil.hbs", {
    user: result.user,
    isOng,
    isOngDashboard: isOng,
    naoLidas,
    backUrl: getBackUrl(session.tipo),
    success: (request.query as any)?.success === "1",
  }, { layout: getLayout(session.tipo) });
}

export async function updatePerfil(request: FastifyRequest, reply: FastifyReply) {
  const session = request.session.user;
  if (!session) return reply.redirect("/login");

  const isOng = session.tipo === "ong";
  const userId = Number(session.id);

  try {
    let nome: string, email: string, telefone: string | undefined, password: string | undefined, area_atuacao: string | undefined;
    let logoPath: string | null = null;

    if (isOng) {
      // ONG usa multipart/form-data (tem upload de logo)
      const data = await request.file();

      if (data) {
        const fields = parseMultipartFields(data.fields);
        nome = fields.nome;
        email = fields.email;
        telefone = fields.telefone;
        password = fields.password;
        area_atuacao = fields.area_atuacao;

        if (data.filename && data.mimetype) {
          if (!ALLOWED_MIMES.includes(data.mimetype)) {
            throw new Error("Formato de imagem não suportado. Use JPG, PNG, WebP ou GIF.");
          }

          const ext = path.extname(data.filename).toLowerCase() || ".jpg";
          const filename = `ong_${userId}_${Date.now()}${ext}`;
          const filepath = path.join(UPLOADS_DIR, filename);

          if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR, { recursive: true });
          }

          const writeStream = fs.createWriteStream(filepath);
          await pipeline(data.file, writeStream);

          const stats = fs.statSync(filepath);
          if (stats.size > MAX_FILE_SIZE) {
            fs.unlinkSync(filepath);
            throw new Error("Imagem muito grande. O tamanho máximo é 2MB.");
          }

          logoPath = `/public/uploads/logos/${filename}`;
        }
      } else {
        const body = request.body as any;
        nome = body.nome;
        email = body.email;
        telefone = body.telefone;
        password = body.password;
        area_atuacao = body.area_atuacao;
      }
    } else {
      // Usuário usa form normal (sem arquivo)
      const body = request.body as any;
      nome = body.nome;
      email = body.email;
      telefone = body.telefone;
      password = body.password;
    }

    const result = isOng
      ? await perfilService.updateOngProfile({
          ongId: userId,
          nome,
          email,
          telefone,
          areaAtuacao: area_atuacao,
          password,
        })
      : await perfilService.updateProfile({
          userId,
          nome,
          email,
          telefone,
          password,
        });

    if (!result.ok) {
      const current = isOng
        ? await perfilService.getOngProfile(userId)
        : await perfilService.getUserProfile(userId);

      const naoLidas = await getNaoLidas(session);

      return reply.view("/templates/perfil.hbs", {
        user: current.ok ? current.user : { id: userId, nome, email },
        isOng,
        isOngDashboard: isOng,
        naoLidas,
        backUrl: getBackUrl(session.tipo),
        message: result.error,
      }, { layout: getLayout(session.tipo) });
    }

    // Save logo if uploaded
    if (logoPath) {
      // Delete old logo if exists
      const currentOng = await perfilService.getOngProfile(userId);
      if (currentOng.ok && currentOng.user.logo) {
        const oldFilePath = path.join(__dirname, "..", "..", "public", currentOng.user.logo.replace("/public/", ""));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }
      await perfilRepo.updateOngLogo(userId, logoPath);
    }

    request.session.user = {
      ...session,
      id: userId,
      nome,
      email,
      ...(logoPath ? { logo: logoPath } : {}),
    };

    return reply.redirect("/perfil/editar?success=1");
  } catch (error: any) {
    console.error("Erro ao atualizar perfil:", error);

    const current = isOng
      ? await perfilService.getOngProfile(userId)
      : await perfilService.getUserProfile(userId);

    const naoLidas = await getNaoLidas(session);

    return reply.view("/templates/perfil.hbs", {
      user: current.ok ? current.user : { id: userId },
      isOng,
      isOngDashboard: isOng,
      naoLidas,
      backUrl: getBackUrl(session.tipo),
      message: error.message || "Erro ao atualizar perfil",
    }, { layout: getLayout(session.tipo) });
  }
}
