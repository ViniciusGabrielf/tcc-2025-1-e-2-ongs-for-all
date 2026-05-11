import { pool, testarConexao } from '../../src/config/ds'; // <-- Ajuste o caminho para o seu ds.ts
import { Pool } from 'mysql2/promise';

describe('Database Connection (ds.ts)', () => {
  afterAll(async () => {
    await pool.end();
  });

  it('should create the pool object correctly', () => {
    expect(pool).toBeDefined();

    expect(pool.query).toBeInstanceOf(Function);
  });

  it('should successfully connect to the database and run a simple query', async () => {
    await expect(pool.query('SELECT 1 AS testValue')).resolves.not.toThrow();

    const [rows] = await pool.query('SELECT 1 AS testValue');

    expect(rows).toBeInstanceOf(Array);

    expect((rows as any[]).length).toBeGreaterThan(0);

    expect((rows as any)[0].testValue).toBe(1);
  });

  it('testarConexao function should run without throwing an error', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(testarConexao()).resolves.not.toThrow();

    expect(logSpy).toHaveBeenCalled();

    expect(errorSpy).not.toHaveBeenCalled();

    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should handle invalid queries gracefully (throw an error)', async () => {
    await expect(pool.query('SELECT * FROM tabela_que_nao_existe_12345')).rejects.toThrow();
  });

});