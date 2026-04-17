# QQuiz

QQuiz 是一个用于题库导入、刷题训练和错题管理的全栈应用，支持文档解析、题目去重、断点续做、管理员配置和多模型接入。

![QQuiz 界面截图](docs/cover.png)

## 功能

- 文档导入：支持 TXT / PDF / DOC / DOCX / XLS / XLSX
- 异步解析：后台解析文档并回传进度
- 题目去重：同题库内自动去重
- 刷题与续做：记录当前进度，支持继续作答
- 错题本：自动收集错误题目
- 管理后台：用户管理、系统配置、模型配置
- AI 提供商：Gemini / OpenAI / Anthropic / Qwen

## 快速开始

### 方式一：直接运行 GitHub Actions 构建好的镜像

适合只想快速启动，不想先克隆仓库。

#### 1. 下载环境变量模板

Linux / macOS:

```bash
curl -L https://raw.githubusercontent.com/handsomezhuzhu/QQuiz/main/.env.example -o .env
```

Windows PowerShell:

```powershell
Invoke-WebRequest `
  -Uri "https://raw.githubusercontent.com/handsomezhuzhu/QQuiz/main/.env.example" `
  -OutFile ".env"
```

#### 2. 编辑 `.env`

至少填写以下字段：

```env
SECRET_KEY=replace-with-a-random-32-char-secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=replace-with-a-strong-password

AI_PROVIDER=gemini
GEMINI_API_KEY=your-real-gemini-api-key
```

如果你不用 Gemini，也可以改成：

- `AI_PROVIDER=openai` 并填写 `OPENAI_API_KEY`
- `AI_PROVIDER=anthropic` 并填写 `ANTHROPIC_API_KEY`
- `AI_PROVIDER=qwen` 并填写 `QWEN_API_KEY`

#### 3. 拉取镜像

```bash
docker pull ghcr.io/handsomezhuzhu/qquiz-backend:latest
docker pull ghcr.io/handsomezhuzhu/qquiz-frontend:latest
```

#### 4. 创建网络和数据卷

```bash
docker network create qquiz_net
docker volume create qquiz_sqlite_data
docker volume create qquiz_upload_files
```

#### 5. 启动后端

```bash
docker run -d \
  --name qquiz_backend \
  --network qquiz_net \
  --env-file .env \
  -e DATABASE_URL=sqlite+aiosqlite:////app/data/qquiz.db \
  -e UPLOAD_DIR=/app/uploads \
  -v qquiz_sqlite_data:/app/data \
  -v qquiz_upload_files:/app/uploads \
  -p 8000:8000 \
  ghcr.io/handsomezhuzhu/qquiz-backend:latest
```

#### 6. 启动前端

```bash
docker run -d \
  --name qquiz_frontend \
  --network qquiz_net \
  -e API_BASE_URL=http://qquiz_backend:8000 \
  -p 3000:3000 \
  ghcr.io/handsomezhuzhu/qquiz-frontend:latest
```

访问：

- 前端：`http://localhost:3000`
- 后端：`http://localhost:8000`

停止：

```bash
docker rm -f qquiz_frontend qquiz_backend
```

### 方式二：从源码用 Docker Compose 启动

#### 前后端分离，推荐

```bash
cp .env.example .env
docker compose up -d --build
```

访问：

- 前端：`http://localhost:3000`
- 后端：`http://localhost:8000`

#### 使用 MySQL

```bash
cp .env.example .env
docker compose -f docker-compose.yml -f docker-compose.mysql.yml up -d --build
```

#### 单容器模式

```bash
cp .env.example .env
docker compose -f docker-compose-single.yml up -d --build
```

访问：

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

### 前端

当前主前端在 `web/`：

```bash
cd web
npm install
npm run dev
```

说明：

- `web/` 是当前主前端，基于 Next.js
- `frontend/` 是保留中的旧 Vite 前端，主要用于单容器兼容路径

## 关键环境变量

| 变量 | 说明 |
| --- | --- |
| `DATABASE_URL` | 数据库连接字符串 |
| `SECRET_KEY` | JWT 密钥，至少 32 位 |
| `ADMIN_USERNAME` | 默认管理员用户名 |
| `ADMIN_PASSWORD` | 默认管理员密码，至少 12 位 |
| `AI_PROVIDER` | `gemini` / `openai` / `anthropic` / `qwen` |
| `GEMINI_API_KEY` | Gemini API Key |
| `OPENAI_API_KEY` | OpenAI API Key |
| `OPENAI_BASE_URL` | OpenAI 或兼容网关地址 |
| `ANTHROPIC_API_KEY` | Anthropic API Key |
| `QWEN_API_KEY` | Qwen API Key |
| `ALLOW_REGISTRATION` | 是否允许注册 |
| `MAX_UPLOAD_SIZE_MB` | 单次上传大小限制 |
| `MAX_DAILY_UPLOADS` | 每日上传次数限制 |

完整模板见 [`.env.example`](.env.example)。

## 项目结构

```text
QQuiz/
├─ backend/                   FastAPI 后端
├─ web/                       Next.js 前端
├─ frontend/                  Legacy Vite 前端
├─ docs/                      文档与截图
├─ test_data/                 示例题库文件
├─ docker-compose.yml         前后端分离部署
├─ docker-compose.mysql.yml   MySQL overlay
├─ docker-compose-single.yml  单容器部署
└─ Dockerfile                 单容器镜像构建
```

## 技术栈

- 后端：FastAPI、SQLAlchemy、Alembic、SQLite / MySQL、httpx
- 前端：Next.js 14、React 18、TypeScript、Tailwind CSS、TanStack Query

## 提交前建议检查

```bash
cd web && npm run build
docker compose build backend frontend
```

建议至少手动验证：

- 登录 / 退出
- 创建题库 / 上传文档 / 查看解析进度
- 刷题 / 续做 / 错题加入
- 管理员配置
- 大数据量列表分页

## 开源协议

本项目采用 [MIT License](LICENSE)。
