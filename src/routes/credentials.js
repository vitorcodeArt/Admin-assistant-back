import express from "express";
import db from "../db.js";

const router = express.Router();

// Middleware simples de autenticação de admin
function checkAdmin(req, res, next) {
  const adminKey = req.headers["x-admin-key"];
  if (adminKey !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: "Acesso negado" });
  }
  next();
}

// Criar credencial
router.post("/", checkAdmin, (req, res) => {
  const { nome, email, subdomain, token } = req.body;
  if (!nome || !email || !subdomain || !token) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios" });
  }

  const stmt = db.prepare(
    "INSERT INTO credentials (nome, email, subdomain, token) VALUES (?, ?, ?, ?)"
  );
  const result = stmt.run(nome, email, subdomain, token);

  res.status(201).json({ id: result.lastInsertRowid, nome, email, subdomain });
});

// Listar credenciais (sem expor token!)
router.get("/", checkAdmin, (req, res) => {
  const rows = db
    .prepare("SELECT id, nome, email, subdomain FROM credentials")
    .all();
  res.json(rows);
});

// Obter credencial por nome (backend usa para acessar Zendesk)
router.get("/:nome", (req, res) => {
  const row = db
    .prepare("SELECT nome, email, subdomain, token FROM credentials WHERE nome = ?")
    .get(req.params.nome);

  if (!row) return res.status(404).json({ error: "Cliente não encontrado" });

  // ⚠️ Aqui não devolvemos o token ao front!
  // Em vez disso, o backend usaria `row.token` internamente para fazer requisições
  res.json({ nome: row.nome, email: row.email, subdomain: row.subdomain });
});

// Deletar credencial
router.delete("/:id", checkAdmin, (req, res) => {
  db.prepare("DELETE FROM credentials WHERE id = ?").run(req.params.id);
  res.json({ message: "Credencial removida" });
});

export default router;
