import express from "express";
import { getCredentialOrThrow, zendeskFetch } from "../utils/zendeskClient.js";

const router = express.Router();

// LISTAR custom roles
// GET /api/zendesk/:credentialId/custom_roles
router.get("/:credentialId/custom_roles", async (req, res) => {
  try {
    const { credentialId } = req.params;
    const cred = getCredentialOrThrow(credentialId);
    const data = await zendeskFetch(cred, "/api/v2/custom_roles.json");
    res.json(data);
  } catch (err) {
    console.error("Erro ao listar custom roles:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
