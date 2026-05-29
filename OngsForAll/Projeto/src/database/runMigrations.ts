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

const NOTIFICACAO_REFERENCIA_COLS: ColDef[] = [
  ["referencia_tipo", "VARCHAR(50) NULL"],
  ["referencia_id",   "INT NULL"],
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

async function migration002CreateApoiadores(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS apoiadores_institucionais (
      id            INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
      nome          VARCHAR(150) NOT NULL,
      logo_url      VARCHAR(500) NULL,
      website_url   VARCHAR(500) NULL,
      descricao     VARCHAR(200) NULL,
      plano         ENUM('basico','local','destaque','institucional') NOT NULL DEFAULT 'basico',
      valor_mensal  DECIMAL(10,2) NOT NULL DEFAULT 19.90,
      prioridade    TINYINT      NOT NULL DEFAULT 1,
      status        ENUM('ativo','pausado','encerrado') NOT NULL DEFAULT 'pausado',
      data_inicio   DATE         NOT NULL,
      data_fim      DATE         NULL,
      criado_por    INT          NULL,
      criado_em     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function migration003CreateOngReviews(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ong_reviews (
      id         INT         NOT NULL AUTO_INCREMENT PRIMARY KEY,
      ong_id     INT         NOT NULL,
      user_id    INT         NOT NULL,
      user_tipo  VARCHAR(20) NOT NULL,
      rating     TINYINT     NOT NULL,
      comment    TEXT        NULL,
      created_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_ong_user (ong_id, user_id, user_tipo),
      KEY idx_ong_id (ong_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function migration004AddReferenciaNotificacao(): Promise<void> {
  for (const [column, definition] of NOTIFICACAO_REFERENCIA_COLS) {
    const exists = await columnExists("notificacoes", column);
    if (!exists) {
      await pool.query(`ALTER TABLE notificacoes ADD COLUMN \`${column}\` ${definition}`);
      console.log(`[migration] notificacoes.${column} adicionado.`);
    }
  }

  await pool.query(`
    UPDATE notificacoes nt
    SET
      nt.referencia_tipo = 'interesse',
      nt.referencia_id = (
        SELECT i.id
        FROM interesses_doacao i
        INNER JOIN usuarios u ON u.id = i.usuario_id
        INNER JOIN necessidades n ON n.id = i.necessidade_id
        WHERE i.ong_id = nt.ong_id
          AND nt.mensagem = CONCAT(u.nome, ' demonstrou interesse em ajudar a necessidade "', n.titulo, '".')
        ORDER BY ABS(TIMESTAMPDIFF(SECOND, nt.criado_em, i.criado_em)) ASC, i.id DESC
        LIMIT 1
      )
    WHERE nt.tipo = 'novo_interesse'
      AND nt.referencia_id IS NULL
  `);

  await pool.query(`
    UPDATE notificacoes
    SET referencia_tipo = NULL
    WHERE tipo = 'novo_interesse'
      AND referencia_tipo = 'interesse'
      AND referencia_id IS NULL
  `);
}

export async function runMigrations(): Promise<void> {
  try {
    await migration001AddLocalizacaoOng();
    await migration002CreateApoiadores();
    await migration003CreateOngReviews();
    await migration004AddReferenciaNotificacao();
  } catch (err) {
    console.error("[migration] Erro ao executar migrations:", err);
  }
}
