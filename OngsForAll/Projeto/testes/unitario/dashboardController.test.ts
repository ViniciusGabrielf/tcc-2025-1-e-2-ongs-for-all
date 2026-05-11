import {
  renderDashBoardPage,
  totalDoacoesPorOng,
} from '../../src/controllers/dashboardController';

let mockQuery: jest.Mock<any, any>;

jest.mock('../../src/config/ds', () => ({
  pool: {
    query: (...args: any[]) => mockQuery(...args),
  },
}));

describe('renderDashBoardPage', () => {
  const mockReply = {
    redirect: jest.fn(),
    view: jest.fn(),
  } as any;

  beforeEach(() => {
    process.env.NODE_ENV = 'development'; // ✅ simula ambiente de produção
    mockQuery = jest.fn();
    mockReply.redirect.mockReset();
    mockReply.view.mockReset();
  });

  it('deve redirecionar para login se não houver usuário na sessão', async () => {
    const mockRequest = { session: {} } as any;

    await renderDashBoardPage(mockRequest, mockReply);

    expect(mockReply.redirect).toHaveBeenCalledWith('/login');
  });

  it('deve consultar dados e renderizar o dashboard', async () => {
    const mockRequest = {
      session: {
        user: { id: 1, nome: 'João' },
      },
    } as any;

    // ✅ simula retorno do banco (2 queries)
    mockQuery
      .mockResolvedValueOnce([
        [
          { mes: 1, total: '100.00' },
          { mes: 2, total: '150.00' },
        ],
      ])
      .mockResolvedValueOnce([
        [
          { tipo: 'Educação', total: '120.00' },
          { tipo: 'Saúde', total: '130.00' },
        ],
      ]);

    await renderDashBoardPage(mockRequest, mockReply);

    expect(mockQuery).toHaveBeenCalledTimes(2);
    expect(mockReply.view).toHaveBeenCalledWith(
      'templates/dashboard.hbs',
      {
        user: mockRequest.session.user,
        labelsMes: JSON.stringify(['Jan', 'Fev']),
        valoresMes: JSON.stringify([100.0, 150.0]),
        labelsTipo: JSON.stringify(['Educação', 'Saúde']),
        valoresTipo: JSON.stringify([120.0, 130.0]),
      },
      { layout: 'layouts/dashboardLayout' }
    );
  });
});

describe('totalDoacoesPorOng', () => {
  const mockReply = {
    view: jest.fn(),
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  } as any;

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    mockQuery = jest.fn();
    mockReply.view.mockReset();
    mockReply.status.mockClear();
    mockReply.send.mockClear();
  });

  it('deve renderizar total de doações por ONG', async () => {
    const mockRequest = {} as any;

    mockQuery.mockResolvedValueOnce([
      [
        { nome: 'ONG A', total: 200.0 },
        { nome: 'ONG B', total: 100.0 },
      ],
    ]);

    await totalDoacoesPorOng(mockRequest, mockReply);

    expect(mockReply.view).toHaveBeenCalledWith(
      'templates/totalPorOng.hbs',
      {
        dados: [
          { nome: 'ONG A', total: 200.0 },
          { nome: 'ONG B', total: 100.0 },
        ],
      },
      { layout: 'layouts/dashboardLayout' }
    );
  });

  it('deve retornar erro 500 se a consulta falhar', async () => {
    const mockRequest = {} as any;

    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    await totalDoacoesPorOng(mockRequest, mockReply);

    expect(mockReply.status).toHaveBeenCalledWith(500);
    expect(mockReply.send).toHaveBeenCalledWith('Erro ao buscar totais das ONGs');
  });
});
