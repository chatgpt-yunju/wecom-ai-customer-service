# OpenClaw Channel System

## 概述

OpenClaw Channel 系统提供了一个抽象的、可扩展的消息通道集成层，允许不同的消息平台（WeCom、Webhook、WebSocket、Slack 等）接入到 OpenClaw Skill。

该系统的核心思想是：
- **Channel Provider**: 负责连接具体消息平台，接收和发送消息
- **Channel Manager**: 管理所有 provider，处理消息路由
- **Skill Channel Adapter**: 将 channel 消息桥接到 skill 的事件接口

## 架构

```
┌─────────────────┐
│   WeCom/Slack   │
│   (Channel)     │
└────────┬────────┘
         │ messages
         ▼
┌─────────────────┐
│ Channel Provider│ (IChannelProvider)
│  (per channel)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     routing rules      ┌──────────────────┐
│ Channel Manager │───────────────────────▶│  Skill Adapter   │
│                 │                         │ (ISkillChannel   │
│ - registration  │                         │   Adapter)       │
│ - routing       │                         └────────┬─────────┘
│ - events        │                                  │
└─────────────────┘                                  │
         │                                            │ skill events
         │ messages                                   ▼
         │                               ┌──────────────────────┐
         └──────────────────────────────▶│  OpenClawSkill       │
                                         │  (IOpenClawSkill)    │
                                         └──────────────────────┘
```

## 核心类型

- `ChannelType`: 'wecom' | 'webhook' | 'websocket' | 'http' | 'custom'
- `ChannelMessage`: 统一的通道消息模型
- `IChannelProvider`: 通道提供者接口
- `IChannelManager`: 通道管理器接口
- `ISkillChannelAdapter`: Skill 适配器接口

## 配置

创建 `config/channels.json` 文件：

```json
{
  "enabled": true,
  "channels": [
    {
      "type": "wecom",
      "name": "WeCom Main",
      "enabled": true,
      "config": {
        "corpId": "your-corp-id",
        "corpSecret": "your-corp-secret",
        "token": "webhook-token",
        "encodingAESKey": "your-aes-key",
        "agentId": 1000
      },
      "routes": [
        {
          "skillId": "wecom-ai-cs-skill",
          "match": {
            "eventType": "text"
          }
        }
      ]
    }
  ],
  "defaultRoute": {
    "skillId": "wecom-ai-cs-skill",
    "match": {}
  }
}
```

## 运行

在 skill-index.ts 中，channel 系统会自动加载配置：

```bash
# Skill mode with channel support (default)
OPENCLAW_RUNTIME=true npm run skill

# Standalone with HTTP server
npm run skill  # starts both skill and HTTP server on port 3000

# Check channel status
curl http://localhost:3000/channels/status
```

## 扩展新的 Channel Provider

1. 实现 `IChannelProvider` 接口：

```typescript
import { IChannelProvider, ChannelMessage } from '../types';

export class MyChannelProvider implements IChannelProvider {
  get channelId(): string { return this.config.name; }
  get channelName(): string { return this.config.name; }
  get channelType(): string { return 'my-channel'; }

  async initialize(config: Record<string, any>): Promise<void> {
    // Setup connection to your channel platform
  }

  async start(): Promise<void> {
    // Start listening for messages
  }

  async stop(): Promise<void> {
    // Cleanup
  }

  onMessage(callback: (msg: ChannelMessage) => void): void {
    this.on('message', callback);
  }

  onError(callback: (err: Error) => void): void {
    this.on('error', callback);
  }

  isConnected(): boolean {
    return this.connected;
  }

  async healthCheck(): Promise<boolean> {
    return this.connected;
  }

  async send(message: ChannelMessage): Promise<boolean> {
    // Send message through your channel
  }

  async broadcast(messages: ChannelMessage[]): Promise<boolean[]> {
    // Broadcast multiple messages
  }
}
```

2. 在 `ChannelManager.createProvider` 中添加 case：

```typescript
case 'my-channel':
  return new MyChannelProvider();
```

3. 在配置中使用：

```json
{
  "type": "my-channel",
  "name": "My Channel",
  "enabled": true,
  "config": {
    // your provider-specific config
  }
}
```

## 消息路由

路由规则基于 `RouteConfig`：

```typescript
{
  "skillId": "target-skill-id",
  "match": {
    "eventType": "text",           // Match message type
    "contentType": "text",
    "userIdPattern": "^user_\\d+$", // Regex pattern
    "metadata": {
      "source": "wecom",
      "priority": "high"
    }
  }
}
```

匹配按顺序进行，第一个匹配的规则生效。如果没有匹配，则使用 `defaultRoute`。

## 状态监控

Channel Manager 提供状态查询：

```bash
GET /channels/status
```

响应示例：

```json
[
  {
    "channelId": "wecom-main",
    "channelName": "WeCom Main",
    "channelType": "wecom",
    "connected": true,
    "lastActivity": "2025-04-02T08:30:00Z",
    "messageCount": {
      "inbound": 1234,
      "outbound": 1234
    },
    "errors": 0
  }
]
```

## 与 Skill 的集成

Skill Channel Adapter 负责：

1. **订阅**: Skill 可以订阅一个或多个 channel
2. **消息转换**: 将 `ChannelMessage` 转换为 `MessageEvent` 传给 skill
3. **响应发送**: 将 skill 的 `MessageResponse` 转换回 `ChannelMessage` 并发送

Skill 无需关心底层 channel 细节，所有消息都通过统一的 `onMessageReceived` 接口进入。

## 目前支持的 Channel

- ✅ **WeCom** (企业微信) - 完全实现
- ⏳ **Webhook** - 待实现
- ⏳ **WebSocket** - 待实现

## 开发日志

- 2025-04-02: 初始实现，支持 WeCom provider 和基础 channel 管理器
