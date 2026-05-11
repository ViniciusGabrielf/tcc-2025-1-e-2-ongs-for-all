import { FastifyInstance } from 'fastify'
import { authRoutes } from './authRoutes'
import { homeRoutes } from './homeRoutes'
import { dashboardRoutes } from './dashboardRoutes'
import { perfilRoutes } from './perfilRoutes'
import { doacaoRoutes } from './doacaoRoutes'
import { necessidadeRoutes } from "./necessidadeRoutes";
import { interesseDoacaoRoutes } from "./interesseDoacaoRoutes";
import { notificacaoRoutes } from "./notificacaoRoutes";
import { ongRoutes } from "./ongRoutes";
import { evidenciaRoutes } from "./evidenciaRoutes";
import { relatorioRoutes } from "./relatorioRoutes";
import { adminRoutes } from "./adminRoutes";
import { ongDocumentoRoutes } from "./ongDocumentoRoutes";
import { mensagemRoutes } from "./mensagemRoutes";
import { empresaRoutes } from "./empresaRoutes";
import { marketplaceRoutes } from "./marketplaceRoutes";

export async function registerAllRoutes(fastify: FastifyInstance) {
  await authRoutes(fastify)
  await homeRoutes(fastify)
  await dashboardRoutes(fastify)
  await perfilRoutes(fastify)
  await doacaoRoutes(fastify)
  await necessidadeRoutes(fastify);
  await interesseDoacaoRoutes(fastify);
  await notificacaoRoutes(fastify);
  await ongRoutes(fastify);
  await evidenciaRoutes(fastify);
  await relatorioRoutes(fastify);
  await adminRoutes(fastify);
  await ongDocumentoRoutes(fastify);
  await mensagemRoutes(fastify);
  await empresaRoutes(fastify);
  await marketplaceRoutes(fastify);
}
