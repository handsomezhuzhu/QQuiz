# QQuiz

QQuiz 是一个面向题库管理与刷题训练的全栈应用，支持文档导入、异步解析、题目去重、断点续做、错题本与管理员配置。

## 界面预览

![QQuiz 界面截图](docs/cover.png)

## 核心能力

- 多文件导入与题目去重
- 异步解析进度回传
- 单选、多选、判断、简答题统一管理
- 刷题进度保存与继续作答
- 错题本与错题练习
- 管理员用户管理与系统配置
- 支持 Gemini / OpenAI / Anthropic / Qwen

## 当前架构

- `backend/`：FastAPI + SQLAlchemy + Alembic
- `web/`：当前主前端，Next.js App Router + TypeScript + Tailwind CSS
- `frontend/`：保留中的 legacy Vite 前端，用于单容器兼容路径

说明：

- 分离部署优先使用 `web/`
- 单容器镜像当前仍复用 `frontend/` 构建静态资源

## 快速开始

### 1. 分离部署，推荐

前端运行在 `3000`，后端运行在 `8000`。

```bash
cp .env.example .env

docker compose up -d --build
```

访问地址：

- 前端：`http://localhost:3000`
- 后端：`http://localhost:8000`
- 后端健康检查：`http://localhost:8000/health`

### 2. 分离部署 + MySQL

```bash
cp .env.example .env

docker compose -f docker-compose.yml -f docker-compose.mysql.yml up -d --build
```

### 3. 单容器部署

单容器模式会把前端静态资源集成到后端服务中，统一通过 `8000` 提供。

```bash
cp .env.example .env

docker compose -f docker-compose-single.yml up -d --build
```

访问地址：

- 应用：`http://localhost:8000`
- API 文档：`http://localhost:8000/docs`

## 本地开发

### 后端

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### 新前端

```bash
cd web
npm install
npm run dev
```

### 旧前端

仅在兼容或迁移场景下需要：

```bash
cd frontend
npm install
npm run dev
```

## 运行要求

- Python 3.11+
- Node.js 18+
- Docker / Docker Compose

## 关键环境变量

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | 数据库连接字符串 |
| `SECRET_KEY` | JWT 密钥，至少 32 位 |
| `ADMIN_PASSWORD` | 默认管理员密码，至少 12 位 |
| `AI_PROVIDER` | `gemini` / `openai` / `anthropic` / `qwen` |
| `GEMINI_API_KEY` | Gemini API Key |
| `OPENAI_API_KEY` | OpenAI API Key |
| `OPENAI_BASE_URL` | OpenAI 或兼容网关地址 |
| `ALLOW_REGISTRATION` | 是否允许注册 |
| `MAX_UPLOAD_SIZE_MB` | 单次上传大小限制 |
| `MAX_DAILY_UPLOADS` | 每日上传次数限制 |

更多示例见 [`.env.example`](.env.example)。

## 目录结构

```text
QQuiz/
├─ backend/                   FastAPI 后端
│  ├─ alembic/                数据库迁移
│  ├─ routers/                API 路由
│  ├─ services/               业务服务
│  ├─ models.py               ORM 模型
│  ├─ schemas.py              Pydantic Schema
│  └─ main.py                 应用入口
├─ web/                       Next.js 前端
│  ├─ src/app/                App Router 页面与 API Route
│  ├─ src/components/         UI 与业务组件
│  └─ src/lib/                前端 API、鉴权、工具
├─ frontend/                  Legacy Vite 前端
├─ docs/                      部署、审计与截图
├─ test_data/                 示例题库文件
├─ docker-compose.yml         前后端分离部署
├─ docker-compose.mysql.yml   MySQL overlay
├─ docker-compose-single.yml  单容器部署
└─ Dockerfile                 单容器镜像构建
```

## 技术栈

### 后端

- FastAPI
- SQLAlchemy 2.x
- Alembic
- SQLite / MySQL
- httpx
- OpenAI / Anthropic SDK

### 前端

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- TanStack Query
- Radix UI / shadcn 风格组件

## 构建检查

常用检查命令：

```bash
cd web && npm run build
docker compose build backend frontend
```

仓库当前没有完整自动化测试套件，提交前至少建议手动验证：

- 登录 / 退出
- 创建题库 / 上传文档 / 查看解析进度
- 刷题与错题加入
- 管理员用户管理与系统设置
- 大数据量列表分页

## 开源协议

本项目采用 [MIT License](LICENSE)。
