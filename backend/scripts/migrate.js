/**
 * Roda migrações SQL sem precisar do psql (Windows-friendly).
 * Uso: na pasta backend → npm run db:migrate
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "../src/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sqlDir = path.join(__dirname, "..", "sql");

async function tableExists(name) {
  const { rows } = await pool.query(
    `select 1 from information_schema.tables where table_schema = 'public' and table_name = $1`,
    [name]
  );
  return rows.length > 0;
}

async function columnExists(table, column) {
  const { rows } = await pool.query(
    `
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = $1 and column_name = $2
    `,
    [table, column]
  );
  return rows.length > 0;
}

async function runSqlFile(relativePath) {
  const fullPath = path.join(sqlDir, relativePath);
  const sql = fs.readFileSync(fullPath, "utf8");
  console.log(`[db:migrate] executando ${relativePath}...`);
  await pool.query(sql);
  console.log(`[db:migrate] ok: ${relativePath}`);
}

async function migrateStatusBasicoOuro() {
  const hasUsers = await tableExists("users");
  if (!hasUsers) {
    await runSqlFile("schema.sql");
    console.log("[db:migrate] banco criado com schema atual (status BASICO/OURO).");
    return;
  }

  const hasStatus = await columnExists("users", "status");
  const hasPlan = await columnExists("users", "plan");
  const hasIsGold = await columnExists("users", "is_gold");

  if (hasStatus && !hasPlan && !hasIsGold) {
    console.log("[db:migrate] migração 003 já aplicada — nada a fazer.");
    return;
  }

  if (!hasStatus) {
    await pool.query(`alter table users add column if not exists status text`);
  }

  if (hasPlan || hasIsGold) {
    await pool.query(`
      update users
      set status = case
        when is_gold = true or lower(coalesce(plan, '')) in ('gold', 'ouro') then 'OURO'
        else 'BASICO'
      end
      where status is null or status not in ('BASICO', 'OURO')
    `);
  } else {
    await pool.query(`update users set status = 'BASICO' where status is null`);
  }

  await pool.query(`
    alter table users alter column status set default 'BASICO';
    alter table users alter column status set not null;
  `);

  await pool.query(`
    alter table users drop constraint if exists users_status_check;
    alter table users add constraint users_status_check check (status in ('BASICO', 'OURO'));
  `);

  await pool.query(`alter table users drop column if exists plan`);
  await pool.query(`alter table users drop column if exists is_gold`);

  if (await tableExists("subscriptions")) {
    await pool.query(`alter table subscriptions drop constraint if exists subscriptions_plan_check`);
    await pool.query(`
      update subscriptions set plan = 'OURO' where lower(plan) in ('gold', 'ouro');
      update subscriptions set plan = 'BASICO' where lower(plan) in ('basic', 'bronze', 'prata', 'basico') or plan is null;
    `);
    await pool.query(`
      alter table subscriptions add constraint subscriptions_plan_check check (plan in ('BASICO', 'OURO'));
    `);
  }

  console.log("[db:migrate] status BASICO/OURO aplicado com sucesso.");
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[db:migrate] ERRO: defina DATABASE_URL no arquivo backend/.env");
    process.exit(1);
  }

  try {
    await migrateStatusBasicoOuro();
  } catch (err) {
    console.error("[db:migrate] falhou:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
