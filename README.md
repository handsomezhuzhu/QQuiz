# QQuiz - 智能刷题与题库管理平台

QQuiz 是一个支持 Docker/源码双模部署的智能刷题平台，核心功能包括多文件上传、自动去重、异步解析、断点续做和错题本管理。

## 功能特性

- 📚 **多文件上传与去重**: 支持向同一题库追加文档，自动识别并过滤重复题目
- 🤖 **AI 智能解析**: 支持 Google Gemini (推荐) / OpenAI / Anthropic / Qwen 多种 AI 提供商
- 📄 **原生 PDF 理解**: Gemini 支持直接处理 PDF（最多1000页），完整保留图片、表格、公式等内容
- 🎓 **AI 参考答案**: 对于没有提供答案的题目，自动生成 AI 参考答案
- 📊 **断点续做**: 自动记录刷题进度，随时继续
- ❌ **错题本管理**: 自动收集错题，支持手动添加/移除
- 🎯 **多题型支持**: 单选、多选、判断、简答
- 🔐 **权限管理**: 管理员配置、用户隔离
- 📱 **移动端优先**: 完美适配手机端

## 快速开始

### 方式一：Docker Compose (推荐)

```bash
# 1. 克隆项目
git clone <repository-url>
cd QQuiz

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 API Key 等配置

# 3. 启动服务
docker-compose up -d

# 4. 访问应用
# 前端: http://localhost:3000
# 后端: http://localhost:8000
# API 文档: http://localhost:8000/docs
```

### 方式二：本地运行

#### 前置要求
- Python 3.11+
- Node.js 18+
- MySQL 8.0+ 或 Docker (用于运行 MySQL)

**Windows 用户:**
```bash
# 双击运行以下脚本之一：
scripts\fix_and_start.bat          # 推荐：自动修复并启动（支持 Docker/本地数据库）
scripts\start_with_docker_db.bat   # 使用 Docker 数据库启动
scripts\setup.bat                   # 仅配置环境变量
```

**Linux/macOS 用户:**
```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env，修改 DATABASE_URL 为本地数据库地址

# 2. 启动 MySQL
# macOS: brew services start mysql
# Linux: sudo systemctl start mysql

# 3. 运行启动脚本
chmod +x scripts/run_local.sh
./scripts/run_local.sh
```

**MySQL 安装指南：** 详见 [docs/MYSQL_SETUP.md](docs/MYSQL_SETUP.md)

### Docker 构建加速（中国用户）

如果你在中国大陆，Docker 构建速度可能较慢。我们提供了使用国内镜像的可选配置：

**详细指南：** 参见 [docs/CHINA_MIRROR_GUIDE.md](docs/CHINA_MIRROR_GUIDE.md)

**快速使用：**
```bash
# 后端使用中国镜像构建
docker build -f backend/Dockerfile.china -t qquiz-backend ./backend

# 前端使用中国镜像构建
docker build -f frontend/Dockerfile.china -t qquiz-frontend ./frontend
```

构建速度可提升 3-5 倍 ⚡

## 默认账户

**管理员账户:**
- 用户名: `admin`
- 密码: `admin123`

⚠️ **重要**: 首次登录后请立即修改密码！

## 项目结构

```
QQuiz/
├── backend/              # FastAPI 后端
│   ├── alembic/          # 数据库迁移
│   ├── routers/          # API 路由
│   ├── services/         # 业务逻辑
│   ├── models.py         # 数据模型
│   ├── database.py       # 数据库配置
│   ├── main.py           # 应用入口
│   └── requirements.txt  # Python 依赖
├── frontend/             # React 前端
│   ├── src/
│   │   ├── api/          # API 客户端
│   │   ├── pages/        # 页面组件
│   │   ├── components/   # 通用组件
│   │   └── App.jsx       # 应用入口
│   ├── package.json      # Node 依赖
│   └── vite.config.js    # Vite 配置
├── scripts/              # 部署和启动脚本
│   ├── fix_and_start.bat           # Windows 快速启动（推荐）
│   ├── start_with_docker_db.bat    # Docker 数据库启动
│   ├── setup.bat                    # 环境配置脚本
│   ├── run_local.sh                 # Linux/macOS 启动脚本
│   └── [其他辅助脚本...]
├── docs/                 # 文档目录
│   ├── AI_CONFIGURATION.md         # AI 提供商配置指南（重要）
│   ├── MYSQL_SETUP.md              # MySQL 安装配置指南
│   ├── CHINA_MIRROR_GUIDE.md       # 中国镜像加速指南
│   ├── WINDOWS_DEPLOYMENT.md       # Windows 部署详细指南
│   └── PROJECT_STRUCTURE.md        # 项目架构详解
├── test_data/            # 测试数据
│   └── sample_questions.txt        # 示例题目
├── docker-compose.yml    # Docker 编排
├── .env.example          # 环境变量模板
└── README.md             # 项目说明
```

## 核心业务流程

### 1. 创建题库
用户首次上传文档时，创建新的 Exam (题库容器)

### 2. 追加文档
在已有题库详情页点击 "添加题目文档"，上传新文件

### 3. 去重逻辑
- 对题目内容进行标准化处理 (去空格、标点、转小写)
- 计算 MD5 Hash
- 仅在当前题库范围内查询去重
- 仅插入 Hash 不存在的题目

### 4. 异步处理
- 后台任务处理 AI 解析
- 状态: `pending` → `processing` → `ready` / `failed`
- 前端轮询状态，自动刷新

### 5. 刷题体验
- 基于 `current_index` 实现断点续做
- 错题自动加入错题本
- 简答题 AI 评分

## 环境变量说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `DATABASE_URL` | 数据库连接字符串 | - |
| `SECRET_KEY` | JWT 密钥 | - |
| `AI_PROVIDER` | AI 提供商 (gemini/openai/anthropic/qwen) | gemini |
| `GEMINI_API_KEY` | Google Gemini API 密钥 | - |
| `GEMINI_BASE_URL` | Gemini API 地址（可选，支持代理） | https://generativelanguage.googleapis.com |
| `GEMINI_MODEL` | Gemini 模型 | gemini-2.0-flash-exp |
| `OPENAI_API_KEY` | OpenAI API 密钥 | - |
| `OPENAI_BASE_URL` | OpenAI API 地址 | https://api.openai.com/v1 |
| `OPENAI_MODEL` | OpenAI 模型 | gpt-4o-mini |
| `ANTHROPIC_API_KEY` | Anthropic API 密钥 | - |
| `ANTHROPIC_MODEL` | Anthropic 模型 | claude-3-haiku-20240307 |
| `QWEN_API_KEY` | 通义千问 API 密钥 | - |
| `QWEN_BASE_URL` | 通义千问 API 地址 | https://dashscope.aliyuncs.com/compatible-mode/v1 |
| `QWEN_MODEL` | 通义千问模型 | qwen-plus |
| `ALLOW_REGISTRATION` | 是否允许注册 | true |
| `MAX_UPLOAD_SIZE_MB` | 最大上传文件大小 (MB) | 10 |
| `MAX_DAILY_UPLOADS` | 每日上传次数限制 | 20 |

### AI 提供商对比

| 提供商 | PDF 原生支持 | 文本解析 | 推荐度 | 说明 |
|--------|--------------|----------|--------|------|
| **Google Gemini** | ✅ | ✅ | ⭐⭐⭐⭐⭐ | 支持原生 PDF（最多1000页），保留图片、表格、公式 |
| OpenAI | ❌ | ✅ | ⭐⭐⭐⭐ | 仅文本提取，PDF 会丢失格式和图片 |
| Anthropic | ❌ | ✅ | ⭐⭐⭐⭐ | 仅文本提取，PDF 会丢失格式和图片 |
| Qwen (通义千问) | ❌ | ✅ | ⭐⭐⭐ | 仅文本提取，PDF 会丢失格式和图片 |

**推荐使用 Gemini**：如果你的题库包含 PDF 文件（特别是含有图片、公式、表格的学科试卷），强烈推荐使用 Gemini。

### 如何获取 API Key

- **Google Gemini**: https://aistudio.google.com/apikey (免费额度充足)
- **OpenAI**: https://platform.openai.com/api-keys
- **Anthropic**: https://console.anthropic.com/settings/keys
- **Qwen (通义千问)**: https://dashscope.console.aliyun.com/apiKey

### AI 配置方式

QQuiz 支持两种配置方式：

1. **环境变量配置** (`.env` 文件)：适合 Docker 部署和开发环境
2. **数据库配置** (管理员后台)：适合生产环境，支持在线修改，无需重启服务

**推荐流程**：首次部署使用环境变量，部署成功后通过管理员后台修改配置。

**Gemini 自定义代理**: 如果需要使用 Key 轮训服务或代理，可以在管理员后台配置 `GEMINI_BASE_URL`，支持自定义 Gemini API 地址。

## 技术栈

**后端:**
- FastAPI - 现代化 Python Web 框架
- SQLAlchemy 2.0 - 异步 ORM
- Alembic - 数据库迁移
- MySQL 8.0 - 数据库
- aiomysql - MySQL 异步驱动
- Pydantic - 数据验证

**前端:**
- React 18 - UI 框架
- Vite - 构建工具
- Tailwind CSS - 样式框架
- React Router - 路由
- Axios - HTTP 客户端

## 开发进度

- [x] **Step 1**: Foundation & Models ✅
- [ ] **Step 2**: Backend Core Logic
- [ ] **Step 3**: Frontend Config & API
- [ ] **Step 4**: Frontend Complex UI

## License

MIT
