# 企业微信AI客服系统 - API轮询模式

## 🎯 功能

通过企业微信**会话消息API**主动轮询获取新消息并自动AI回复。

**与RPA模式的区别**：
- ✅ 不需要运行企业微信客户端
- ✅ 部署在服务器上
- ✅ 通过企业微信商业版API获取会话消息
- ✅ 更适合生产环境

---

## 🚀 快速开始

```bash
# 1. 解压
tar -xzf wecom_ai_customer_service_main_api.tar.gz
cd wecom_ai_customer_service

# 2. 配置
cp .env.example .env
# 编辑 .env，填写企业微信配置和AI_API_KEY

# 3. 启动（Docker）
docker-compose up -d

# 或本地运行
npm install
npm run build
npm start
```

---

## ⚙️ 核心配置

```env
# 必需
WECOM_CORP_ID=your_corp_id
WECOM_CORP_SECRET=your_corp_secret
WECOM_AGENT_ID=your_agent_id
AI_API_BASE_URL=https://api.yunjunet.cn/v1
AI_API_KEY=your_api_key

# 轮询配置
POLL_ENABLED=true
POLL_INTERVAL=10  # 10秒轮询一次
```

---

## 🔄 工作流程

```
定时器（每10秒） → 调用企业微信API /message/list → 获取新会话 → 
调用 /message/get 获取消息 → AI生成回复 → 调用 /message/send 发送回复
```

---

## 📊 分支选择

| 分支 | 模式 | 适用场景 |
|------|------|----------|
| `main` | API轮询 | 服务器部署，不需要客户端 |
| `RPA` | 桌面监听 | Windows电脑，内网环境 |
| `application` | 应用版本（与main相同） | 备用 |

推荐使用 `main` 分支（API轮询模式）。

---

## 📦 压缩包

`wecom_ai_customer_service_main_api.tar.gz`

---

## 📧 联系

2743319061@qq.com

---

## 📚 相关文档

- **BRANCHES.md** - 分支选择和对比
- **CONFIGURATION.md** - 配置详解
- **DEPLOY_GUIDE.md** - 完整部署指南
- **API_DOCS.md** - 外部API接口文档

---

## 📧 联系

2743319061@qq.com
