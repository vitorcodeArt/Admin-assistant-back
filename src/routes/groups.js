import express from "express";
import {
  getCredentialOrThrow,
  zendeskFetch,
  fetchAllPaginated,
} from "../utils/zendeskClient.js";

const router = express.Router();

// LISTAR grupos
// GET /api/zendesk/:credentialId/groups?all=true&per_page=100&page=2
router.get("/:credentialId/groups", async (req, res) => {
  try {
    const { credentialId } = req.params;
    const { all, per_page, page, maxPages } = req.query;
    const cred = getCredentialOrThrow(credentialId);

    if (all === "true") {
      const data = await fetchAllPaginated(
        cred,
        "/api/v2/groups.json",
        "groups",
        { per_page, maxPages: maxPages ? Number(maxPages) : 10 }
      );
      return res.json(data);
    }

    const data = await zendeskFetch(cred, "/api/v2/groups.json", {
      query: { per_page, page },
    });
    res.json(data);
  } catch (err) {
    console.error("Erro ao listar grupos:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
