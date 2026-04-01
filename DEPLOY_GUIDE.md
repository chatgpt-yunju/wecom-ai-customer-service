
## 外部API接口（新功能）

系统提供外部API接口，允许其他系统调用企业微信发送私信。

### 认证方式

所有API请求需要在Header中包含 `X-API-Key`：

```
X-API-Key: your_api_key_here
```

配置 `.env` 中的 `API_KEY`。

### 接口列表

#### 1. 发送私信
```
POST /api/v1/wecom/send
Content-Type: application/json
X-API-Key: your_key

{
  "userId": "userid",
  "message": "消息内容",
  "msgType": "text"  // text, image, file, voice
}
```

#### 2. 批量发送
```
POST /api/v1/wecom/send/batch
{
  "users": [
    { "userId": "user1", "message": "消息1" },
    { "userId": "user2", "message": "消息2" }
  ],
  "msgType": "text"
}
```

#### 3. 查询用户信息
```
GET /api/v1/wecom/user/:userId
```

#### 4. 健康检查
```
GET /api/v1/wecom/health
```

详细API文档见 `API_DOCS.md`。


---

## 📧 联系方式

项目维护：Claude Code  
联系邮箱：**2743319061@qq.com**  
GitHub：https://github.com/chatgpt-yunju/wecom-ai-customer-service

欢迎提交Issue和Pull Request！
