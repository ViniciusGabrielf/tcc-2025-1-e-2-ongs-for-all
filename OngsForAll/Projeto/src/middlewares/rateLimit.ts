import { FastifyReply, FastifyRequest } from "fastify";

type RateLimitOptions = {
  windowMs: number;
  maxAttempts: number;
  keyPrefix: string;
  message?: string;
};

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitBucket>();

function getBodyIdentity(request: FastifyRequest): string {
  const body = request.body as { email?: string } | undefined;
  return (body?.email ?? "").toString().trim().toLowerCase();
}

export function createRateLimit(options: RateLimitOptions) {
  return async function rateLimit(request: FastifyRequest, reply: FastifyReply) {
    const now = Date.now();
    const identity = getBodyIdentity(request);
    const key = `${options.keyPrefix}:${request.ip}:${identity}`;
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return;
    }

    current.count += 1;

    if (current.count > options.maxAttempts) {
      return reply.status(429).send({
        message: options.message ?? "Muitas tentativas. Tente novamente em alguns minutos.",
      });
    }
  };
}
