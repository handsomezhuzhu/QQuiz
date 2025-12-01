# QQuiz 部署指南

## 🚀 快速开始

### 方式一：Docker Compose（推荐）

这是最简单的部署方式，适合快速体验和生产环境。

```bash
# 1. 配置环境变量
cp .env.example .env

# 2. 编辑 .env 文件，填入必要配置
# 必填项：
# - SECRET_KEY: JWT 密钥（至少 32 字符）
# - OPENAI_API_KEY: OpenAI API 密钥（或其他 AI 提供商）

# 3. 启动所有服务
docker-compose up -d

# 4. 查看日志
docker-compose logs -f

# 5. 访问应用
# 前端：http://localhost:3000
# 后端：http://localhost:8000
# API 文档：http://localhost:8000/docs
```

### 方式二：本地源码运行

适合开发环境和自定义部署。

#### 前置要求
- Python 3.11+
- Node.js 18+
- PostgreSQL 15+

#### 步骤

**1. 安装并启动 PostgreSQL**

```bash
# macOS
brew install postgresql@15
brew services start postgresql@15

# Ubuntu/Debian
sudo apt install postgresql-15
sudo systemctl start postgresql

# Windows
# 下载并安装 PostgreSQL 官方安装包
```

**2. 创建数据库**

```bash
psql -U postgres
CREATE DATABASE qquiz_db;
CREATE USER qquiz WITH PASSWORD 'qquiz_password';
GRANT ALL PRIVILEGES ON DATABASE qquiz_db TO qquiz;
\q
```

**3. 配置环境变量**

```bash
cp .env.example .env
```

编辑 `.env` 文件：
```env
# 数据库（本地部署）
DATABASE_URL=postgresql+asyncpg://qquiz:qquiz_password@localhost:5432/qquiz_db

# JWT 密钥（必须修改！）
SECRET_KEY=your-very-long-secret-key-at-least-32-characters-long

# AI 提供商（选择一个）
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini

# 或者使用其他提供商
# AI_PROVIDER=anthropic
# ANTHROPIC_API_KEY=sk-ant-your-key
# ANTHROPIC_MODEL=claude-3-haiku-20240307

# AI_PROVIDER=qwen
# QWEN_API_KEY=sk-your-key
# QWEN_MODEL=qwen-plus
```

**4. 启动后端**

```bash
cd backend

# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 安装依赖
pip install -r requirements.txt

# 运行数据库迁移
alembic upgrade head

# 启动服务
uvicorn main:app --reload
```

**5. 启动前端**

打开新终端：

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm start
```

**6. 访问应用**

- 前端：http://localhost:3000
- 后端：http://localhost:8000
- API 文档：http://localhost:8000/docs

---

## 🔐 默认账户

首次启动后，系统会自动创建管理员账户：

- **用户名：** `admin`
- **密码：** `admin123`

⚠️ **重要：** 首次登录后请立即修改密码！

---

## ⚙️ 配置说明

### 必填配置

| 配置项 | 说明 | 示例 |
|--------|------|------|
| `DATABASE_URL` | 数据库连接字符串 | `postgresql+asyncpg://user:pass@host:5432/db` |
| `SECRET_KEY` | JWT 密钥（至少 32 字符） | `your-super-secret-key-change-in-production` |
| `OPENAI_API_KEY` | OpenAI API 密钥 | `sk-...` |

### 可选配置

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `ALLOW_REGISTRATION` | 是否允许用户注册 | `true` |
| `MAX_UPLOAD_SIZE_MB` | 最大上传文件大小（MB） | `10` |
| `MAX_DAILY_UPLOADS` | 每日上传次数限制 | `20` |
| `AI_PROVIDER` | AI 提供商 | `openai` |

### AI 提供商配置

#### OpenAI
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
```

#### Anthropic Claude
```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key
ANTHROPIC_MODEL=claude-3-haiku-20240307
```

#### 通义千问 (Qwen)
```env
AI_PROVIDER=qwen
QWEN_API_KEY=sk-your-key
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
```

---

## 📋 使用流程

### 1. 创建题库

1. 登录后进入「题库管理」
2. 点击「创建题库」
3. 输入题库名称
4. 上传题目文档（支持 TXT/PDF/DOCX/XLSX）
5. 等待 AI 解析完成（状态会自动刷新）

### 2. 追加题目

1. 进入题库详情页
2. 点击「添加题目文档」
3. 上传新文档
4. 系统会自动解析并去重

### 3. 开始刷题

1. 题库状态为「就绪」后，点击「开始刷题」或「继续刷题」
2. 选择答案并提交
3. 查看解析和正确答案
4. 点击「下一题」继续

### 4. 错题本

- 答错的题目会自动加入错题本
- 可以手动添加或移除题目
- 在错题本中复习和巩固

---

## 🛠️ 常见问题

### Q: 文档解析失败？

**A:** 检查以下几点：
1. AI API Key 是否正确配置
2. 文档格式是否支持
3. 文档内容是否包含题目
4. 查看后端日志获取详细错误信息

### Q: 如何修改上传限制？

**A:** 在「系统设置」中修改：
- 最大文件大小
- 每日上传次数

或直接修改 `.env` 文件：
```env
MAX_UPLOAD_SIZE_MB=20
MAX_DAILY_UPLOADS=50
```

### Q: 如何更换 AI 提供商？

**A:** 修改 `.env` 文件中的 `AI_PROVIDER` 和对应的 API Key：
```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-your-key
```

### Q: 如何备份数据？

**A:** 备份 PostgreSQL 数据库：
```bash
# Docker 环境
docker exec qquiz_postgres pg_dump -U qquiz qquiz_db > backup.sql

# 本地环境
pg_dump -U qquiz qquiz_db > backup.sql
```

### Q: 如何关闭用户注册？

**A:** 在「系统设置」中关闭「允许用户注册」，或修改 `.env`：
```env
ALLOW_REGISTRATION=false
```

---

## 📊 生产环境建议

### 安全配置

1. **更改默认密码**
   - 首次登录后立即修改 `admin` 账户密码

2. **生成强密钥**
   ```bash
   # 生成随机密钥
   openssl rand -hex 32
   ```

3. **配置 HTTPS**
   - 使用 Nginx 或 Caddy 作为反向代理
   - 配置 SSL 证书

4. **限制 CORS**
   ```env
   CORS_ORIGINS=https://yourdomain.com
   ```

### 性能优化

1. **数据库连接池**
   - 根据负载调整连接池大小

2. **文件存储**
   - 考虑使用对象存储（如 S3）替代本地存储

3. **缓存**
   - 使用 Redis 缓存频繁查询的数据

### 监控和日志

1. **日志收集**
   ```bash
   # 查看 Docker 日志
   docker-compose logs -f backend

   # 保存日志到文件
   docker-compose logs backend > backend.log
   ```

2. **健康检查**
   - 访问 `http://localhost:8000/health` 检查服务状态

---

## 🐛 故障排查

### 后端无法启动

```bash
# 检查数据库连接
psql -U qquiz -d qquiz_db

# 检查端口占用
lsof -i :8000

# 查看详细日志
uvicorn main:app --reload --log-level debug
```

### 前端无法访问

```bash
# 检查端口占用
lsof -i :3000

# 清除缓存重新安装
rm -rf node_modules package-lock.json
npm install
```

### Docker 容器无法启动

```bash
# 查看容器状态
docker-compose ps

# 查看特定容器日志
docker-compose logs backend

# 重新构建
docker-compose build --no-cache
docker-compose up -d
```

---

## 📞 获取帮助

- GitHub Issues: [报告问题](https://github.com/your-repo/qquiz/issues)
- 文档: [README.md](./README.md)
- API 文档: http://localhost:8000/docs

---

## 📄 许可证

MIT License
