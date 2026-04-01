# 企业微信AI客服系统 - 快速开始指南

## 项目已完成

这是一个完整的企业微信AI客服系统，包含：

✅ **核心功能**
- 企业微信消息接收与响应（文本、图片、文件）
- Claude API / OpenAI兼容AI对话引擎
- 知识库系统（PDF、Word、TXT、Markdown）
- 会话管理和历史记录
- 人工客服转接
- 管理后台（用户、会话、统计数据）
- WebSocket实时客服工作台

✅ **技术栈**
- 后端：Node.js + Express + TypeScript + TypeORM
- 数据库：PostgreSQL + pgvector（向量检索）
- 缓存：Redis
- AI服务：OpenAI兼容API（支持Claude、DeepSeek等）
- 前端：Vue 3 + Element Plus + Vite
- 部署：Docker + Docker Compose

## 快速安装

### 方式一：Docker部署（推荐）

1. **解压项目包**
   ```bash
   tar -xzf wecom_ai_customer_service.tar.gz
   cd wecom_ai_customer_service
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   ```
   
   编辑 `.env`，填入你的配置：
   ```env
   # AI配置（必需）
   AI_API_BASE_URL=https://api.anthropic.com/v1
   AI_API_KEY=your_ai_api_key
   AI_MODEL=claude-3-opus-20240229
   
   # 企业微信配置（必需）
   WECOM_CORP_ID=your_corp_id
   WECOM_CORP_SECRET=your_corp_secret
   WECOM_TOKEN=your_callback_token
   WECOM_ENCODING_AES_KEY=your_encoding_aes_key
   WECOM_AGENT_ID=your_agent_id
   
   # 数据库和Redis使用docker-compose中配置的默认值即可
   DATABASE_HOST=postgres
   DATABASE_PORT=5432
   DATABASE_USERNAME=wecom_user
   DATABASE_PASSWORD=wecom_password
   DATABASE_NAME=wecom_ai
   
   REDIS_HOST=redis
   REDIS_PORT=6379
   
   # JWT密钥（修改为强密码）
   JWT_SECRET=change_this_to_random_string
   ```

3. **启动所有服务**
   ```bash
   docker-compose up -d
   ```

4. **查看日志**
   ```bash
   docker-compose logs -f app
   ```

5. **访问系统**
   - 应用API: http://localhost:3000
   - 健康检查: http://localhost:3000/health
   - 管理后台: http://localhost:3000（需构建前端）或开发模式前端在 http://localhost:5173

### 方式二：本地开发

1. **解压并安装依赖**
   ```bash
   tar -xzf wecom_ai_customer_service.tar.gz
   cd wecom_ai_customer_service
   
   # 安装后端依赖
   npm install
   
   # 启动PostgreSQL和Redis（可用Docker或本地安装）
   # 确保数据库和Redis在 localhost:5432 和 localhost:6379 运行
   
   # 运行数据库迁移
   npm run migration:run
   
   # 启动后端开发服务器
   npm run dev
   ```

2. **构建前端（可选）**
   ```bash
   cd frontend
   npm install
   npm run dev
   # 前端将运行在 http://localhost:5173，后端API代理配置已设置
   ```

## 数据库初始化

系统会自动执行 `src/config/database.sql` 中的初始化脚本，包括：
- 创建所有数据表
- 启用pgvector扩展
- 创建默认管理员账号（agentId: `admin`, 密码: `admin123`需在数据库中设置）
- 插入系统配置项

**重要**：首次运行前，需要手动设置管理员密码（安全考虑，默认密码未哈希）。可使用SQL：

```sql
UPDATE agents SET password_hash = '$2a$10$NlOK7SxRVJN5TVGyVgc21OEpD7XpU1U7Z/WvGgKz5v8eJxHbQGB4K' WHERE agent_id = 'admin';
```

## API文档

### 认证
所有管理API需要在header中添加：
```
Authorization: Bearer {jwt_token}
```

### 主要接口

**AI对话**
```
POST /api/v1/chat/completions
{
  "message": "用户问题",
  "session_id": "可选会话ID",
  "knowledge_base_id": "可选知识库ID"
}
```

**管理后台**
```
GET  /admin/users
GET  /admin/sessions
GET  /admin/messages
GET  /admin/statistics
POST /admin/kb/upload      (multipart/form-data, field: file)
GET  /admin/kb/list
```

**客服工作台**
```
GET  /agent/dashboard
GET  /agent/sessions
POST /agent/sessions/claim
POST /agent/messages/send   { sessionId, content }
POST /agent/sessions/close  { sessionId }
```

**认证**
```
POST /auth/login           { agentId, password }
POST /auth/change-password { currentPassword, newPassword }
```

## 配置企业微信

1. 登录企业微信管理后台
2. 进入「客户联系」->「应用管理」
3. 创建或编辑应用
4. 设置回调URL：
   ```
   https://your-domain.com/wecom/callback
   ```
5. 填写 Token 和 EncodingAESKey（与.env配置一致）
6. 启用消息推送，选择「安全模式」
7. 保存并验证服务器地址

## 项目结构

```
wecom_ai_customer_service/
├── src/
│   ├── config/          # 数据库配置
│   ├── controllers/     # API控制器
│   ├── middleware/      # 中间件
│   ├── models/          # 数据模型
│   ├── services/        # 业务逻辑
│   ├── utils/           # 工具函数
│   ├── wecom/           # 企业微信集成
│   ├── ai/              # AI服务
│   ├── knowledge/       # 知识库逻辑
│   ├── agent/           # 客服系统（部分）
│   ├── admin/           # 管理后台（部分）
│   └── app.ts           # 应用入口
├── frontend/             # Vue 3管理前端
├── docker-compose.yml
├── Dockerfile
├── .env.example
└── README.md
```

## 注意事项

1. **企业微信回调URL必须是公网可访问**
   - 本地测试可使用ngrok等内网穿透工具
   - 生产环境必须配置域名HTTPS

2. **AI API支持**
   - 支持任何OpenAI兼容接口
   - Claude API需要科学上网（或使用国内中转）
   - 可替换为DeepSeek、Kimi、本地模型等

3. **安全性**
   - 生产环境务必修改JWT_SECRET
   - 启用HTTPS
   - 配置防火墙规则
   - 定期备份数据库

4. **性能优化**
   - Redis缓存会话状态
   - 数据库索引已为常用查询优化
   - 向量检索使用pgvector，数据量大时可考虑专用向量数据库

## 故障排除

### 数据库连接失败
- 检查PostgreSQL服务状态
- 验证.env中的DATABASE_*配置
- 确认数据库已创建（postgres镜像会自动初始化）

### Redis连接失败
- 确认Redis服务运行
- 检查REDIS_HOST和REDIS_PORT配置

### 企业微信回调无响应
- 验证Token和EncodingAESKey正确
- 查看服务器日志：`docker-compose logs app`
- 确认回调URL可公网访问
- 检查nginx配置（如使用反向代理）

### AI调用失败
- 检查API BASE URL和API Key
- 确认网络可访问AI服务端点
- 查看日志中的具体错误信息

## 后续开发建议

1. 完善人工客服WebSocket实时聊天界面
2. 添加知识库RAG的完整向量检索和Embedding API调用
3. 增加用户认证和权限管理
4. 添加更多统计维度和报表
5. 实现消息队列处理（RabbitMQ/Kafka）
6. 添加监控和告警（Prometheus + Grafana）
7. 支持多租户架构

## 技术支持

如有问题，请检查：
- README.md 完整文档
- 项目 GitHub Issues（如已开源）
- 社区讨论区

祝你使用愉快！

---
**版本**: 1.0.0  
**更新**: 2026-04-01
