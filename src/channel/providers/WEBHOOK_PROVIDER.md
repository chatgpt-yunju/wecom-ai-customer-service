# Webhook Channel Provider

## 概述

Webhook Channel Provider 提供 HTTP webhook 接口，可以从任意外部系统接收消息，也可以向外发送消息。

## 功能

- 接收标准 HTTP POST 请求
- 支持签名验证（HMAC-SHA256）
- 可配置端口和路径
- 自动 ChannelMessage 转换
- 超时和错误处理
- 健康检查端点

## 配置

```json
{
  "channels": [
    {
      "type": "webhook",
      "name": "External API",
      "enabled": true,
      "config": {
        "port": 3002,
        "path": "/webhook/external",
        "secret": "your-webhook-secret"
      },
      "routes": [
        {
          "skillId": "wecom-ai-customer-service",
          "match": {}
        }
      ]
    }
  ]
}
```

### 配置选项

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `port` | number | 否 | Webhook 监听端口，默认 3002 |
| `path` | string | 否 | Webhook 路径，默认 `/webhook` |
| `secret` | string | 否 | 用于签名验证的密钥 |
| `allowedOrigins` | string[] | 否 | CORS 允许的源列表 |

## 接收消息

### 请求格式

```http
POST /webhook/external HTTP/1.1
Content-Type: application/json
X-Webhook-Signature: <hmac-sha256>

{
  "id": "msg-123",
  "from": {
    "id": "user-456",
    "name": "John Doe",
    "type": "user"
  },
  "to": {
    "id": "bot",
    "name": "AI Assistant",
    "type": "bot"
  },
  "content": {
    "type": "text",
    "text": "Hello, I need help with my order."
  },
  "metadata": {
    "source": "external-api",
    "priority": "high"
  },
  "timestamp": "2025-04-02T10:30:00Z"
}
```

### 响应

```json
{
  "success": true,
  "messageId": "webhook-123456-abcdef"
}
```

### 签名验证（可选）

如果配置了 `secret`，外部调用者需要在 `X-Webhook-Signature` 头中包含 HMAC-SHA256 签名：

```bash
signature=$(echo -n "$payload" | openssl dgst -sha256 -hmac "$secret" -r | awk '{print $1}')
curl -X POST http://localhost:3002/webhook/external \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $signature" \
  -d "$payload"
```

未经验证的请求将返回 `401 Unauthorized`。

## 发送消息

技能通过 `SkillChannelAdapter.send` 发送消息时，provider 会向配置的 `url`（如果设置了）或所有订阅客户端广播。

### 单播示例（通过组件 URL）

```json
{
  "type": "webhook",
  "name": "Outbound Webhook",
  "enabled": true,
  "config": {
    "port": 3002,
    "path": "/webhook/external",
    "url": "https://external.system/callback"
  }
}
```

当技能发送消息时，provider 会 POST 到 `https://external.system/callback`。

### 广播到多个接收者

Webhook provider 支持向多个订阅客户端广播（如果多客户端连接到同一个 webhook 端点）。

## 健康检查

```bash
curl http://localhost:3002/health
```

返回：
```json
{
  "status": "ok"
}
```

## 使用场景

- 与第三方系统集成（CRM、工单系统）
- 迁移期间的双向消息同步
- 事件驱动架构中的 webhook 路由

---
