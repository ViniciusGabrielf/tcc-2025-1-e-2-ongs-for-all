import mysql from "mysql2/promise";

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const pool = mysql.createPool({
  host: mustEnv("MYSQL_HOST"),
  port: Number(process.env.MYSQL_PORT ?? "3306"),
  user: mustEnv("MYSQL_USER"),
  password: mustEnv("MYSQL_PASSWORD"),
  database: mustEnv("MYSQL_DATABASE"),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});