import { pool } from "../config/ds";

export type LocalizacaoDados = {
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  localizacaoPublica?: boolean;
  localizacaoAproximada?: boolean;
  atendimentoRemoto?: boolean;
  instrucoesChegada?: string | null;
};

export async function findLocalizacaoByOngId(ongId: number) {
  const [rows]: any = await pool.query(
    `SELECT cep, logradouro, numero, complemento, bairro, cidade, estado,
            latitude, longitude,
            localizacao_publica, localizacao_aproximada, atendimento_remoto,
            instrucoes_chegada
     FROM ongs
     WHERE ong_id = ?
     LIMIT 1`,
    [ongId]
  );
  return rows?.[0] ?? null;
}

export async function findLocalizacaoPublicaByOngId(ongId: number) {
  const [rows]: any = await pool.query(
    `SELECT ong_id AS id, nome,
            cep, logradouro, numero, complemento, bairro, cidade, estado,
            latitude, longitude,
            localizacao_publica, localizacao_aproximada, atendimento_remoto,
            instrucoes_chegada
     FROM ongs
     WHERE ong_id = ?
       AND status_aprovacao = 'aprovada'
     LIMIT 1`,
    [ongId]
  );
  return rows?.[0] ?? null;
}

export async function updateLocalizacao(ongId: number, dados: LocalizacaoDados) {
  await pool.query(
    `UPDATE ongs SET
       cep                   = ?,
       logradouro            = ?,
       numero                = ?,
       complemento           = ?,
       bairro                = ?,
       cidade                = ?,
       estado                = ?,
       latitude              = ?,
       longitude             = ?,
       localizacao_publica   = ?,
       localizacao_aproximada = ?,
       atendimento_remoto    = ?,
       instrucoes_chegada    = ?
     WHERE ong_id = ?`,
    [
      dados.cep              ?? null,
      dados.logradouro       ?? null,
      dados.numero           ?? null,
      dados.complemento      ?? null,
      dados.bairro           ?? null,
      dados.cidade           ?? null,
      dados.estado           ?? null,
      dados.latitude         ?? null,
      dados.longitude        ?? null,
      dados.localizacaoPublica   ? 1 : 0,
      dados.localizacaoAproximada ? 1 : 0,
      dados.atendimentoRemoto    ? 1 : 0,
      dados.instrucoesChegada ?? null,
      ongId,
    ]
  );
}
