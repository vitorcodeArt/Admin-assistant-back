import express from "express";
import {
  getCredentialOrThrow,
  zendeskFetch,
  fetchAllPaginated,
  getGroupsMap,
  filterUsers,
} from "../utils/zendeskClient.js";

const router = express.Router();

// LISTAR usuários (opcional all=true para percorrer todas as páginas)
// GET /api/zendesk/:credentialId/users?all=true&per_page=100&page=2
router.get("/:credentialId/users", async (req, res) => {
  try {
    const { credentialId } = req.params;
    const {
      all,
      per_page,
      page,
      maxPages,
      roles, // ex: agent,end-user,admin
      groups, // ex: 123,456
      search, // termo livre (name/email)
      limit, // limitar após filtros
      expandGroupName, // true para incluir group_name
    } = req.query;

    const cred = getCredentialOrThrow(credentialId);

    // Normalização de parâmetros
    const rolesArr = roles
      ? String(roles)
          .split(",")
          .map((r) => r.trim())
          .filter(Boolean)
      : [];
    const groupIdsArr = groups
      ? String(groups)
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean)
      : [];
    const numericLimit = limit ? Math.min(Number(limit), 5000) : null; // proteção
    const perPageParam = per_page || undefined; // delegar padrão do Zendesk
    const maxPagesNum = maxPages ? Number(maxPages) : 10;

    // Caso especial: somente roles fornecidas (sem grupos, sem search, sem all) -> podemos delegar filtro direto ao Zendesk usando role[]=.
    const onlyRemoteRoleFilter =
      rolesArr.length > 0 &&
      groupIdsArr.length === 0 &&
      !search &&
      all !== "true";

    // needAll só é verdadeiro quando realmente precisamos agregar localmente (grupos, search, all explícito, ou roles combinadas com outros filtros).
    const needAll =
      all === "true" ||
      groupIdsArr.length > 0 ||
      search ||
      (rolesArr.length > 0 && !onlyRemoteRoleFilter);

    let baseData;
    if (needAll) {
      baseData = await fetchAllPaginated(cred, "/api/v2/users.json", "users", {
        per_page: perPageParam,
        maxPages: maxPagesNum,
      });
    } else if (onlyRemoteRoleFilter) {
      // Chamada single-page com múltiplos role[] delegando ao Zendesk o filtro por role.
      const roleQueryArray = rolesArr.map((r) => r); // já normalizados
      baseData = await zendeskFetch(cred, "/api/v2/users.json", {
        query: { per_page: perPageParam, page, "role[]": roleQueryArray },
      });
    } else {
      baseData = await zendeskFetch(cred, "/api/v2/users.json", {
        query: { per_page: perPageParam, page },
      });
    }

    let users = baseData.users || [];
    let groupsMap = null;

    if (groupIdsArr.length || expandGroupName === "true") {
      groupsMap = await getGroupsMap(cred);
    }

    // Aplicar filtros se necessário
    if (
      (rolesArr.length && !onlyRemoteRoleFilter) ||
      groupIdsArr.length ||
      search ||
      expandGroupName === "true"
    ) {
      users = filterUsers({
        users,
        roles: rolesArr,
        groupIds: groupIdsArr,
        search,
        groupsMap,
        expandGroupName: expandGroupName === "true",
      });
    }

    const totalAfterFilters = users.length;
    let truncated = false;
    if (numericLimit && users.length > numericLimit) {
      users = users.slice(0, numericLimit);
      truncated = true;
    }

    const meta = {
      original_total:
        baseData.total_fetched ||
        baseData.count ||
        baseData.users?.length ||
        null,
      total_after_filters: totalAfterFilters,
      returned: users.length,
      truncated,
      applied_filters: {
        roles: rolesArr.length ? rolesArr : null,
        groups: groupIdsArr.length ? groupIdsArr : null,
        search: search || null,
      },
      pagination_strategy: needAll
        ? "aggregate"
        : onlyRemoteRoleFilter
        ? "single-page-remote-role-filter"
        : "single-page",
      remote_role_filter: onlyRemoteRoleFilter ? rolesArr : null,
      pages_traversed: needAll ? baseData.pages_traversed : 1,
      reached_end: needAll ? baseData.reached_end : null,
    };

    return res.json({ users, meta });
  } catch (err) {
    console.error("Erro ao listar usuários:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// OBTER usuário por ID
// GET /api/zendesk/:credentialId/users/:userId
router.get("/:credentialId/users/:userId", async (req, res) => {
  try {
    const { credentialId, userId } = req.params;
    const cred = getCredentialOrThrow(credentialId);
    const data = await zendeskFetch(cred, `/api/v2/users/${userId}.json`);
    res.json(data);
  } catch (err) {
    console.error("Erro ao obter usuário:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// CRIAR usuário
// POST /api/zendesk/:credentialId/users { user: { name, email, ... } }
router.post("/:credentialId/users", async (req, res) => {
  try {
    const { credentialId } = req.params;
    const { user } = req.body || {};
    if (!user || !user.name || !user.email) {
      return res
        .status(400)
        .json({ error: "Corpo inválido. { user: { name, email } }" });
    }
    const cred = getCredentialOrThrow(credentialId);
    const data = await zendeskFetch(cred, "/api/v2/users.json", {
      method: "POST",
      body: { user },
    });
    res.status(201).json(data);
  } catch (err) {
    console.error("Erro ao criar usuário:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// ATUALIZAR usuário
// PUT /api/zendesk/:credentialId/users/:userId { user: { ... } }
router.put("/:credentialId/users/:userId", async (req, res) => {
  try {
    const { credentialId, userId } = req.params;
    const { user } = req.body || {};
    if (!user)
      return res
        .status(400)
        .json({ error: "Corpo inválido. { user: { ... } }" });
    const cred = getCredentialOrThrow(credentialId);
    const data = await zendeskFetch(cred, `/api/v2/users/${userId}.json`, {
      method: "PUT",
      body: { user },
    });
    res.json(data);
  } catch (err) {
    console.error("Erro ao atualizar usuário:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

// DELETAR usuário
// DELETE /api/zendesk/:credentialId/users/:userId
router.delete("/:credentialId/users/:userId", async (req, res) => {
  try {
    const { credentialId, userId } = req.params;
    const cred = getCredentialOrThrow(credentialId);
    await zendeskFetch(cred, `/api/v2/users/${userId}.json`, {
      method: "DELETE",
    });
    res.json({ success: true, userId });
  } catch (err) {
    console.error("Erro ao deletar usuário:", err);
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
