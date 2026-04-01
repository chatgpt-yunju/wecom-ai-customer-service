# 企业微信桌面客户端消息监听 + AI自动回复

监听企业微信Windows客户端（WeChatWork.exe）的最新私信，自动调用云君网络AI API生成回复。

---

## 🚀 快速开始

```powershell
# 1. 解压
tar -xzf wecom_monitor_desktop_client_v1.0.tar.gz
cd wecom_monitor

# 2. 安装依赖
npm install

# 3. 配置
copy config.yaml.example config.yaml
# 编辑 config.yaml，填写 API_KEY 和 wecom 配置

# 4. 运行
npm start
```

---

## ⚙️ 配置

`config.yaml` 必需配置：

```yaml
wechat_db_path: "AUTO_DETECT"  # 自动查找企业微信数据库
ai:
  api_key: "your_yunjunet_api_key"  # 云君网络API Key
wecom:
  corp_id: "your_corp_id"      # 企业微信企业ID
  corp_secret: "your_secret"   # 企业微信Secret
  agent_id: 123456             # 应用AgentID
```

---

## 🔍 工作原理

1. 监听 `%APPDATA%\Tencent\WeChatWork\wxwork_localstorage\*\message` SQLite数据库
2. 轮询查询新消息（文本消息）
3. 调用云君网络AI API生成回复
4. 通过企业微信API发送回复

---

## 📁 文件清单

```
wecom_monitor/
├── src/
│   ├── WeComMonitor.ts      # 主监控器
│   ├── DatabaseWatcher.ts   # SQLite轮询
│   ├── AIResponder.ts       # AI回复
│   ├── MessageSender.ts     # 消息发送
│   └── utils/
│       ├── logger.ts        # 日志
│       └── path.ts          # 路径检测
├── config.yaml.example
├── package.json
├── tsconfig.json
├── README.md
└── USAGE.md
```

---

## 📝 详细使用

请查看 `USAGE.md` 完整使用指南。

---

## 📄 许可证

MIT

---

📧 联系: 2743319061@qq.com
