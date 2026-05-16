import "dotenv/config";
import fastify from "fastify";
import formBody from "@fastify/formbody";
import multipart from "@fastify/multipart";
import initViewEngine from "./config/view";
import fastifyStatic from "@fastify/static";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import path from "path";

import { registerAllRoutes } from "./routes/allRoutes";

const host = process.env.NODE_APP_HOST || "localhost";
const port = Number(process.env.PORT || 3000);
const isProd = process.env.NODE_ENV === "production";

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret || sessionSecret.length < 32) {
  throw new Error("SESSION_SECRET must be set and have at least 32 chars");
}

const server = fastify({
  logger: { level: "warn" },
  trustProxy: isProd,
});


server.register(formBody);
server.register(multipart, {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB — validação fina feita em cada controller
  },
});

server.register(fastifyCookie);
server.register(fastifySession, {
  secret: sessionSecret,
  cookie: {
    secure: isProd,      // true em produção, false local
    httpOnly: true,      // evita JS acessar cookie (mais seguro)
    sameSite: "lax",     // protege contra CSRF básico
    maxAge: 1000 * 60 * 60 * 24, // 1 dia
    path: "/",
  },
  saveUninitialized: false,
});

server.register(fastifyStatic, {
  root: path.join(__dirname, "..", "public"),
  prefix: "/public/",
});

initViewEngine(server);
registerAllRoutes(server);

// (Opcional) Handler global pra você ver erro real ao invés de "Erro no servidor"
server.setErrorHandler((error: any, request, reply) => {
  request.log.error({ err: error }, "Erro interno no servidor");

  const payload: Record<string, string> = {
    message: "Erro no servidor",
  };

  if (!isProd) {
    payload.error = error.message;
  }

  reply.status(500).send(payload);
});

server.listen({ port, host }, (err) => {
  if (err) {
    console.error("[ERRO] Falha ao iniciar servidor:", err);
    process.exit(1);
  }
  console.log(`\n🟢 Servidor rodando em: http://${host}:${port}\n`);
});
