import bcrypt from "bcryptjs";
import * as empresaRepo from "../../src/repositories/empresaRepository";
import * as empresaService from "../../src/services/empresaService";

jest.mock("../../src/repositories/empresaRepository", () => ({
  createEmpresa: jest.fn(),
  upsertEmpresaCnpjControle: jest.fn(),
  findEmpresaById: jest.fn(),
  findEmpresaCnpjControle: jest.fn(),
  findEmpresaByNormalizedCnpjExcludingId: jest.fn(),
  findEmpresaByPendingNormalizedCnpjExcludingId: jest.fn(),
  updateEmpresaPerfil: jest.fn(),
}));

jest.mock("../../src/repositories/marketplaceRepository", () => ({}));

describe("empresaService", () => {
  const createEmpresaMock = empresaRepo.createEmpresa as jest.Mock;
  const upsertEmpresaCnpjControleMock = empresaRepo.upsertEmpresaCnpjControle as jest.Mock;
  const findEmpresaByIdMock = empresaRepo.findEmpresaById as jest.Mock;
  const findEmpresaCnpjControleMock = empresaRepo.findEmpresaCnpjControle as jest.Mock;
  const findEmpresaByNormalizedCnpjExcludingIdMock = empresaRepo.findEmpresaByNormalizedCnpjExcludingId as jest.Mock;
  const findEmpresaByPendingNormalizedCnpjExcludingIdMock =
    empresaRepo.findEmpresaByPendingNormalizedCnpjExcludingId as jest.Mock;
  const updateEmpresaPerfilMock = empresaRepo.updateEmpresaPerfil as jest.Mock;
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    (bcrypt.hash as any) = jest.fn().mockResolvedValue("hashed-password");
    createEmpresaMock.mockResolvedValue(1);
    upsertEmpresaCnpjControleMock.mockResolvedValue(undefined);
    findEmpresaByNormalizedCnpjExcludingIdMock.mockResolvedValue(null);
    findEmpresaByPendingNormalizedCnpjExcludingIdMock.mockResolvedValue(null);
    updateEmpresaPerfilMock.mockResolvedValue(undefined);
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe("cadastrarEmpresa", () => {
    it("permite cadastro com CNPJ invalido e marca a empresa com restricao", async () => {
      const result = await empresaService.cadastrarEmpresa({
        nome_fantasia: "Empresa Teste",
        razao_social: "",
        email: "empresa@test.com",
        cnpj: "11.111.111/1111-11",
        telefone: "11999999999",
        descricao: "",
        setor: "",
        senha: "123456",
      });

      expect(result).toEqual({ ok: true });
      expect(createEmpresaMock).toHaveBeenCalledWith(
        expect.objectContaining({
          cnpj: "11.111.111/1111-11",
          email: "empresa@test.com",
        })
      );
      expect(upsertEmpresaCnpjControleMock).toHaveBeenCalledWith({
        empresaId: 1,
        statusAtual: "invalido",
        cnpjPendente: null,
        statusSolicitacao: null,
        observacaoAdmin: null,
      });
    });

    it("mantem a razao social oficial e status validado quando o CNPJ passa na consulta", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          razao_social: "EMPRESA TESTE LTDA",
          estabelecimento: {
            nome_fantasia: "Empresa Teste",
            situacao_cadastral: "ATIVA",
          },
        }),
      } as any);

      const result = await empresaService.cadastrarEmpresa({
        nome_fantasia: "Empresa Teste",
        razao_social: "",
        email: "EMPRESA@TEST.COM",
        cnpj: "27.865.757/0001-02",
        telefone: "11999999999",
        descricao: "",
        setor: "",
        senha: "123456",
      });

      expect(result).toEqual({ ok: true });
      expect(createEmpresaMock).toHaveBeenCalledWith(
        expect.objectContaining({
          razao_social: "EMPRESA TESTE LTDA",
          email: "empresa@test.com",
          cnpj: "27.865.757/0001-02",
          senhaHash: "hashed-password",
        })
      );
      expect(upsertEmpresaCnpjControleMock).toHaveBeenCalledWith({
        empresaId: 1,
        statusAtual: "validado",
        cnpjPendente: null,
        statusSolicitacao: null,
        observacaoAdmin: null,
      });
    });
  });

  describe("atualizarPerfilEmpresa", () => {
    it("altera o email imediatamente e cria solicitacao pendente para um novo CNPJ valido", async () => {
      findEmpresaByIdMock.mockResolvedValue({
        id: 1,
        nome_fantasia: "Empresa Teste",
        razao_social: "Empresa Teste LTDA",
        email: "antigo@test.com",
        cnpj: "11.111.111/1111-11",
      });
      findEmpresaCnpjControleMock.mockResolvedValue({
        empresa_id: 1,
        status_atual: "invalido",
        cnpj_pendente: null,
        status_solicitacao: null,
        observacao_admin: null,
      });
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          razao_social: "EMPRESA TESTE LTDA",
          estabelecimento: {
            situacao_cadastral: "ATIVA",
          },
        }),
      } as any);

      const result = await empresaService.atualizarPerfilEmpresa(1, {
        nome_fantasia: "Empresa Teste",
        razao_social: "Empresa Teste LTDA",
        email: "novo@test.com",
        cnpj: "27.865.757/0001-02",
        telefone: "11999999999",
        descricao: "descricao",
        setor: "Tecnologia",
      });

      expect(result).toEqual({ ok: true, cnpjSolicitacaoCriada: true });
      expect(updateEmpresaPerfilMock).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          email: "novo@test.com",
        })
      );
      expect(upsertEmpresaCnpjControleMock).toHaveBeenCalledWith({
        empresaId: 1,
        statusAtual: "invalido",
        cnpjPendente: "27.865.757/0001-02",
        statusSolicitacao: "pendente",
        observacaoAdmin: null,
      });
    });
  });
});
