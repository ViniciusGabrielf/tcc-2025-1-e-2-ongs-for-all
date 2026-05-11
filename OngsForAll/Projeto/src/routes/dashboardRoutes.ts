import { FastifyInstance } from "fastify";

import { ensureUser } from "../middlewares/ensureUser";
import { ensureOng } from "../middlewares/ensureOng";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";

import {
  renderDashBoardPage,
  renderDashboardOngPage,
  totalDoacoesPorOng,
  renderConquistasPage,
} from "../controllers/dashboardController";

export async function dashboardRoutes(fastify: FastifyInstance) {

  // Dashboard do usuário
  fastify.get(
    "/dashboard",
    { preHandler: [ensureAuthenticated, ensureUser] },
    renderDashBoardPage
  );

  // Dashboard da ONG
  fastify.get(
    "/dashboard/ong",
    { preHandler: [ensureAuthenticated, ensureOng] },
    renderDashboardOngPage
  );

  // Total por ONG (somente ONG deveria acessar)
  fastify.get(
    "/dashboard/total-por-ong",
    { preHandler: [ensureAuthenticated, ensureOng] },
    totalDoacoesPorOng
  );

  // Conquistas / gamificação
  fastify.get(
    "/conquistas",
    { preHandler: [ensureAuthenticated, ensureUser] },
    renderConquistasPage
  );
}