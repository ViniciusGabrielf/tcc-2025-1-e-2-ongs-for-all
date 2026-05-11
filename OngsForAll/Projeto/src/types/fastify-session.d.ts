// src/types/fastify-session.d.ts
import '@fastify/session'

declare module "fastify" {
  interface Session {
    user?: {
      id: number;
      nome: string;
      email: string;
      tipo: "usuario" | "ong" | "empresa";
      ong_id?: number; // opcional
      logo?: string; // opcional (empresa)
    };
  }

  interface FastifyRequest {
    session: Session
  }
}
