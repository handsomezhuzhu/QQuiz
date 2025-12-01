# QQuiz Windows 部署指南

## 🚀 方式一：Docker Desktop（推荐）

这是 Windows 上最简单的部署方式。

### 前置要求

1. **安装 Docker Desktop**
   - 下载地址：https://www.docker.com/products/docker-desktop/
   - 系统要求：Windows 10/11 64-bit (Pro/Enterprise/Education)
   - 需要启用 WSL 2

2. **启用 WSL 2**（如果未启用）
   ```powershell
   # 以管理员身份运行 PowerShell
   wsl --install
   # 重启计算机
   ```

### 部署步骤

#### 1. 配置环境变量

```powershell
# 在项目根目录（E:\QQuiz）打开 PowerShell
cd E:\QQuiz

# 复制环境变量模板
copy .env.example .env

# 使用记事本编辑 .env
notepad .env
```

**必须修改的配置：**

```env
# JWT 密钥（必须修改！至少 32 字符）
SECRET_KEY=your-very-long-secret-key-change-this-to-something-secure

# 选择一个 AI 提供商并配置 API Key

# 方案 1: 使用 OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini

# 方案 2: 使用通义千问（国内推荐）
# AI_PROVIDER=qwen
# QWEN_API_KEY=sk-your-qwen-api-key
# QWEN_MODEL=qwen-plus

# 方案 3: 使用 Claude
# AI_PROVIDER=anthropic
# ANTHROPIC_API_KEY=sk-ant-your-key
# ANTHROPIC_MODEL=claude-3-haiku-20240307
```

#### 2. 启动 Docker Desktop

- 打开 Docker Desktop 应用
- 等待 Docker Engine 启动（底部状态显示 "Running"）

#### 3. 启动服务

```powershell
# 在项目根目录
cd E:\QQuiz

# 启动所有服务（第一次会比较慢，需要下载镜像）
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 4. 访问应用

- **前端**: http://localhost:3000
- **后端 API**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs

#### 5. 默认账户登录

- **用户名**: `admin`
- **密码**: `admin123`

⚠️ **首次登录后请立即修改密码！**

### 常用 Docker 命令

```powershell
# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 停止服务
docker-compose stop

# 重启服务
docker-compose restart

# 停止并删除容器
docker-compose down

# 重新构建并启动
docker-compose up -d --build

# 进入容器内部
docker-compose exec backend bash
docker-compose exec postgres psql -U qquiz qquiz_db
```

### 问题排查

#### 问题 1: Docker Desktop 无法启动

**解决方案：**
```powershell
# 确保 WSL 2 已安装
wsl --list --verbose

# 如果版本是 1，升级到 2
wsl --set-version Ubuntu 2

# 设置默认版本为 2
wsl --set-default-version 2
```

#### 问题 2: 端口被占用

```powershell
# 查看端口占用
netstat -ano | findstr :3000
netstat -ano | findstr :8000
netstat -ano | findstr :5432

# 结束占用进程（替换 PID）
taskkill /F /PID <进程ID>
```

#### 问题 3: 容器启动失败

```powershell
# 查看详细错误日志
docker-compose logs backend

# 重新构建
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## 🛠️ 方式二：本地源码部署

适合开发调试，需要手动安装各种依赖。

### 前置要求

1. **Python 3.11+**
   - 下载：https://www.python.org/downloads/
   - 安装时勾选 "Add Python to PATH"

2. **Node.js 18+**
   - 下载：https://nodejs.org/
   - 推荐安装 LTS 版本

3. **PostgreSQL 15+**
   - 下载：https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
   - 记住安装时设置的密码

### 部署步骤

#### 1. 安装 PostgreSQL

1. 下载并安装 PostgreSQL 15
2. 安装完成后，打开 **pgAdmin 4** 或 **SQL Shell (psql)**

3. 创建数据库：

```sql
-- 使用 psql 或 pgAdmin 执行
CREATE DATABASE qquiz_db;
CREATE USER qquiz WITH PASSWORD 'qquiz_password';
GRANT ALL PRIVILEGES ON DATABASE qquiz_db TO qquiz;
```

#### 2. 配置环境变量

```powershell
cd E:\QQuiz
copy .env.example .env
notepad .env
```

**修改数据库连接为本地：**

```env
# 数据库（本地部署）
DATABASE_URL=postgresql+asyncpg://qquiz:qquiz_password@localhost:5432/qquiz_db

# JWT 密钥
SECRET_KEY=your-super-secret-key-at-least-32-characters-long

# AI 配置（选择一个）
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini
```

#### 3. 启动后端

**打开第一个 PowerShell 窗口：**

```powershell
cd E:\QQuiz\backend

# 创建虚拟环境
python -m venv venv

# 激活虚拟环境
.\venv\Scripts\Activate.ps1

# 如果遇到执行策略错误，运行：
# Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 安装依赖
pip install -r requirements.txt

# 运行数据库迁移
alembic upgrade head

# 启动后端服务
uvicorn main:app --reload
```

**成功后会看到：**
```
INFO:     Uvicorn running on http://127.0.0.1:8000
INFO:     Application startup complete.
```

#### 4. 启动前端

**打开第二个 PowerShell 窗口：**

```powershell
cd E:\QQuiz\frontend

# 安装依赖（第一次需要）
npm install

# 启动开发服务器
npm start
```

**成功后会自动打开浏览器：**
```
VITE v5.0.11  ready in 1234 ms

➜  Local:   http://localhost:3000/
➜  Network: use --host to expose
```

#### 5. 访问应用

- **前端**: http://localhost:3000
- **后端**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs

### 问题排查

#### 问题 1: PowerShell 执行策略错误

```powershell
# 错误信息：无法加载文件 xxx.ps1，因为在此系统上禁止运行脚本

# 解决方案：
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# 然后重新激活虚拟环境
.\venv\Scripts\Activate.ps1
```

#### 问题 2: pip 安装依赖失败

```powershell
# 使用国内镜像加速
pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

#### 问题 3: PostgreSQL 连接失败

```powershell
# 确认 PostgreSQL 服务正在运行
# 打开 "服务" (services.msc)
# 找到 "postgresql-x64-15"，确保状态为 "正在运行"

# 或使用命令行
sc query postgresql-x64-15
```

#### 问题 4: npm 安装慢

```powershell
# 使用淘宝镜像
npm config set registry https://registry.npmmirror.com

# 然后重新安装
npm install
```

---

## 🧪 测试部署是否成功

### 1. 检查后端健康状态

浏览器访问：http://localhost:8000/health

**预期返回：**
```json
{"status": "healthy"}
```

### 2. 查看 API 文档

访问：http://localhost:8000/docs

应该能看到 Swagger UI 界面，显示所有 API 接口。

### 3. 测试登录

1. 访问 http://localhost:3000
2. 使用默认账户登录：
   - 用户名：`admin`
   - 密码：`admin123`
3. 成功后应该进入 Dashboard

### 4. 测试创建题库

1. 点击「题库管理」
2. 点击「创建题库」
3. 输入题库名称
4. 上传测试文档（可以创建一个简单的 TXT 文件）

**测试文档示例 (test_questions.txt):**
```txt
1. Python 是一种什么类型的语言？
A. 编译型语言
B. 解释型语言
C. 汇编语言
D. 机器语言
答案：B
解析：Python 是一种解释型、面向对象的高级编程语言。

2. 以下哪个不是 Python 的数据类型？
A. list
B. tuple
C. array
D. dict
答案：C
解析：Python 内置的数据类型包括 list、tuple、dict 等，array 需要导入 array 模块。
```

5. 上传后等待解析完成（状态会从「处理中」变为「就绪」）
6. 点击「开始刷题」测试刷题功能

---

## 📝 Windows 特定配置

### 1. 设置环境变量（可选）

**通过 GUI 设置：**
1. 右键「此电脑」→「属性」
2. 「高级系统设置」→「环境变量」
3. 在「用户变量」中添加：
   - `OPENAI_API_KEY`: 你的 API Key
   - `SECRET_KEY`: 你的密钥

### 2. 配置防火墙（如果需要局域网访问）

```powershell
# 允许端口访问（以管理员身份运行）
netsh advfirewall firewall add rule name="QQuiz Frontend" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="QQuiz Backend" dir=in action=allow protocol=TCP localport=8000
```

### 3. 创建启动脚本

**创建 `start.bat` 文件：**

```batch
@echo off
echo Starting QQuiz...

REM 检查 Docker Desktop 是否运行
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo Starting Docker Desktop...
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
    timeout /t 10
)

REM 启动服务
cd /d "%~dp0"
docker-compose up -d

echo.
echo QQuiz is starting...
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo.
pause
```

**使用方法：**
- 双击 `start.bat` 即可启动服务

---

## 🎯 性能优化建议

### 1. Docker Desktop 配置

1. 打开 Docker Desktop
2. 设置 → Resources
3. 调整资源分配：
   - **CPUs**: 4 核（推荐）
   - **Memory**: 4 GB（推荐）
   - **Swap**: 1 GB
   - **Disk image size**: 60 GB

### 2. WSL 2 优化

**限制 WSL 2 内存占用（可选）：**

创建 `%USERPROFILE%\.wslconfig` 文件：

```ini
[wsl2]
memory=4GB
processors=4
swap=1GB
```

重启 WSL：
```powershell
wsl --shutdown
```

### 3. 开发工具推荐

- **代码编辑器**: VS Code（安装 Python、ESLint、Prettier 插件）
- **API 测试**: Postman 或 Insomnia
- **数据库管理**: pgAdmin 4 或 DBeaver
- **终端**: Windows Terminal（更好的 PowerShell 体验）

---

## 🔧 常见问题汇总

### Q: 如何完全重置项目？

```powershell
# Docker 方式
docker-compose down -v  # 删除容器和数据卷
docker-compose up -d    # 重新启动

# 本地方式
# 1. 删除数据库
DROP DATABASE qquiz_db;
CREATE DATABASE qquiz_db;
# 2. 重新运行迁移
cd E:\QQuiz\backend
alembic upgrade head
```

### Q: 如何查看日志？

```powershell
# Docker 方式
docker-compose logs -f backend
docker-compose logs -f frontend

# 本地方式
# 直接在运行的 PowerShell 窗口中查看
```

### Q: 如何停止服务？

```powershell
# Docker 方式
docker-compose stop

# 本地方式
# 在运行的 PowerShell 窗口中按 Ctrl+C
```

### Q: 如何更新代码后重启？

```powershell
# Docker 方式
docker-compose restart

# 本地方式（uvicorn 和 vite 会自动重载）
# 无需操作，保存文件后自动刷新
```

---

## 📞 获取帮助

如果遇到问题：

1. **查看日志**: `docker-compose logs -f`
2. **检查文档**: 阅读 `DEPLOYMENT.md`
3. **查看 API 文档**: http://localhost:8000/docs
4. **GitHub Issues**: 提交问题报告

---

祝你部署顺利！🎉
