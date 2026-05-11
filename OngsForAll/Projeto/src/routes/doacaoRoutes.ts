import { FastifyInstance } from "fastify";
import { ensureAuthenticated } from "../middlewares/ensureAuthenticated";
import { ensureUser } from "../middlewares/ensureUser";

export async function doacaoRoutes(fastify: FastifyInstance) {
  const redirecionarFluxoLegado = async (_request: any, reply: any) => {
    return reply.redirect("/necessidades");
  };

  fastify.get(
    "/doacoes/nova",
    { preHandler: [ensureAuthenticated, ensureUser] },
    redirecionarFluxoLegado
  );

  fastify.post(
    "/doacoes",
    { preHandler: [ensureAuthenticated, ensureUser] },
    redirecionarFluxoLegado
  );

  fastify.get(
    "/doacoes",
    { preHandler: [ensureAuthenticated, ensureUser] },
    redirecionarFluxoLegado
  );
}
