# 企业微信私信API文档

## 概述

本系统提供外部API接口，允许第三方系统通过企业微信API发送私信给用户。

## 认证

所有API调用需要在Header中包含 `X-API-Key`：

```http
X-API-Key: your_api_key_here
```

配置位置：`.env` 文件中的 `API_KEY`

---

## API接口

### 1. 发送私信

向指定用户发送文本或媒体消息。

**Endpoint**
```
POST /api/v1/wecom/send
```

**请求示例**
```bash
curl -X POST https://your-domain.com/api/v1/wecom/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "userId": "zhangsan",
    "message": "您好，这是您的订单状态更新。",
    "msgType": "text"
  }'
```

**参数说明**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| userId | string | 是 | 企业微信用户ID（不是姓名） |
| message | string | 是 | 消息内容 |
| msgType | string | 否 | 消息类型：text（默认）、image、file、voice |

**成功响应**
```json
{
  "success": true,
  "messageId": "msg_123456789",
  "userId": "zhangsan",
  "msgType": "text",
  "timestamp": "2026-04-01T12:00:00.000Z"
}
```

**错误响应**
```json
{
  "error": "Failed to send message",
  "details": "invalid user id"
}
```

---

### 2. 批量发送私信

向多个用户批量发送消息。

**Endpoint**
```
POST /api/v1/wecom/send/batch
```

**请求示例**
```bash
curl -X POST https://your-domain.com/api/v1/wecom/send/batch \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key_here" \
  -d '{
    "users": [
      { "userId": "zhangsan", "message": "消息1" },
      { "userId": "lisi", "message": "消息2" }
    ],
    "msgType": "text"
  }'
```

**参数说明**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| users | array | 是 | 用户消息对象数组，每个包含 userId 和 message |
| msgType | string | 否 | 消息类型：text（默认） |

**成功响应**
```json
{
  "success": true,
  "total": 2,
  "successCount": 1,
  "failedCount": 1,
  "results": [
    { "userId": "zhangsan", "success": true, "messageId": "msg_1" },
    { "userId": "lisi", "success": false, "error": "user not found" }
  ]
}
```

---

### 3. 查询用户信息

获取企业微信用户的详细信息。

**Endpoint**
```
GET /api/v1/wecom/user/:userId
```

**请求示例**
```bash
curl -X GET https://your-domain.com/api/v1/wecom/user/zhangsan \
  -H "X-API-Key: your_api_key_here"
```

**成功响应**
```json
{
  "success": true,
  "user": {
    "userid": "zhangsan",
    "name": "张三",
    "department": [1],
    "position": "工程师",
    "mobile": "13800138000",
    "email": "zhangsan@company.com",
    "avatar": "https://weixin.qq.com/avatar.jpg"
  }
}
```

---

### 4. 健康检查

验证API连接和企业微信API可用性。

**Endpoint**
```
GET /api/v1/wecom/health
```

**请求示例**
```bash
curl -X GET https://your-domain.com/api/v1/wecom/health \
  -H "X-API-Key: your_api_key_here"
```

**成功响应**
```json
{
  "success": true,
  "message": "WeCom API connection OK",
  "tokenExpiresIn": 7000
}
```

---

## 使用示例

### Node.js 示例

```javascript
const axios = require('axios');

const API_BASE = 'https://your-domain.com';
const API_KEY = 'your_api_key_here';

async function sendPrivateMessage(userId, message) {
  const response = await axios.post(`${API_BASE}/api/v1/wecom/send`, {
    userId,
    message,
    msgType: 'text'
  }, {
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    }
  });
  
  return response.data;
}

// 使用示例
sendPrivateMessage('zhangsan', '您好，您的订单已发货')
  .then(result => console.log('Sent:', result))
  .catch(err => console.error('Failed:', err.response?.data || err.message));
```

### Python 示例

```python
import requests

API_BASE = 'https://your-domain.com'
API_KEY = 'your_api_key_here'

def send_private_message(user_id, message):
    url = f'{API_BASE}/api/v1/wecom/send'
    headers = {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
    }
    data = {
        'userId': user_id,
        'message': message,
        'msgType': 'text'
    }
    
    response = requests.post(url, json=data, headers=headers)
    return response.json()

# 使用示例
result = send_private_message('zhangsan', '您好，您的订单已发货')
print(result)
```

---

## 错误码说明

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 400 | 请求参数错误 | 检查参数格式和必填字段 |
| 401 | API Key无效或缺失 | 检查X-API-Key header |
| 404 | 用户不存在 | 确认userId是否正确 |
| 500 | 服务器内部错误 | 查看服务器日志 |
| 502 | 企业微信API错误 | 检查企业微信配置 |

---

## 注意事项

1. **用户ID格式**：必须使用企业微信的用户ID（userid），不是姓名或邮箱
2. **频率限制**：企业微信API有频率限制，建议控制调用频率
3. **消息长度**：文本消息最多2048字符
4. **API Key安全**：妥善保管API Key，不要暴露在前端代码中
5. **HTTPS**：生产环境必须使用HTTPS

---

## 调试技巧

1. 先调用 `/api/v1/wecom/health` 验证连接
2. 使用 `GET /api/v1/wecom/user/:userId` 确认用户ID正确
3. 查看服务器日志获取详细错误信息：
   ```bash
   docker-compose logs app
   ```

---

## 相关配置

```env
# .env 文件中的相关配置
WECOM_CORP_ID=your_corp_id
WECOM_CORP_SECRET=your_corp_secret
WECOM_AGENT_ID=your_agent_id
API_KEY=your_external_api_key_here
```

---

最后更新: 2026-04-01
