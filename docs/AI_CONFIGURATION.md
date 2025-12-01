# AI 提供商配置指南

QQuiz 支持多个 AI 提供商，推荐使用 Google Gemini 以获得最佳的 PDF 解析体验。

## 🌟 推荐：Google Gemini

### 优势

- ✅ **原生 PDF 理解**：直接处理 PDF（最多1000页），完整保留图片、表格、公式
- ✅ **免费额度充足**：每天免费 15 次/分钟，1500 次/天
- ✅ **多模态理解**：支持图片、图表、公式的理解
- ✅ **自定义代理**：支持配置自定义 Base URL 实现 Key 轮训等功能

### 获取 API Key

1. 访问 https://aistudio.google.com/apikey
2. 使用 Google 账号登录
3. 点击 "Create API Key"
4. 复制生成的 API Key（格式：`AIza...`）

### 配置方式

#### 方式一：环境变量配置（推荐首次部署）

编辑 `.env` 文件：

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza-your-actual-gemini-api-key
GEMINI_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-2.0-flash-exp
```

#### 方式二：管理员后台配置（推荐生产环境）

1. 使用管理员账号登录（默认：admin / admin123）
2. 进入"系统设置"
3. 选择 AI 提供商："Google Gemini (推荐)"
4. 填入 API Key
5. 点击"保存所有设置"

**优势**：无需重启服务即可生效，支持在线修改配置

### 自定义 Gemini Base URL（可选）

如果需要使用 Key 轮训服务或代理（例如提高速度、负载均衡），可以配置自定义 Base URL：

```env
# 使用自定义代理服务
GEMINI_BASE_URL=https://your-proxy-service.com/proxy/gemini-self
```

**使用场景**：
- Key 轮训（多个 API Key 负载均衡）
- 国内加速代理
- 自建中转服务

---

## 其他 AI 提供商

### OpenAI (GPT)

**限制**：⚠️ 仅支持文本解析，PDF 文件会通过文本提取处理，丢失图片和格式信息

#### 获取 API Key
- 访问：https://platform.openai.com/api-keys
- 创建新的 Secret Key

#### 配置
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

**推荐模型**：
- `gpt-4o-mini`（推荐，性价比高）
- `gpt-4o`（最强，成本高）
- `gpt-3.5-turbo`（便宜，效果一般）

---

### Anthropic (Claude)

**限制**：⚠️ 仅支持文本解析，PDF 文件会通过文本提取处理，丢失图片和格式信息

#### 获取 API Key
- 访问：https://console.anthropic.com/settings/keys
- 创建新的 API Key

#### 配置
```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
ANTHROPIC_MODEL=claude-3-haiku-20240307
```

**推荐模型**：
- `claude-3-haiku-20240307`（推荐，速度快）
- `claude-3-5-sonnet-20241022`（最强，成本高）
- `claude-3-opus-20240229`（超强，成本很高）

---

### Qwen (通义千问)

**限制**：⚠️ 仅支持文本解析，PDF 文件会通过文本提取处理，丢失图片和格式信息

#### 获取 API Key
- 访问：https://dashscope.console.aliyun.com/apiKey
- 使用阿里云账号登录
- 创建新的 API Key

#### 配置
```env
AI_PROVIDER=qwen
QWEN_API_KEY=sk-your-qwen-api-key
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
```

**推荐模型**：
- `qwen-plus`（推荐，平衡）
- `qwen-max`（最强，成本高）
- `qwen-turbo`（快速，效果一般）
- `qwen-long`（超长文本支持）

---

## AI 提供商对比表

| 提供商 | PDF 原生支持 | 图片/表格/公式 | 文本解析 | 免费额度 | 推荐度 |
|--------|--------------|----------------|----------|----------|--------|
| **Google Gemini** | ✅ 支持 | ✅ 完整保留 | ✅ | ⭐⭐⭐⭐⭐ | 最推荐 |
| OpenAI (GPT) | ❌ 不支持 | ❌ 丢失 | ✅ | 💰 | ⭐⭐⭐⭐ |
| Anthropic (Claude) | ❌ 不支持 | ❌ 丢失 | ✅ | 💰 | ⭐⭐⭐⭐ |
| Qwen (通义千问) | ❌ 不支持 | ❌ 丢失 | ✅ | ✅ | ⭐⭐⭐ |

---

## 常见问题

### Q1: 如何判断 AI 提供商是否配置正确？

上传一个包含题目的文档，如果能成功解析出题目，说明配置正确。查看后端日志可以看到详细的解析过程。

### Q2: 可以同时配置多个 AI 提供商吗？

可以。配置多个提供商的 API Key，通过 `AI_PROVIDER` 环境变量或管理员后台切换使用哪个提供商。

### Q3: Gemini 原生 PDF 处理和文本提取有什么区别？

- **原生 PDF 处理**（Gemini）：AI 直接"看"PDF，能识别图片中的文字、理解表格结构、识别数学公式
- **文本提取**（其他提供商）：先用 PyPDF2/python-docx 提取纯文本，然后交给 AI，丢失所有图片和格式

**示例**：如果试卷中有带图的选择题，Gemini 能理解图片内容并提取题目，其他提供商只能提取文字部分。

### Q4: Gemini 自定义 Base URL 有什么用？

- **场景一**：使用多个 API Key 的轮训服务，避免单个 Key 频率限制
- **场景二**：使用国内加速代理，提高访问速度
- **场景三**：自建中转服务，统一管理和监控 API 调用

**格式要求**：Base URL 应该是完整的域名，例如 `https://your-service.com`，后端会自动拼接 `/v1beta/models/{model}:generateContent`

### Q5: 如果文档中没有提供答案怎么办？

QQuiz 会自动使用 AI 生成参考答案，标注为"AI参考答案："。这个功能对所有 AI 提供商都支持。

---

## 推荐配置方案

### 方案一：仅使用 Gemini（推荐）
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key
```
- ✅ 最佳 PDF 支持
- ✅ 免费额度充足
- ✅ 配置简单

### 方案二：Gemini + OpenAI（备用）
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-key
OPENAI_API_KEY=your-openai-key
```
- 主用 Gemini，当遇到限制时手动切换到 OpenAI

### 方案三：全配置（多选）
配置所有提供商，根据需求灵活切换

---

**推荐流程**：
1. 首次部署：使用 Gemini（免费额度充足）
2. 生产环境：使用管理员后台配置，支持在线切换
3. 高频使用：配置 Gemini 自定义 Base URL 使用 Key 轮训服务
