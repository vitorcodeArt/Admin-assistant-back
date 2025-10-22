# Documentação de Rotas da API

Base principal do backend: `http://localhost:4000`

Todas as rotas Zendesk exigem um `:credentialId` válido que referencia um registro na tabela `credentials` (subdomain, email, token). O fluxo de autenticação contra o Zendesk é interno (Basic Auth `email/token:TOKEN`).

---

## Sumário

- [Usuários](#usuários)
- [Grupos](#grupos)
- [Grupos de um Usuário](#grupos-de-um-usuário)
- [Custom Roles](#custom-roles)
- [Brands](#brands)
- [Credenciais (admin)](#credenciais-admin)
- [Padrões de Erro](#padrões-de-erro)
- [Códigos de Status](#códigos-de-status)
- [Metadados de Listagem de Usuários](#metadados-de-listagem-de-usuários)
- [Exemplos Rápidos](#exemplos-rápidos)

---

## Usuários

### Listar usuários

GET `/api/zendesk/:credentialId/users`

Query params suportados:
| Param | Tipo | Exemplo | Descrição |
|-------|------|---------|----------|
| per_page | number | 100 | Passado diretamente ao Zendesk quando estratégia single-page |
| page | number | 2 | Página específica (single-page) |
| all | true/false | true | Força agregação multi-página (segue `next_page`) |
| maxPages | number | 10 | Limite de páginas a percorrer na agregação |
| roles | string | agent,end-user | Filtra por múltiplas roles (case-insensitive) |
| groups | string | 1234,5678 | Filtra por `group_id` primário do usuário |
| search | string | joao | Busca em `name` ou `email` (case-insensitive) |
| limit | number | 500 | Limita a quantidade final após filtros (máx 5000) |
| expandGroupName | true/false | true | Expande `group_name` via cache de grupos |

Resposta (campos principais):

```
{
  "users": [ { ... } ],
  "meta": {
    "original_total": 240,
    "total_after_filters": 120,
    "returned": 100,
    "truncated": false,
    "applied_filters": { "roles": ["agent"], "groups": ["123"], "search": "joao" },
    "pagination_strategy": "aggregate",
    "remote_role_filter": ["agent"],
    "pages_traversed": 5,
    "reached_end": true
  }
}
```

Observações de otimização:

- Se apenas `roles` for usado (sem search, groups, all), delega filtro diretamente ao Zendesk (`role[]`).
- Qualquer combinação com `groups`, `search` ou `all=true` ativa agregação local.

### Obter usuário por ID

GET `/api/zendesk/:credentialId/users/:userId`

Resposta:

```
{ "user": { ... } }
```

### Criar usuário

POST `/api/zendesk/:credentialId/users`

```
Body: { "user": { "name": "Nome", "email": "email@exemplo.com", ... } }
```

### Atualizar usuário

PUT `/api/zendesk/:credentialId/users/:userId`

```
Body: { "user": { ...campos... } }
```

### Deletar usuário

DELETE `/api/zendesk/:credentialId/users/:userId`

```
Resposta: { "success": true, "userId": 12345 }
```

---

## Grupos

### Listar grupos

GET `/api/zendesk/:credentialId/groups`

Query params: `per_page`, `page`, `all=true`, `maxPages`

`all=true` dispara agregação multi-página retornando:

```
{
  "groups": [ ... ],
  "total_fetched": 180,
  "pages_traversed": 3,
  "reached_end": true
}
```

Sem `all=true` a resposta é a original do Zendesk:

```
{ "groups": [ ... ], "count": 100, "next_page": null }
```

---

## Grupos de um Usuário

### Listar grupos aos quais o usuário pertence

GET `/api/zendesk/:credentialId/users/:userId/groups`

Retorna formato nativo do Zendesk:

```
{ "groups": [ { "id": 123, "name": "Suporte" }, ... ] }
```

---

## Custom Roles

### Listar custom roles

GET `/api/zendesk/:credentialId/custom_roles`

Retorna:

```
{ "custom_roles": [ { "id": 1, "name": "Agente N2", ... } ] }
```

Uso comum: mapear IDs para interface de autorização no front.

---

## Brands

### Listar brands (marcas)

GET `/api/zendesk/:credentialId/brands`

Formato (Zendesk):

```
{ "brands": [ { "id": 1, "name": "Marca Principal", ... } ], "count": 2 }
```

Uso típico: montar seletores de marca para criação de tickets ou segmentação de usuários.

---

## Credenciais (admin)

Prefixo: `/api/credentials`

As rotas de criação, listagem e remoção de credenciais exigem header:

```
X-Admin-Key: <valor em ADMIN_SECRET>
```

### Criar credencial

POST `/api/credentials`

```
Body: { "nome", "email", "subdomain", "token" }
```

Resposta (sem token):

```
{ "id": 1, "nome": "Conta", "email": "...", "subdomain": "..." }
```

### Listar credenciais

GET `/api/credentials`

```
[ { "id": 1, "nome": "Conta", "email": "...", "subdomain": "..." } ]
```

### Obter credencial por nome (somente metadados)

GET `/api/credentials/:nome`

```
{ "nome": "Conta", "email": "...", "subdomain": "..." }
```

### Remover credencial

DELETE `/api/credentials/:id`

```
{ "message": "Credencial removida" }
```

---

## Padrões de Erro

Formato consistente:

```
Status: <código>
{ "error": "Mensagem descritiva" }
```

| Cenário                              | Código           |
| ------------------------------------ | ---------------- |
| Credencial não encontrada            | 404              |
| Corpo inválido / parâmetros faltando | 400              |
| Acesso negado (credenciais admin)    | 403              |
| Erro Zendesk (proxy repassa)         | 4xx/5xx original |
| Exceção interna                      | 500              |

---

## Códigos de Status

| Código | Uso                                            |
| ------ | ---------------------------------------------- |
| 200    | Sucesso geral GET/PUT/DELETE                   |
| 201    | Criação de recurso (POST usuário / credencial) |
| 204    | Deleções diretas do Zendesk (interno)          |
| 400    | Validação / parâmetros inválidos               |
| 403    | Falha no header `X-Admin-Key`                  |
| 404    | Credencial ou recurso inexistente              |
| 500    | Falha inesperada / upstream não tratado        |

---

## Metadados de Listagem de Usuários

Campos em `meta` (quando GET /users):
| Campo | Significado |
|-------|------------|
| original_total | Total bruto coletado antes de filtros (quando agregação) |
| total_after_filters | Total após aplicar roles/groups/search |
| returned | Quantidade entregue (após `limit`) |
| truncated | true se `limit` cortou resultados |
| applied_filters | Echo dos filtros efetivos |
| pagination_strategy | `single-page` ou `aggregate` |
| remote_role_filter | Roles filtradas diretamente no Zendesk (caso otimizado) |
| pages_traversed | Quantidade de páginas percorridas |
| reached_end | true se última página foi alcançada |

---

## Exemplos Rápidos

```bash
# Listar usuários simples
curl http://localhost:4000/api/zendesk/1/users

# Filtros combinados (roles + busca + agregação)
curl "http://localhost:4000/api/zendesk/1/users?roles=agent&search=joao&all=true"

# Grupos agregados
curl "http://localhost:4000/api/zendesk/1/groups?all=true"

# Grupos do usuário
curl http://localhost:4000/api/zendesk/1/users/123456/groups

# Custom roles
curl http://localhost:4000/api/zendesk/1/custom_roles

# Brands
curl http://localhost:4000/api/zendesk/1/brands

# Criar usuário
curl -X POST http://localhost:4000/api/zendesk/1/users -H "Content-Type: application/json" -d '{"user": {"name": "Maria", "email": "maria@example.com"}}'

# Criar credencial (admin)
curl -X POST http://localhost:4000/api/credentials \
  -H "X-Admin-Key: $ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"nome":"Conta Demo","email":"demo@example.com","subdomain":"meuhelp","token":"ZENDESK_TOKEN"}'
```

---

## Notas

- O cache de grupos (TTL 60s) é reutilizado para `expandGroupName` e filtros `groups=`.
- Para grandes bases, ajuste `maxPages` gradualmente para evitar latência excessiva.
- `limit` atua somente após todos os filtros locais.

---

Atualize este arquivo sempre que novas rotas forem adicionadas.
