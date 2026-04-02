# WebSocket Channel Provider

## 概述

WebSocket Channel Provider 允许通过 WebSocket 协议进行实时双向通信。适用于：
- 实时仪表盘
- 管理后台通知
- 多用户协作会话

## 配置

```json
{
  "channels": [
    {
      "type": "websocket",
      "name": "Realtime Dashboard",
      "enabled": true,
      "config": {
        "port": 3003,
        "path": "/ws/channel"
      },
      "routes": [
        {
          "skillId": "dashboard-skill",
          "match": {
            "metadata": { "source": "dashboard" }
          }
        }
      ]
    }
  ]
}
```

## 客户端连接

```javascript
// 连接到 WebSocket 通道
const ws = new WebSocket('ws://localhost:3003/ws/channel?channels=dashboard&userId=agent-123');

// 接收消息
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// 发送消息
ws.send(JSON.stringify({
  type: 'message',
  channelId: 'dashboard',
  content: {
    type: 'text',
    text: 'Hello from client!'
  },
  metadata: { source: 'dashboard' }
}));

// 订阅其他频道
ws.send(JSON.stringify({
  type: 'subscribe',
  channels: ['notifications', 'alerts']
}));

// Ping/Pong
ws.send(JSON.stringify({ type: 'ping' }));
```

## 服务器端广播

通过 SkillChannelAdapter 发送消息到 WebSocket 客户端：

```typescript
await skillAdapter.sendThroughChannel('dashboard', {
  to: { id: 'dashboard', type: 'system' }, // 广播到所有订阅了 'dashboard' 频道的客户端
  content: {
    type: 'text',
    text: 'New session assigned!'
  },
  metadata: { priority: 'high' }
});
```

## 频道订阅

客户端连接时通过查询参数订阅频道：
```
ws://localhost:3003/ws/channel?channels=dashboard,notifications&userId=agent-123
```

运行时动态订阅：
```json
{
  "type": "subscribe",
  "channels": ["alerts", "metrics"]
}
```

取消订阅：
```json
{
  "type": "unsubscribe",
  "channels": ["notifications"]
}
```

## 连接生命周期

- `connected` - 连接建立时发送，包含 clientId 和已订阅频道
- 消息流转：`text/image/file/etc.` → 作为 ChannelMessage 处理
- `error` - 发生错误时发送
- `close` - 连接关闭时发送

## 状态监控

```bash
curl http://localhost:3000/channels/status
```

返回：
```json
[
  {
    "channelId": "realtime-dashboard",
    "channelName": "Realtime Dashboard",
    "channelType": "websocket",
    "connected": true,
    "lastActivity": "2025-04-02T10:30:00Z",
    "messageCount": {
      "inbound": 1234,
      "outbound": 1234
    },
    "errors": 0
  }
]
```

## 使用场景

1. **实时仪表盘** - 管理员查看实时会话、消息统计
2. **客服工作台** - 客服人员在浏览器中接收新会话通知
3. **系统监控** - 实时指标和告警推送
4. **协作工具** - 多客服同时处理会话

## 扩展

你可以通过继承或修改 `WebSocketChannelProvider` 来添加：
- 心跳检测
- 消息持久化
- 频道权限控制
- 速率限制
- SSL/TLS 支持

---
