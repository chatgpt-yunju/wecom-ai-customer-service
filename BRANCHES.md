# 分支说明

本项目提供多种部署模式的独立分支：

## 分支概览

| 分支 | 模式 | 说明 | 推荐场景 |
|------|------|------|----------|
| **main** | 🆕 API轮询模式 | 通过企业微信API主动轮询获取会话消息 | ✅ 服务器部署，无需回调URL |
| **server** | 服务端回调模式 | 企业微信回调URL推送消息 | 有公网域名，标准集成 |
| **RPA** | 桌面监听模式 | 监听WeChatWork.exe本地数据库 | Windows内网环境 |
| **application** | 应用版本 | 完整应用功能（与main一致） | 备用分支 |
| **old-branch** | 历史归档 | 最初版本（基础功能） | 历史参考 |

---

## 🎯 如何选择？

### 推荐使用 `main` 分支（API轮询模式）

**优势**：
- ✅ 不需要公网域名（无需回调URL）
- ✅ 主动轮询，消息及时
- ✅ 纯服务器部署，无需客户端
- ✅ 功能完整，包含API私信接口

**适用**：生产环境、服务器部署、无公网IP

### 何时使用 `server` 分支？

**特点**：
- 需要配置企业微信回调URL
- 企业微信主动推送消息
- 需要公网可访问的域名

**适用**：标准企业微信集成、有公网域名

### 何时使用 `RPA` 分支？

**特点**：
- 监听本地企业微信客户端数据库
- 不需要企业微信API权限
- 必须在Windows电脑上运行

**适用**：内网环境、快速测试、无API权限

---

## 📥 下载对应分支

```bash
# API轮询模式（推荐）
git clone https://github.com/chatgpt-yunju/wecom-ai-customer-service.git
cd wecom-ai-customer-service
# 默认就是 main 分支

# 服务端回调模式
git clone -b server https://github.com/chatgpt-yunju/wecom-ai-customer-service.git

# RPA桌面监听模式
git clone -b RPA https://github.com/chatgpt-yunju/wecom-ai-customer-service.git
```

---

## 🔄 切换分支

```bash
# 查看所有分支
git branch -a

# 切换到 server 分支
git checkout server

# 切换到 main 分支
git checkout main
```

---

## 📦 压缩包对应关系

| 压缩包 | 对应分支 | 内容 |
|--------|----------|------|
| `wecom_ai_customer_service_api_polling_mode.tar.gz` | `main` | API轮询模式（最新） |
| `wecom_ai_customer_service_v1.0_final.tar.gz` | `server` | 服务端回调模式 |
| `wecom_monitor_desktop_client_v1.0.tar.gz` | `RPA` | 桌面监听模式 |

---

## ⚡ 快速选择指南

```
你有公网域名吗？
├─ 是 → 使用 server 分支（回调模式）
└─ 否 → 你有服务器吗？
   ├─ 是 → 使用 main 分支（API轮询模式，推荐⭐）
   └─ 否 → 使用 RPA 分支（桌面监听）
```

---

**推荐**: 大多数场景使用 `main` 分支（API轮询模式）即可满足需求。

最后更新: 2026-04-01
