import { FastifyRequest, FastifyReply } from "fastify";
import * as perfilService from "../services/perfilService";
import * as notificacaoService from "../services/notificacaoService";
import * as perfilRepo from "../repositories/perfilRepository";
import { processarUploadComModeracao } from "../services/moderacaoImagemService";
import { detectMimeFromFile } from "../utils/magicBytes";
import path from "path";
import fs from "fs";
import { pipeline } from "stream/promises";

const UPLOADS_DIR = path.join(__dirname, "..", "..", "public", "uploads", "logos");
const TEMP_DIR = path.join(__dirname, "..", "..", "private", "temp");

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
    documentoPendingNotice: (request.query as any)?.documento === "pendente",
  }, { layout: getLayout(session.tipo) });
}

export async function updatePerfil(request: FastifyRequest, reply: FastifyReply) {
  const session = request.session.user;
  if (!session) return reply.redirect("/login");

  const isOng = session.tipo === "ong";
  const userId = Number(session.id);

  try {
    let nome: string, email: string, telefone: string | undefined, password: string | undefined, area_atuacao: string | undefined;
    let cpf: string | undefined, cnpj: string | undefined;
    let logoPath: string | null = null;

    let cep: string | undefined, logradouro: string | undefined, numero: string | undefined;
    let complemento: string | undefined, bairro: string | undefined, cidade: string | undefined, estado: string | undefined;
    let localizacaoPublica = false, localizacaoAproximada = false, atendimentoRemoto = false;
    let instrucoesChegada: string | undefined;

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
        cnpj = fields.cnpj;
        cep = fields.cep;
        logradouro = fields.logradouro;
        numero = fields.numero;
        complemento = fields.complemento;
        bairro = fields.bairro;
        cidade = fields.cidade;
        estado = fields.estado;
        localizacaoPublica   = fields.localizacao_publica   === "1";
        localizacaoAproximada = fields.localizacao_aproximada === "1";
        atendimentoRemoto    = fields.atendimento_remoto    === "1";
        instrucoesChegada = fields.instrucoes_chegada;

        if (data.filename && data.mimetype) {
          if (!ALLOWED_MIMES.includes(data.mimetype)) {
            throw new Error("Formato de imagem não suportado. Use JPG, PNG, WebP ou GIF.");
          }

          const ext = path.extname(data.filename).toLowerCase() || ".jpg";
          const filename = `ong_${userId}_${Date.now()}${ext}`;

          if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
          const tempFilePath = path.join(TEMP_DIR, filename);

          const writeStream = fs.createWriteStream(tempFilePath);
          await pipeline(data.file, writeStream);

          const stats = fs.statSync(tempFilePath);
          if (stats.size > MAX_FILE_SIZE) {
            fs.unlinkSync(tempFilePath);
            throw new Error("Imagem muito grande. O tamanho máximo é 2MB.");
          }

          const realMime = detectMimeFromFile(tempFilePath);
          if (!realMime || !ALLOWED_MIMES.includes(realMime)) {
            fs.unlinkSync(tempFilePath);
            throw new Error("Formato de arquivo inválido. O conteúdo não corresponde a uma imagem suportada.");
          }

          if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

          const modResult = await processarUploadComModeracao({
            tempPath: tempFilePath,
            publicDir: UPLOADS_DIR,
            publicUrlBase: "/public/uploads/logos",
            filename,
            mimeType: realMime,
            tipo: "logo_ong",
            referenciaId: userId,
          });

          if (!modResult.ok) {
            throw new Error(modResult.rejeitado ? modResult.motivo : modResult.erro);
          }

          logoPath = modResult.publicUrl;
        }
      } else {
        const body = request.body as any;
        nome = body.nome;
        email = body.email;
        telefone = body.telefone;
        password = body.password;
        area_atuacao = body.area_atuacao;
        cnpj = body.cnpj;
        cep = body.cep;
        logradouro = body.logradouro;
        numero = body.numero;
        complemento = body.complemento;
        bairro = body.bairro;
        cidade = body.cidade;
        estado = body.estado;
        localizacaoPublica   = body.localizacao_publica   === "1";
        localizacaoAproximada = body.localizacao_aproximada === "1";
        atendimentoRemoto    = body.atendimento_remoto    === "1";
        instrucoesChegada = body.instrucoes_chegada;
      }
    } else {
      // Usuário usa form normal (sem arquivo)
      const body = request.body as any;
      nome = body.nome;
      email = body.email;
      telefone = body.telefone;
      password = body.password;
      cpf = body.cpf;
    }

    const result = isOng
      ? await perfilService.updateOngProfile({
          ongId: userId,
          nome,
          email,
          telefone,
          areaAtuacao: area_atuacao,
          cnpj,
          password,
          cep,
          logradouro,
          numero,
          complemento,
          bairro,
          cidade,
          estado,
          localizacaoPublica,
          localizacaoAproximada,
          atendimentoRemoto,
          instrucoesChegada,
        })
      : await perfilService.updateProfile({
          userId,
          nome,
          email,
          telefone,
          cpf,
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
        documentoPendingNotice: false,
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

    return reply.redirect(`/perfil/editar?success=1${result.documentoSolicitacaoCriada ? "&documento=pendente" : ""}`);
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
      documentoPendingNotice: false,
    }, { layout: getLayout(session.tipo) });
  }
}
