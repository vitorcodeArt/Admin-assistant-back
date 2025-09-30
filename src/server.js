import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";

import zendeskRoutes from "./routes/zendesk.js";
import credentialsRoutes from "./routes/credentials.js"; // <-- nova rota

const app = express();
app.use(cors());
app.use(express.json());

// rotas da API
app.use("/api/zendesk", zendeskRoutes);
app.use("/api/credentials", credentialsRoutes); // <-- adicionada

// porta
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend rodando em http://localhost:${PORT}`);
});
