# MySQL 可选配置指南

QQuiz 默认部署路径是单容器 + SQLite。README、根目录 `Dockerfile`、`docker-compose-single.yml` 和 GitHub Actions 发布镜像都围绕这个模式设计。

只有在你明确需要把数据库独立出去时，才需要 MySQL。常见原因：

- 需要多个应用实例共享同一数据库
- 已有 MySQL 运维体系
- 希望把应用容器和数据库生命周期分开

## 场景一：源码部署时附加 MySQL 容器

这是当前最直接的 MySQL 用法，适合你已经克隆仓库并接受“应用容器 + MySQL 容器”的可选部署方式。

1. 复制环境变量模板：

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

2. 把 `.env` 中的数据库连接改成 MySQL 容器地址：

```env
DATABASE_URL=mysql+aiomysql://qquiz:qquiz_password@mysql:3306/qquiz_db
```

3. 启动应用和 MySQL：

```bash
docker compose -f docker-compose.yml -f docker-compose.mysql.yml up -d --build
```

4. 访问：

- 前端：`http://localhost:3000`
- 后端：`http://localhost:8000`

说明：

- 这条路径是 MySQL 兼容部署，不是默认发布路径
- 默认发布镜像仍然是根目录单容器镜像

## 场景二：单容器应用连接外部 MySQL

如果你想继续使用单容器应用镜像，但数据库由外部 MySQL 托管，可以直接让应用容器连接现有数据库。

### 1. 准备 MySQL 8.0 数据库

执行以下 SQL 创建数据库和账号：

```sql
CREATE DATABASE qquiz_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'qquiz'@'%' IDENTIFIED BY 'qquiz_password';
GRANT ALL PRIVILEGES ON qquiz_db.* TO 'qquiz'@'%';
FLUSH PRIVILEGES;
```

### 2. 修改 `.env`

把 `DATABASE_URL` 改成你的 MySQL 地址，例如：

```env
DATABASE_URL=mysql+aiomysql://qquiz:qquiz_password@mysql.example.com:3306/qquiz_db
UPLOAD_DIR=/app/uploads
```

### 3. 启动单容器镜像

```bash
docker pull ghcr.io/handsomezhuzhu/qquiz:latest

docker volume create qquiz_uploads

docker run -d \
  --name qquiz \
  --env-file .env \
  -v qquiz_uploads:/app/uploads \
  -p 8000:8000 \
  --restart unless-stopped \
  ghcr.io/handsomezhuzhu/qquiz:latest
```

说明：

- 这里不需要本地 SQLite 数据卷，因为数据库已经外置到 MySQL
- 仍然建议保留上传目录卷，避免容器重建后丢失上传文件

## 本地开发连接 MySQL

如果你是在本机直接跑后端，`.env` 中可使用本地 MySQL 地址：

```env
DATABASE_URL=mysql+aiomysql://qquiz:qquiz_password@localhost:3306/qquiz_db
```

然后分别启动后端和前端：

```bash
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

```bash
cd web
npm install
npm run dev
```

## 常见问题

### 1. 连接不上 MySQL

检查以下几项：

- `DATABASE_URL` 中的主机名、端口、用户名和密码是否正确
- MySQL 是否允许对应来源地址连接
- 3306 端口是否开放

### 2. 容器里能连，宿主机里不能连

这是因为容器内部和宿主机访问地址不同：

- 容器之间互联时通常使用服务名，例如 `mysql`
- 宿主机连接本机 MySQL 时通常使用 `localhost`

### 3. 字符集异常

建议数据库和表统一使用 `utf8mb4`：

```sql
ALTER DATABASE qquiz_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
