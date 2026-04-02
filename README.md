# 企业微信AI客服系统 (OpenClaw Skill Edition)

一个功能完整的企业微信AI客服系统，集成云君网络AI API，支持消息自动回复、外部API私信接口、知识库管理、人工转接、多渠道客服等功能。

## 🆕 OpenClaw Skill 支持

该项目已重构为 **OpenClaw Skill**，提供标准化的技能接口，可被 OpenClaw 运行时加载和管理。

- ✅ **IOpenClawSkill 接口** - 完整的技能合约实现
- ✅ **双模式运行** - 支持独立运行（monolithic）或作为 skill 加载
- ✅ **Channel 系统集成** - 可扩展的多通道消息路由（WeCom、Webhook、WebSocket）
- ✅ **配置即代码** - 声明式配置，支持环境变量和文件
- ✅ **易于集成** - 清晰的接口和事件模型

更多细节请查看 [SKILL.md](./SKILL.md) 和 [CHANNEL.md](./CHANNEL.md)。

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

#### 方式一：Docker Compose（推荐用于生产）

```bash
docker-compose up -d
docker-compose logs -f app
curl http://localhost:3000/health
```

#### 方式二：直接运行（开发/测试）

```bash
# 安装依赖
npm install

# 构建 TypeScript
npm run build

# 运行（单体模式 - 完整服务器）
npm start

# 或运行 Skill 模式（OpenClaw 运行时）
OPENCLAW_RUNTIME=true npm run skill

# 或运行 Skill 模式（独立HTTP服务器，用于测试）
npm run skill
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
- **SKILL.md** - OpenClaw Skill 使用指南（接口、配置、部署）
- **CHANNEL.md** - OpenClaw Channel 系统架构和扩展

---

## 🔧 技术栈

| 组件 | 技术 |
|------|------|
| **后端框架** | Node.js + Express + TypeScript |
| **数据库** | PostgreSQL + pgvector (向量检索) |
| **缓存** | Redis |
| **ORM** | TypeORM |
| **前端** | Vue 3 + Element Plus + Vite |
| **部署** | Docker + Docker Compose |
| **AI服务** | 云君网络API / OpenAI兼容端点 |
| **OpenClaw** | Skill 接口 + Channel 系统 |
| **实时通信** | WebSocket (ws) |
| **文档处理** | pdf-parse, mammoth |

### OpenClaw 集成

```
IOpenClawSkill 接口实现
├── initialize(config): Promise<void>
├── start(): Promise<void>
├── stop(): Promise<void>
├── onMessageReceived(event): Promise<MessageResponse>
├── getCapabilities(): Promise<SkillCapabilities>
└── healthCheck(): Promise<HealthStatus>
```

**Channel 系统**:
- `IChannelProvider` - 通道提供者接口
- `IChannelManager` - 通道管理器（注册、路由、事件）
- `ISkillChannelAdapter` - Skill 与 Channel 桥接

支持通道类型：`wecom`、`webhook`、`websocket`

---

## 📄 许可证

MIT

---

## 📧 联系我们

如有问题或建议，欢迎联系：

- **邮箱**: 2743319061@qq.com
- **GitHub**: https://github.com/chatgpt-yunju/wecom-ai-customer-service

---

**最新更新**: 2026-04-02  
**版本**: 2.0.0 (OpenClaw Skill Edition)

---

## 🌿 分支说明

| 分支 | 说明 | 状态 |
|------|------|------|
| **openclaw-channel** | **推荐** - 完整 OpenClaw Skill + Channel 系统，支持多渠道集成 | ✅ 活跃 |
| **openclaw-skill** | 基础 OpenClaw Skill 封装（无 Channel 系统） | ✅ 稳定 |
| **main** | 原始主分支（已重命名为 API-loop） | 📦 归档 |
| **API-loop** | 原 main 分支重命名，保留 API 轮询功能 | 📦 归档 |

### 分支选择指南

- **新项目** → 使用 `openclaw-channel` 分支（功能最全）
- **仅需 Skill 接口** → 使用 `openclaw-skill` 分支（轻量）
- **兼容旧部署** → 使用 `API-loop` 分支（仅维护）

如何切换：
```bash
git checkout openclaw-channel
```

### 分支历史

1. `openclaw-skill` - 2025-04-02: 首次封装为 OpenClaw Skill
2. `openclaw-channel` - 2025-04-02: 基于 openclaw-skill 增加 Channel 系统
3. `API-loop` - 原 main 分支重命名，保持 API 轮询模式

---
更新: 2026-04-01
