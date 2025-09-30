import db from "../db.js";

export function getCredentialOrThrow(credentialId) {
  const cred = db
    .prepare("SELECT * FROM credentials WHERE id = ?")
    .get(credentialId);
  if (!cred) {
    const err = new Error("Credencial não encontrada");
    err.status = 404;
    throw err;
  }
  return cred;
}

function authHeader(cred) {
  return (
    "Basic " +
    Buffer.from(`${cred.email}/token:${cred.token}`).toString("base64")
  );
}

export async function zendeskFetch(
  cred,
  path,
  { method = "GET", body, query } = {}
) {
  const url = new URL(`https://${cred.subdomain}.zendesk.com${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      if (Array.isArray(v)) {
        v.forEach((item) => {
          if (item !== undefined && item !== null && item !== "") {
            url.searchParams.append(k, item);
          }
        });
      } else {
        url.searchParams.set(k, v);
      }
    });
  }

  const resp = await fetch(url.toString(), {
    method,
    headers: {
      Authorization: authHeader(cred),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    const text = await resp.text();
    const error = new Error(`HTTP ${resp.status}: ${text}`);
    error.status = resp.status;
    throw error;
  }

  // DELETE 204
  if (resp.status === 204) return { success: true };
  return resp.json();
}

export async function fetchAllPaginated(
  cred,
  firstPath,
  aggregateKey,
  { per_page, maxPages = 10 } = {}
) {
  let url = new URL(`https://${cred.subdomain}.zendesk.com${firstPath}`);
  if (per_page) url.searchParams.set("per_page", per_page);

  const collected = [];
  let pages = 0;
  let last;

  while (url && pages < maxPages) {
    // eslint-disable-next-line no-await-in-loop
    const resp = await fetch(url.toString(), {
      headers: {
        Authorization: authHeader(cred),
        "Content-Type": "application/json",
      },
    });
    if (!resp.ok) {
      const text = await resp.text();
      const error = new Error(`HTTP ${resp.status}: ${text}`);
      error.status = resp.status;
      throw error;
    }
    // eslint-disable-next-line no-await-in-loop
    const data = await resp.json();
    last = data;
    if (Array.isArray(data[aggregateKey]))
      collected.push(...data[aggregateKey]);
    pages += 1;
    url = data.next_page ? new URL(data.next_page) : null;
  }

  return {
    [aggregateKey]: collected,
    total_fetched: collected.length,
    pages_traversed: pages,
    reached_end: !last?.next_page,
  };
}

// --- Cache simples (em memória) para grupos por credencial ---
const groupsCache = new Map(); // key: cred.id -> { fetchedAt, ttlMs, data: { id->group } }
const DEFAULT_GROUPS_TTL = 60 * 1000; // 60s

export async function getGroupsMap(cred, { force = false } = {}) {
  const now = Date.now();
  const cacheEntry = groupsCache.get(cred.id);
  if (!force && cacheEntry && now - cacheEntry.fetchedAt < cacheEntry.ttlMs) {
    return cacheEntry.data;
  }

  // Busca paginada (limite prudente de 20 páginas para evitar abusos)
  const groupsResult = await fetchAllPaginated(
    cred,
    "/api/v2/groups.json",
    "groups",
    { maxPages: 20 }
  );

  const map = new Map();
  for (const g of groupsResult.groups) {
    map.set(g.id, g);
  }
  groupsCache.set(cred.id, {
    fetchedAt: now,
    ttlMs: DEFAULT_GROUPS_TTL,
    data: map,
  });
  return map;
}

// Função utilitária para aplicar filtros em usuários já carregados.
export function filterUsers({
  users,
  roles, // array de roles desejadas
  groupIds, // array de group ids
  search, // termo de busca (case-insensitive) em name ou email
  groupsMap, // Map(id->group) para expansão
  expandGroupName = false,
}) {
  let result = users;

  if (roles && roles.length) {
    const rolesSet = new Set(roles.map((r) => r.toLowerCase()));
    result = result.filter((u) => u.role && rolesSet.has(u.role.toLowerCase()));
  }

  if (groupIds && groupIds.length) {
    const groupSet = new Set(groupIds.map((g) => Number(g)));
    // Um usuário pode ter group_id (primary) e/ou groups (dependendo do expand no Zendesk - aqui usamos primary group_id se existir)
    result = result.filter((u) => {
      if (u.group_id && groupSet.has(Number(u.group_id))) return true;
      // Caso futuramente expandirmos membership, poderíamos checar u.groups
      return false;
    });
  }

  if (search) {
    const term = search.trim().toLowerCase();
    if (term) {
      result = result.filter((u) => {
        return (
          (u.name && u.name.toLowerCase().includes(term)) ||
          (u.email && u.email.toLowerCase().includes(term))
        );
      });
    }
  }

  if (expandGroupName && groupsMap) {
    result = result.map((u) => ({
      ...u,
      group_name: u.group_id ? groupsMap.get(u.group_id)?.name || null : null,
    }));
  }

  return result;
}
