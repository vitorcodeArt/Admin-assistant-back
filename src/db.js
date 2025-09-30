// db.js
import Database from "better-sqlite3";

const db = new Database("credentials.db"); // arquivo que vai ser criado

// Criar tabela se não existir
db.prepare(`
  CREATE TABLE IF NOT EXISTS credentials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    subdomain TEXT NOT NULL,
    token TEXT NOT NULL
  )
`).run();

export default db;
