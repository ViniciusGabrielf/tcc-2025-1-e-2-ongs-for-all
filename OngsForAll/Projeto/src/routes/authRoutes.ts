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
} from '../controllers/authController'

export async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/login', renderAuthLoginPage)

  fastify.get('/register', renderAuthRegisterPage)
  fastify.post('/register-user', registerUser)
  fastify.post('/register-ong', registerONG)

  fastify.post('/login', loginUser)
  fastify.get('/logout', logoutUser)

  fastify.get('/esqueci-minha-senha', renderForgotPasswordPage)
  fastify.post('/esqueci-minha-senha', handleForgotPassword)
  fastify.get("/redefinir-senha", renderResetPasswordPage);
  fastify.post("/redefinir-senha", handleResetPassword);
}
