// tests/perfilController.test.ts
import { formataNome } from '../../src/controllers/perfilController';

describe('formataNome', () => {
  it('deve formatar corretamente um nome simples', () => {
    const nome = ' vinicius gabriel ';
    const resultado = formataNome(nome);
    expect(resultado).toBe('Vinicius Gabriel');
  });

  it('deve lidar com múltiplos espaços', () => {
    const nome = 'ana     maria   silva';
    const resultado = formataNome(nome);
    expect(resultado).toBe('Ana Maria Silva');
  });

  it('deve retornar string vazia se receber string vazia', () => {
    const resultado = formataNome('');
    expect(resultado).toBe('');
  });
});