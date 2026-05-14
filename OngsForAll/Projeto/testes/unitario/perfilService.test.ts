jest.mock("../../src/repositories/perfilRepository", () => ({}));
jest.mock("../../src/services/notificacaoService", () => ({}));

import { formatCpf, formatCnpj } from "../../src/services/perfilService";

describe("perfilService formatadores", () => {
  it("deve formatar CPF com 11 digitos", () => {
    expect(formatCpf("98765432100")).toBe("987.654.321-00");
  });

  it("deve formatar CNPJ com 14 digitos", () => {
    expect(formatCnpj("98765432100000")).toBe("98.765.432/1000-00");
  });

  it("deve manter CPF e CNPJ invalidos como foram recebidos", () => {
    expect(formatCpf("123")).toBe("123");
    expect(formatCnpj("123")).toBe("123");
  });
});
