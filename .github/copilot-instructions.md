# Copilot Instructions for AI Agents

## Visão Geral

Este projeto é um backend Node.js/Express para integração com múltiplos clientes Zendesk. O código está organizado em três camadas principais:

- **server.js**: Ponto de entrada, configura o Express, CORS, JSON e as rotas da API.
- **routes/zendesk.js**: Define endpoints REST, delegando lógica para os serviços.
- **services/zendeskService.js**: Implementa integrações com Zendesk, usando Axios e variáveis de ambiente para autenticação.

## Fluxo de Dados

1. Requisições chegam via `/api/zendesk/*`.
2. Rotas chamam funções de serviço, que acessam APIs externas do Zendesk.
3. Tokens e subdomínios dos clientes são definidos em variáveis de ambiente e mapeados no serviço.

## Convenções Específicas

- **Clientes suportados**: `ifood`, `fau`, `leticia` (veja o objeto `clientes` em `zendeskService.js`).
- **Autenticação Zendesk**: Use o padrão `email/token` e o token do cliente.
- **Erros**: Sempre retorne JSON com `error.message` e status HTTP adequado.
- **Novos clientes**: Adicione ao objeto `clientes` e crie nova variável de ambiente para o token.

## Integrações e Dependências

- **Axios** para chamadas HTTP.
- **Express** para rotas e middleware.
- **CORS** habilitado globalmente.
- **Variáveis de ambiente**: Tokens Zendesk devem ser definidos no ambiente (exemplo: `.env.example`).

## Exemplos de Uso

- `GET /api/zendesk/users?cliente=ifood` retorna usuários do Zendesk do cliente `ifood`.

## Padrões de Código

- Use `async/await` para chamadas externas.
- Centralize lógica de integração em `services/`.
- Rotas devem ser finas, apenas delegando para serviços.

## Dicas para Agentes

- Consulte `zendeskService.js` para entender o mapeamento de clientes e tokens.
- Para adicionar endpoints, crie novas rotas em `routes/zendesk.js` e funções correspondentes em `services/zendeskService.js`.
- Sempre valide o parâmetro `cliente` antes de chamar o serviço.

## Arquivos-Chave

- `scr/server.js`: Inicialização do servidor e rotas principais.
- `scr/routes/zendesk.js`: Endpoints REST para Zendesk.
- `scr/services/zendeskService.js`: Integração e autenticação com Zendesk.
- `.env.example`: Estrutura esperada das variáveis de ambiente.

---

Seções incompletas ou dúvidas? Solicite exemplos reais de endpoints, fluxos de autenticação ou padrões de erro usados no projeto.
