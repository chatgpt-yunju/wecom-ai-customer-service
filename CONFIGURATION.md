# 云君网络API配置指南

## 系统配置要求

本系统使用云君网络（https://api.yunjunet.cn）作为统一的AI服务端点。请确保：

1. 已注册云君网络账号
2. 获取API Key
3. 确认可用的模型名称

## 必需的环境变量

在 `.env` 文件中配置：

```env
# AI API 配置
AI_API_BASE_URL=https://api.yunjunet.cn/v1
AI_API_KEY=your_actual_api_key_here
AI_MODEL=claude-3-opus-20240229
AI_MAX_TOKENS=4000
AI_TEMPERATURE=0.7
```

## 配置说明

| 变量名 | 描述 | 示例值 |
|--------|------|--------|
| `AI_API_BASE_URL` | 固定为云君网络端点 | `https://api.yunjunet.cn/v1` |
| `AI_API_KEY` | 云君网络提供的API密钥 | `sk-xxxxx` |
| `AI_MODEL` | 模型名称 | `claude-3-opus-20240229` |
| `AI_MAX_TOKENS` | 最大生成Token数 | `4000` |
| `AI_TEMPERATURE` | 随机性 (0-1) | `0.7` |

**注意**：`AI_API_BASE_URL` 已固定为云君网络，不可修改。

## 获取API Key

1. 访问 https://api.yunjunet.cn
2. 注册/登录账号
3. 在「API管理」页面创建API Key
4. 复制Key到配置文件中

## 支持的模型

在 `AI_MODEL` 中填写云君网络支持的模型名称，例如：

- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `gpt-4`
- `gpt-3.5-turbo`
- `deepseek-chat`
- `moonshot-v1-8k`

具体支持的模型请查看云君网络文档。

## 故障排除

### API调用失败
- 检查API Key是否正确
- 确认网络可达性（企业内网需放行外网）
- 查看云君网络控制台的用量和错误日志

### 模型不存在
- 确认模型名称拼写正确
- 检查该模型在你的账号中是否可用
- 联系云君网络客服开通权限

### 超时错误
- 调整 `AI_MAX_TOKENS`（过大的值可能导致超时）
- 检查企业网络出口带宽
- 考虑在非高峰时段使用

## 其他配置参考

完整的环境变量配置请参考 `.env.example` 文件。

---
更新: 2026-04-01
