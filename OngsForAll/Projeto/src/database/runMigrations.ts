import { pool } from "../config/ds";

type ColDef = [
  column: string,
  definition: string,
];

const ONG_LOCALIZACAO_COLS: ColDef[] = [
  ["cep",                   "VARCHAR(20)  NULL"],
  ["logradouro",            "VARCHAR(255) NULL"],
  ["numero",                "VARCHAR(30)  NULL"],
  ["complemento",           "VARCHAR(100) NULL"],
  ["bairro",                "VARCHAR(100) NULL"],
  ["cidade",                "VARCHAR(100) NULL"],
  ["estado",                "VARCHAR(2)   NULL"],
  ["latitude",              "DECIMAL(10,8) NULL"],
  ["longitude",             "DECIMAL(11,8) NULL"],
  ["localizacao_publica",   "TINYINT(1) NOT NULL DEFAULT 0"],
  ["localizacao_aproximada","TINYINT(1) NOT NULL DEFAULT 0"],
  ["atendimento_remoto",    "TINYINT(1) NOT NULL DEFAULT 0"],
  ["instrucoes_chegada",    "TEXT NULL"],
];

async function columnExists(table: string, column: string): Promise<boolean> {
  const [rows]: any = await pool.query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = ?
       AND COLUMN_NAME  = ?`,
    [table, column]
  );
  return Number(rows?.[0]?.cnt ?? 0) > 0;
}

async function migration001AddLocalizacaoOng(): Promise<void> {
  for (const [column, definition] of ONG_LOCALIZACAO_COLS) {
    const exists = await columnExists("ongs", column);
    if (!exists) {
      await pool.query(`ALTER TABLE ongs ADD COLUMN \`${column}\` ${definition}`);
      console.log(`[migration] ongs.${column} adicionado.`);
    }
  }
}

export async function runMigrations(): Promise<void> {
  try {
    await migration001AddLocalizacaoOng();
  } catch (err) {
    console.error("[migration] Erro ao executar migrations:", err);
  }
}
