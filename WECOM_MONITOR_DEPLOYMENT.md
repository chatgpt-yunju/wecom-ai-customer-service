# 企业微信桌面监听器部署完整指南

## 📦 交付物

```
wecom_monitor_desktop_client_v1.0.tar.gz (6.6KB)
```

解压后结构：
```
wecom_monitor/
├── src/
│   ├── WeComMonitor.ts
│   ├── DatabaseWatcher.ts
│   ├── AIResponder.ts
│   ├── MessageSender.ts
│   └── utils/
│       ├── logger.ts
│       └── path.ts
├── config.yaml.example
├── package.json
├── tsconfig.json
├── README.md
└── USAGE.md
```

---

## 🚀 部署步骤

### 1. 系统要求

- Windows 10/11
- 企业微信客户端已安装并登录
- Node.js 18+
- 云君网络API Key

### 2. 解压并安装依赖

```powershell
tar -xzf wecom_monitor_desktop_client_v1.0.tar.gz
cd wecom_monitor
npm install
```

### 3. 配置

```powershell
copy config.yaml.example config.yaml
notepad config.yaml
```

配置示例：
```yaml
wechat_db_path: "AUTO_DETECT"
ai:
  api_base_url: "https://api.yunjunet.cn/v1"
  api_key: "your_api_key_here"
  model: "claude-3-opus-20240229"
wecom:
  corp_id: "your_corp_id"
  corp_secret: "your_corp_secret"
  agent_id: 123456
monitor:
  poll_interval: 3000
  ignore_self: true
```

### 4. 运行

```powershell
npm start
```

---

## 🎯 功能说明

- ✅ 自动监听企业微信桌面客户端新消息
- ✅ AI自动回复（调用云君网络API）
- ✅ 自动过滤自己发送的消息
- ✅ 支持用户ID白名单过滤
- ✅ 自动检测数据库路径

---

## 📧 联系

2743319061@qq.com
