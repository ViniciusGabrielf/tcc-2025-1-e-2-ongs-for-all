import { FastifyInstance } from 'fastify'
import {
  registerONG,
  registerUser,
  renderAuthLoginPage,
  renderAuthRegisterPage,
  loginUser,
  logoutUser,
  renderForgotPasswordPage,
  handleForgotPassword,
  renderResetPasswordPage,
  handleResetPassword,
  renderVerificarEmailPage,
  handleVerificarEmail,
  handleReenviarVerificacao,
  handleAlterarEmailVerificacao,
} from '../controllers/authController'
import { createRateLimit } from '../middlewares/rateLimit'

const loginRateLimit = createRateLimit({
  keyPrefix: 'login',
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000,
})

const passwordResetRateLimit = createRateLimit({
  keyPrefix: 'password-reset',
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
})

export async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/login', renderAuthLoginPage)

  fastify.get('/register', renderAuthRegisterPage)
  fastify.post('/register-user', registerUser)
  fastify.post('/register-ong', registerONG)

  fastify.post('/login', { preHandler: loginRateLimit }, loginUser)
  fastify.post('/logout', logoutUser)

  fastify.get('/esqueci-minha-senha', renderForgotPasswordPage)
  fastify.post('/esqueci-minha-senha', { preHandler: passwordResetRateLimit }, handleForgotPassword)
  fastify.get("/redefinir-senha", renderResetPasswordPage);
  fastify.post("/redefinir-senha", { preHandler: passwordResetRateLimit }, handleResetPassword);

  fastify.get("/verificar-email", renderVerificarEmailPage);
  fastify.post("/verificar-email", handleVerificarEmail);
  fastify.post("/reenviar-verificacao", handleReenviarVerificacao);
  fastify.post("/alterar-email-verificacao", handleAlterarEmailVerificacao);
}
