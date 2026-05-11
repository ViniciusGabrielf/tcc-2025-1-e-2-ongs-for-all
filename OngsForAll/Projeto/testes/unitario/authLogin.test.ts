import { loginUser, handleResetPassword } from '../../src/controllers/authController';

// ✅ Mocks globais (com inicialização!)
let mockQuery: jest.Mock = jest.fn();
let mockCompare: jest.Mock = jest.fn();
let mockHash: jest.Mock = jest.fn();
let mockSend: jest.Mock = jest.fn(); // ✅ Adicione isso aqui

// ✅ Mock do bcryptjs
jest.mock('bcryptjs', () => ({
  compare: (...args: any[]) => mockCompare(...args),
  hash: (...args: any[]) => mockHash(...args),
}));

// ✅ Mock do pool
jest.mock('../../src/config/ds', () => ({
  pool: {
    execute: (...args: any[]) => mockQuery(...args),
    query: (...args: any[]) => mockQuery(...args),
  },
}));

describe('loginUser', () => {
  const mockReply = {
    redirect: jest.fn(),
    view: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  } as any;

  beforeEach(() => {
    process.env.NODE_ENV = 'development'; // ← SOLUÇÃO APLICADA AQUI
    mockQuery.mockReset();
    mockCompare.mockReset();
    mockHash.mockReset();
    mockReply.redirect.mockReset();
    mockReply.view.mockReset();
    mockReply.status.mockReset();
    mockReply.send.mockReset();
  });

  it('deve realizar login com sucesso', async () => {
    const user = { id: 1, nome: 'João', email: 'joao@email.com', senha: 'hashed' };
    const request = {
      body: { email: 'joao@email.com', password: '123456' },
      ip: '127.0.0.1',
      session: {},
    } as any;

    mockQuery
      .mockResolvedValueOnce([[user]])
      .mockResolvedValueOnce(undefined);
    mockCompare.mockResolvedValue(true);

    await loginUser(request, mockReply);

    expect(mockCompare).toHaveBeenCalled();
    expect(mockReply.redirect).toHaveBeenCalledWith('/dashboard');
    expect(request.session.user).toEqual({
      id: 1,
      nome: 'João',
      email: 'joao@email.com',
    });
  });

  it('deve exibir erro se a senha estiver incorreta', async () => {
    const user = { id: 1, nome: 'João', senha: 'hashed' };
    const request = {
      body: { email: 'joao@email.com', password: 'errada' },
      ip: '127.0.0.1',
      session: {},
    } as any;

    mockQuery
      .mockResolvedValueOnce([[user]])
      .mockResolvedValueOnce(undefined);
    mockCompare.mockResolvedValue(false);

    await loginUser(request, mockReply);

    expect(mockReply.view).toHaveBeenCalledWith(
      '/templates/auth/login.hbs',
      { error: 'E-mail ou senha incorretos' },
      { layout: 'layouts/authLayout' }
    );
  });

  it('deve exibir erro se usuário não existir', async () => {
    const request = {
      body: { email: 'nao@existe.com', password: '123456' },
      ip: '127.0.0.1',
      session: {},
    } as any;

    mockQuery
      .mockResolvedValueOnce([[]])
      .mockResolvedValueOnce(undefined);

    await loginUser(request, mockReply);

    expect(mockReply.view).toHaveBeenCalledWith(
      '/templates/auth/login.hbs',
      { error: 'E-mail ou senha incorretos' },
      { layout: 'layouts/authLayout' }
    );
  });
});

jest.mock('bcryptjs', () => ({
  compare: (...args: any[]) => mockCompare(...args),
  hash: (...args: any[]) => mockHash(...args),
}));

// ✅ Mock do pool
jest.mock('../../src/config/ds', () => ({
  pool: {
    execute: (...args: any[]) => mockQuery(...args),
    query: (...args: any[]) => mockQuery(...args),
  },
}));

describe('handleResetPassword', () => {
  const mockReply = {
  redirect: jest.fn(),
  status: jest.fn(() => ({ send: mockSend })), // <- usa mockSend
  send: mockSend, // <- garante fallback se chamado diretamente
} as any;

  beforeEach(() => {
    mockQuery.mockReset();
    mockHash.mockReset();
    mockReply.redirect.mockReset();
    mockReply.status.mockClear();
    mockSend.mockReset();
  });

  it('deve atualizar a senha com sucesso', async () => {
    const request = {
      params: { id: '1' },
      body: { password: 'novaSenhaSegura' },
    } as any;

    mockHash.mockResolvedValue('hashed-password');
    mockQuery.mockResolvedValue(undefined);

    await handleResetPassword(request, mockReply);

    expect(mockHash).toHaveBeenCalledWith('novaSenhaSegura', 10);
    expect(mockQuery).toHaveBeenCalledWith(
      'UPDATE usuarios SET senha = ? WHERE id = ?',
      ['hashed-password', '1']
    );
    expect(mockReply.redirect).toHaveBeenCalledWith('/login');
  });

  it('deve retornar erro se senha for curta', async () => {
    const request = {
      params: { id: '1' },
      body: { password: '123' },
    } as any;

    await handleResetPassword(request, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(400);
    expect(mockSend).toHaveBeenCalledWith({
      error: 'A senha deve ter no mínimo 6 caracteres.',
    });
  });
});
