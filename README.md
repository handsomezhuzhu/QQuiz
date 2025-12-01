# QQuiz - 智能刷题与题库管理平台

QQuiz 是一个支持 Docker/源码双模部署的智能刷题平台，核心功能包括多文件上传、自动去重、异步解析、断点续做和错题本管理。

## 功能特性

- 📚 **多文件上传与去重**: 支持向同一题库追加文档，自动识别并过滤重复题目
- 🤖 **AI 智能解析**: 支持 OpenAI/Anthropic/Qwen 多种 AI 提供商
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
│   └── run_local.sh                 # Linux/macOS 启动脚本
├── docs/                 # 文档目录
│   ├── QUICK_START.md              # 快速入门指南
│   ├── WINDOWS_DEPLOYMENT.md       # Windows 部署指南
│   ├── DOCKER_MIRROR_SETUP.md      # Docker 镜像加速配置
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
| `AI_PROVIDER` | AI 提供商 (openai/anthropic/qwen) | openai |
| `OPENAI_API_KEY` | OpenAI API 密钥 | - |
| `ALLOW_REGISTRATION` | 是否允许注册 | true |
| `MAX_UPLOAD_SIZE_MB` | 最大上传文件大小 (MB) | 10 |
| `MAX_DAILY_UPLOADS` | 每日上传次数限制 | 20 |

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
