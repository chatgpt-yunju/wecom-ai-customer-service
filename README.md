# 企业微信AI客服系统

一个功能完整的企业微信AI客服系统，集成云君网络AI API，支持消息自动回复、外部API私信接口、知识库管理、人工转接、多渠道客服等功能。

## ✨ 核心特性

- ✅ **企业微信消息处理** - 支持文本、图片、文件消息自动接收与响应
- ✅ **云君网络AI集成** - 使用 https://api.yunjunet.cn 作为统一AI服务端点
- ✅ **外部API私信接口** - 通过REST API主动发送企业微信私信
- ✅ **知识库系统** - 文档上传（PDF/Word/TXT/Markdown）、RAG检索增强
- ✅ **会话管理** - Redis缓存、历史记录、状态跟踪
- ✅ **人工客服转接** - 会话分配、WebSocket实时聊天
- ✅ **完整管理后台** - Vue 3 + Element Plus界面
- ✅ **Docker部署** - 一键启动所有服务

## 🚀 快速开始

### 环境要求

- Docker & Docker Compose
- 企业微信企业ID、Secret、Token、EncodingAESKey、AgentID
- 云君网络API Key (https://api.yunjunet.cn)

### 1. 解压并配置

```bash
tar -xzf wecom_ai_api_feature.tar.gz
cd wecom_ai_customer_service
cp .env.example .env
# 编辑 .env 填入配置
```

### 2. 关键配置

```env
# AI配置（云君网络）
AI_API_BASE_URL=https://api.yunjunet.cn/v1
AI_API_KEY=your_cloudjun_api_key
AI_MODEL=claude-3-opus-20240229

# 企业微信配置
WECOM_CORP_ID=your_corp_id
WECOM_CORP_SECRET=your_corp_secret
WECOM_TOKEN=your_callback_token
WECOM_ENCODING_AES_KEY=your_encoding_aes_key
WECOM_AGENT_ID=your_agent_id

# 外部API密钥
API_KEY=your_external_api_key

# JWT密钥（务必修改）
JWT_SECRET=change_this_to_random_strong_secret_min_32_chars
```

### 3. 启动

```bash
docker-compose up -d
docker-compose logs -f app
curl http://localhost:3000/health
```

### 4. 配置企业微信

企业微信管理后台 → 客户联系 → 应用管理：
- 回调URL: `https://your-domain.com/wecom/callback`
- Token 和 EncodingAESKey 与 .env 一致
- 启用「消息加密」

---

## 📚 文档

- **API_DOCS.md** - 外部API接口文档（发送私信）
- **CONFIGURATION.md** - 云君网络API配置详细说明
- **DEPLOY_GUIDE.md** - 完整部署和运维指南
- **FINAL_DELIVERY.md** - 项目交付总结和功能清单
- **QUICKSTART.md** - 快速开始指南

---

## 🔧 技术栈

| 组件 | 技术 |
|------|------|
| 后端框架 | Node.js + Express + TypeScript |
| 数据库 | PostgreSQL + pgvector |
| 缓存 | Redis |
| ORM | TypeORM |
| 前端 | Vue 3 + Element Plus + Vite |
| 部署 | Docker + Docker Compose |
| AI服务 | 云君网络API (OpenAI兼容) |

---

## 📄 许可证

MIT

---

## 📧 联系我们

如有问题或建议，欢迎联系：

- **邮箱**: 2743319061@qq.com
- **GitHub**: https://github.com/chatgpt-yunju/wecom-ai-customer-service

---

**最新更新**: 2026-04-01  
**版本**: 1.0.0

---

## 🌿 分支说明

- **main** - 主分支，包含最新功能（外部API私信接口）
- **old-branch** - 历史分支，保存最初版本（仅核心功能，无外部API）

---
更新: 2026-04-01
