<div align="center">
<h1>Zendesk Admin Assistant - Backend</h1>
<p>API Node.js/Express para proxy seguro e enriquecido de dados Zendesk (usuários e grupos) com filtros avançados.</p>
</div>

## Visão Geral

Este backend expõe endpoints REST para acessar e manipular usuários do Zendesk e listar grupos, adicionando camadas de:

- Paginação agregada (percorrendo <code>next_page</code>)
- Filtros por roles, grupos e busca textual
- Limitação pós-filtro e metadados estruturados
- Cache em memória de grupos (reduz chamadas repetidas)

Banco local SQLite (tabela <code>credentials</code>) armazena múltiplas credenciais Zendesk (subdomain, email, token). Cada requisição faz referência a uma credencial via <code>:credentialId</code>.

## Stack

- Node.js / Express
- better-sqlite3 (armazenar credenciais)
- node-fetch (chamadas Zendesk)
- dotenv (variáveis de ambiente)

## Execução

Instale dependências e suba o servidor (porta padrão 4000):

```bash
npm install
npm start # ou: node src/server.js
```

Crie/alimente a tabela de credenciais (exemplo mínimo em SQL):

```sql
INSERT INTO credentials (nome, email, subdomain, token)
VALUES ("Conta Demo", "consultoriazendesk@bcrcx.com", "meusubdominio", "ZENDESK_TOKEN_AQUI");
```

## Convenção de Autenticação Zendesk

Cada chamada é autenticada com Basic Auth no formato:

```
Authorization: Basic base64("email/token:TOKEN")
```

## Rotas Principais

Base das rotas Zendesk:

```
/api/zendesk/:credentialId
```

### 1. Usuários

| Método | Caminho                      | Descrição                     |
| ------ | ---------------------------- | ----------------------------- |
| GET    | /:credentialId/users         | Listar usuários (com filtros) |
| GET    | /:credentialId/users/:userId | Obter usuário por ID          |
| POST   | /:credentialId/users         | Criar usuário                 |
| PUT    | /:credentialId/users/:userId | Atualizar usuário             |
| DELETE | /:credentialId/users/:userId | Deletar usuário               |

#### Parâmetros de Query (GET /users)

| Param           | Tipo       | Exemplo        | Descrição                                          |
| --------------- | ---------- | -------------- | -------------------------------------------------- |
| per_page        | number     | 100            | Encaminhado direto ao Zendesk (quando single-page) |
| page            | number     | 2              | Página específica (sem filtros pesados)            |
| all             | true/false | true           | Força paginação agregada percorrendo next_page     |
| maxPages        | number     | 10             | Limite de páginas na estratégia agregada           |
| roles           | string     | agent,end-user | Filtro por múltiplas roles (case-insensitive)      |
| groups          | string     | 1234,5678      | Filtra por group_id primário do usuário            |
| search          | string     | joao           | Busca em name ou email (case-insensitive)          |
| limit           | number     | 500            | Corta resultado após filtros (máx 5000)            |
| expandGroupName | true/false | true           | Adiciona field group_name resolvendo pelo cache    |

#### Estratégia de Paginação

O backend decide automaticamente:

- "single-page": se você não enviou filtros (roles/groups/search) nem <code>all=true</code>.
- "aggregate": se enviou filtros ou <code>all=true</code> (carrega múltiplas páginas para aplicar filtros globalmente).

#### Resposta (GET /users)

```json
{
  "users": [
    { "id": 1, "name": "...", "group_id": 123, "group_name": "Suporte" }
  ],
  "meta": {
    "original_total": 240,
    "total_after_filters": 120,
    "returned": 100,
    "truncated": true,
    "applied_filters": {
      "roles": ["agent"],
      "groups": ["123"],
      "search": "joao"
    },
    "pagination_strategy": "aggregate",
    "pages_traversed": 5,
    "reached_end": false
  }
}
```

#### Exemplos (curl)

Listar primeira página simples (sem filtros):

```bash
curl http://localhost:4000/api/zendesk/1/users
```

Listar buscando em todas as páginas por agents chamados "joao":

```bash
curl "http://localhost:4000/api/zendesk/1/users?roles=agent&search=joao&all=true"
```

Filtrar por múltiplos grupos e retornar nome do grupo:

```bash
curl "http://localhost:4000/api/zendesk/1/users?groups=1234,5678&expandGroupName=true&all=true"
```

Aplicar limite pós-filtro:

```bash
curl "http://localhost:4000/api/zendesk/1/users?roles=admin&all=true&limit=200"
```

Criar usuário:

```bash
curl -X POST http://localhost:4000/api/zendesk/1/users \
	-H "Content-Type: application/json" \
	-d '{"user": {"name": "Maria Teste", "email": "maria.teste@example.com"}}'
```

Atualizar usuário:

```bash
curl -X PUT http://localhost:4000/api/zendesk/1/users/9876543 \
	-H "Content-Type: application/json" \
	-d '{"user": {"name": "Maria Atualizada"}}'
```

Excluir usuário:

```bash
curl -X DELETE http://localhost:4000/api/zendesk/1/users/9876543
```

### 2. Grupos

| Método | Caminho               | Descrição     |
| ------ | --------------------- | ------------- |
| GET    | /:credentialId/groups | Listar grupos |

Parâmetros (opcionais): <code>per_page</code>, <code>page</code>, <code>all=true</code>, <code>maxPages</code> — análogo a usuários.

Exemplo:

```bash
curl "http://localhost:4000/api/zendesk/1/groups?all=true"
```

### 3. Credenciais

Rotas carregadas em `/api/credentials` (não detalhadas aqui). Usadas para gerenciar registros na tabela <code>credentials</code> (id, nome, email, subdomain, token).

## Cache de Grupos

- Armazenado em memória por credentialId
- TTL atual: 60 segundos
- Reutilizado quando: `expandGroupName=true` ou filtro `groups=` é aplicado
- Renovado automaticamente após expirar ou se ainda não existir

## Metadados Importantes

| Campo               | Significado                                         |
| ------------------- | --------------------------------------------------- |
| original_total      | Total coletado antes de filtros (quando aggregate)  |
| total_after_filters | Quantidade após aplicar filtros roles/groups/search |
| returned            | Quantidade enviada ao cliente (após limit)          |
| truncated           | true se limit cortou resultados                     |
| pagination_strategy | "single-page" ou "aggregate"                        |
| pages_traversed     | Páginas percorridas na estratégia aggregate         |
| reached_end         | true se última página do Zendesk foi alcançada      |

## Boas Práticas para o Front

1. Carregue `/groups` uma vez e mantenha em cache local para montar filtros.
2. Use `expandGroupName=true` apenas quando realmente precisar mostrar nome diretamente nos resultados.
3. Prefira paginação simples (sem filtros) para navegação rápida inicial; habilite filtros depois.
4. Ajuste `maxPages` se perceber que a busca está cortando cedo (meta.reached_end=false).

## Próximos Passos Sugeridos

- Endpoint de busca dedicado usando `/api/v2/search.json` (Zendesk) para queries avançadas
- Suporte a organizations (organization_id -> nome)
- Cache distribuído (Redis) em cenários multi-instância
- Testes automatizados para validar lógica de filtros e metadados

---

Se algo estiver incompleto ou quiser detalhar as rotas de credenciais, abra uma issue ou peça diretamente. ✅
