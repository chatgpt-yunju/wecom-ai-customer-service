# 企业微信AI客服系统

一个功能完整的企业微信AI客服系统，集成云君网络AI API，支持消息自动回复、知识库管理、人工转接、多渠道客服等功能。

## ✨ 核心特性

- ✅ **企业微信消息处理** - 支持文本、图片、文件消息自动接收与响应
- ✅ **云君网络AI集成** - 使用 https://api.yunjunet.cn 作为统一AI服务端点
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
# 解压项目包
tar -xzf wecom_ai_yunjun_prod.tar.gz
cd wecom_ai_customer_service

# 复制环境变量模板
cp .env.example .env

# 编辑 .env，填入你的配置（详见下方配置说明）
vim .env
```

### 2. 配置说明

#### **必须配置的变量**

```env
# ========== AI配置 ==========
AI_API_BASE_URL=https://api.yunjunet.cn/v1
AI_API_KEY=your_cloudjun_api_key_here
AI_MODEL=claude-3-opus-20240229

# ========== 企业微信配置 ==========
WECOM_CORP_ID=your_corp_id
WECOM_CORP_SECRET=your_corp_secret
WECOM_TOKEN=your_callback_token
WECOM_ENCODING_AES_KEY=your_encoding_aes_key
WECOM_AGENT_ID=your_agent_id

# ========== 安全配置 ==========
JWT_SECRET=change_this_to_random_strong_secret_min_32_chars
```

### 3. 启动服务

```bash
docker-compose up -d
docker-compose logs -f app
curl http://localhost:3000/health
```

### 4. 配置企业微信回调

1. 企业微信管理后台 → 客户联系 → 应用管理
2. 回调URL: `https://your-domain.com/wecom/callback`
3. Token и EncodingAESKey 与 .env 中配置一致
4. 启用「消息加密」并保存

详细文档请参阅 CONFIGURATION.md 和 DEPLOY_GUIDE.md。

## 📚 文档

- **CONFIGURATION.md** - 云君网络API配置详细说明
- **DEPLOY_GUIDE.md** - 完整部署和运维指南
- **FINAL_DELIVERY.md** - 项目交付总结和功能清单

## 🔧 技术栈

Node.js + Express + TypeScript + PostgreSQL + Redis + Vue 3 + Docker

## 📄 许可证

MIT

---

**最新更新**: 2026-04-01  
**版本**: 1.0.0
