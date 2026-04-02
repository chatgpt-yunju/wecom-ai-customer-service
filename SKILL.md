# OpenClaw Skill: WeCom AI Customer Service

This document describes how to use the wecom-ai-customer-service as an OpenClaw skill.

## Overview

The WeCom AI Customer Service skill provides enterprise-grade AI-powered customer support integrated with WeCom (WeChat Work). It supports:

- AI-powered chat responses using OpenAI-compatible APIs (Claude, GPT, etc.)
- Knowledge base with document upload and RAG retrieval
- Human agent handoff and workload management
- Webhook-based message reception from WeCom
- External API for third-party integrations
- Admin dashboard for monitoring and configuration

## Skill Interface

The skill implements the `IOpenClawSkill` interface, exposing:

- `initialize(config)`: Initialize with configuration
- `start()`: Start processing events
- `stop()`: Graceful shutdown
- `onMessageReceived(event)`: Handle incoming message
- `onSessionStarted(event)`, `onSessionEnded(event)`, `onAgentAssigned(event)`, `onKnowledgeUpdated(event)`
- `getCapabilities()`: Return skill capabilities
- `getConfigurationSchema()`: Return required configuration fields
- `healthCheck()`: Return health status

## Configuration

The skill requires a configuration object with the following structure:

```json
{
  "ai": {
    "apiBaseUrl": "https://api.yunjunet.cn/v1",
    "apiKey": "your-api-key",
    "model": "claude-3-opus-20240229",
    "maxTokens": 4000,
    "temperature": 0.7,
    "systemPrompt": "你是一个专业的客服助手。"
  },
  "wecom": {
    "corpId": "your-corp-id",
    "corpSecret": "your-corp-secret",
    "token": "webhook-token",
    "encodingAESKey": "your-aes-key",
    "agentId": 1000,
    "apiHost": "https://qyapi.weixin.qq.com/cgi-bin"
  },
  "database": {
    "type": "postgres",
    "host": "localhost",
    "port": 5432,
    "username": "wecom_user",
    "password": "password",
    "database": "wecom_ai"
  },
  "redis": {
    "host": "localhost",
    "port": 6379
  },
  "skill": {
    "enablePolling": false,
    "pollInterval": 10,
    "maxSessionHistory": 20,
    "enableKnowledgeRetrieval": true,
    "autoTransferThreshold": 0.3
  }
}
```

Configuration can be provided via environment variables (prefixed with `OPENCLAW_` or legacy `AI_`, `WECOM_`, etc.), JSON file at `config/skill-config.json`, or directly injected by the OpenClaw runtime.

## Running as a Skill

### Skill Mode (OpenClaw Runtime)

```bash
export OPENCLAW_RUNTIME=true
npm run build
node dist/skill-index.js
```

The runtime will instantiate the skill, call `initialize(config)`, then `start()`, and invoke event handlers as needed.

### Standalone Mode (HTTP Server)

For testing without OpenClaw runtime:

```bash
npm run build
node dist/skill-index.js
```

This starts an HTTP server exposing:
- `POST /wecom/callback` - WeCom webhook
- `GET /health` - Health check

The admin and agent APIs are **not** included in standalone skill mode; use monolithic mode for those.

### Monolithic Mode (Full Server with Admin/Agent APIs)

```bash
npm run build
node dist/app.js
```

This starts the full server with all endpoints:
- WeCom webhook `/wecom/callback`
- AI chat `/api/v1/chat/completions`
- Admin APIs `/admin/*`
- Agent APIs `/agent/*`
- Authentication `/auth/*`

## Database Schema

The skill uses the following main tables:

- `user` - WeCom users
- `session` - Chat sessions
- `message` - Individual messages
- `agent` - Customer service agents
- `knowledge_base` - Uploaded documents
- `kb_chunk` - Text chunks for RAG
- `config` - System configuration
- `statistics` - Analytics metrics

Initialize with:
```bash
npm run migration:run
```

## Webhook Integration (WeCom)

Configure your WeCom application to send callbacks to the skill's `/wecom/callback` endpoint. The skill will:

1. Verify the signature
2. Decrypt the message
3. Get or create the user
4. Start or continue a session
5. Generate an AI response using conversation history and knowledge base
6. Send the reply back to the user via WeCom API

## Knowledge Base (RAG)

Upload documents (PDF, Word, TXT, Markdown) via the Admin UI or API `/admin/kb/upload`. The skill will:

1. Extract text from the document
2. Split into chunks (sentence-aware, ~1000 chars)
3. Store chunks in the database
4. (Future) Generate embeddings for vector search

When a user message is received, the skill queries the knowledge base for relevant chunks and injects them into the AI prompt.

## Human Handoff

If the AI confidence is low or a human agent manually claims a session:

1. The session status changes to `transferred`
2. The assigned agent sees the session in their workstation (`/agent/sessions`)
3. Agent can send messages directly to the user
4. The AI will not auto-reply while an agent is assigned
5. Agent closes session when done

## API Key for External Integrations

Set `API_KEY` environment variable to enable external applications to send messages via:

```bash
curl -H "X-API-Key: your-key" \
  -X POST http://localhost:3000/api/v1/wecom/send \
  -d '{"userId":"xxx","content":"Hello"}'
```

## Monitoring

Health endpoint: `GET /skill/health` (skill mode) or `GET /health` (monolithic)

Returns:
```json
{
  "status": "healthy",
  "checks": {
    "database": true,
    "redis": true,
    "ai": true,
    "wecom": true
  },
  "uptime": 1234.56,
  "version": "1.0.0"
}
```

## Troubleshooting

- **AI errors**: Check AI service connectivity and API key. Verify `AI_API_BASE_URL` and model availability.
- **WeCom errors**: Verify corp credentials and that the server is reachable from WeCom. Check webhook URL configuration.
- **Database errors**: Ensure PostgreSQL is running with pgvector extension. Run migrations.
- **Redis errors**: Ensure Redis is running and accessible.
- **Silent failures**: Check logs in `logs/error.log` and `logs/combined.log`.

## Development

Recompile after changes:

```bash
npm run build
```

Run with TS in dev mode (monolithic only):

```bash
npm run dev
```

Run tests:

```bash
npm test
```

## Branch

This refactoring is implemented on the `openclaw-skill` branch.
