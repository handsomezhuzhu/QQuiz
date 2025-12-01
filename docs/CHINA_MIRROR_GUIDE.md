# 中国镜像加速指南

如果你在中国大陆，Docker 构建速度可能很慢。我们提供了使用国内镜像的可选 Dockerfile。

## 使用方法

### 方法一：使用中国镜像版 Dockerfile（推荐）

```bash
# 构建后端（使用中国镜像）
cd backend
docker build -f Dockerfile.china -t qquiz-backend .

# 构建前端（使用中国镜像）
cd ../frontend
docker build -f Dockerfile.china -t qquiz-frontend .

# 或者一次性构建所有服务
docker-compose build
```

### 方法二：临时使用 Docker Compose 覆盖

创建 `docker-compose.override.yml`（已在 .gitignore 中）：

```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.china

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.china
```

然后正常运行：
```bash
docker-compose up -d --build
```

### 方法三：配置 Docker Hub 镜像加速

编辑 Docker 配置文件：
- **Windows**: Docker Desktop → Settings → Docker Engine
- **Linux**: `/etc/docker/daemon.json`

添加以下内容：
```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```

重启 Docker 服务。

## 镜像源说明

### Dockerfile.china 使用的镜像源：

- **apt-get**: 阿里云镜像 (mirrors.aliyun.com)
- **pip**: 清华大学镜像 (pypi.tuna.tsinghua.edu.cn)
- **npm**: 淘宝镜像 (registry.npmmirror.com)

### 其他可选镜像源：

**Python PyPI:**
- 清华：https://pypi.tuna.tsinghua.edu.cn/simple
- 阿里云：https://mirrors.aliyun.com/pypi/simple/
- 中科大：https://pypi.mirrors.ustc.edu.cn/simple/

**Node.js npm:**
- 淘宝：https://registry.npmmirror.com
- 华为云：https://repo.huaweicloud.com/repository/npm/

**Debian/Ubuntu apt:**
- 阿里云：mirrors.aliyun.com
- 清华：mirrors.tuna.tsinghua.edu.cn
- 中科大：mirrors.ustc.edu.cn

## 注意事项

⚠️ **不要提交 docker-compose.override.yml 到 Git**
⚠️ **Dockerfile.china 仅供中国大陆用户使用**
⚠️ **国际用户请使用默认的 Dockerfile**

## 速度对比

| 构建步骤 | 默认源 | 中国镜像 | 加速比 |
|---------|--------|---------|--------|
| apt-get update | 30-60s | 5-10s | 3-6x |
| pip install | 3-5min | 30-60s | 3-5x |
| npm install | 2-4min | 30-60s | 2-4x |
| **总计** | **5-10min** | **1-3min** | **3-5x** |

## 故障排除

### 如果镜像源失效

1. 尝试其他镜像源（见上方"其他可选镜像源"）
2. 检查镜像源是否可访问：
   ```bash
   # 测试 PyPI 镜像
   curl -I https://pypi.tuna.tsinghua.edu.cn/simple

   # 测试 npm 镜像
   curl -I https://registry.npmmirror.com
   ```

3. 如果所有镜像都不可用，使用默认的 Dockerfile

### 如果构建仍然很慢

1. 检查 Docker Desktop 内存分配（建议 ≥ 4GB）
2. 清理 Docker 缓存：`docker system prune -a`
3. 使用 BuildKit：`DOCKER_BUILDKIT=1 docker-compose build`
