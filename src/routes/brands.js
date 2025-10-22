import express from "express";
import { getCredentialOrThrow, zendeskFetch } from "../utils/zendeskClient.js";

const router = express.Router();

// LISTAR brands (marcas)
// GET /api/zendesk/:credentialId/brands
router.get("/:credentialId/brands", async (req, res) => {
  try {
    const { credentialId } = req.params;
    const cred = getCredentialOrThrow(credentialId);
    const data = await zendeskFetch(cred, "/api/v2/brands.json");
    res.json(data); // formato Zendesk: { brands: [...], count: N }
  } catch (err) {
    console.error("Erro ao listar brands:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
