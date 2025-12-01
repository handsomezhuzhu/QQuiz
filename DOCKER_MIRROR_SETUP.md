# Docker 镜像加速器配置指南

## 问题描述

错误信息：`failed to resolve reference "docker.io/library/postgres:15-alpine"`

**原因**：无法访问 Docker Hub，需要配置国内镜像加速器。

---

## 解决方案一：配置 Docker Desktop 镜像加速（推荐）

### 方法 1：使用阿里云镜像加速器

1. **打开 Docker Desktop**

2. **进入设置**
   - 点击右上角齿轮图标 ⚙️
   - 选择 "Docker Engine"

3. **添加镜像加速器配置**

在 JSON 配置中添加以下内容：

```json
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "experimental": false,
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com"
  ]
}
```

4. **应用并重启**
   - 点击 "Apply & Restart"
   - 等待 Docker Desktop 重启完成

5. **验证配置**

```powershell
docker info | findstr "Registry Mirrors"
```

应该看到配置的镜像地址。

---

## 解决方案二：手动拉取镜像（临时方案）

如果配置镜像加速器后仍然失败，可以手动拉取镜像：

```powershell
# 尝试使用不同的镜像源拉取
docker pull docker.mirrors.ustc.edu.cn/library/postgres:15-alpine
docker tag docker.mirrors.ustc.edu.cn/library/postgres:15-alpine postgres:15-alpine

docker pull docker.mirrors.ustc.edu.cn/library/node:18-alpine
docker tag docker.mirrors.ustc.edu.cn/library/node:18-alpine node:18-alpine

docker pull docker.mirrors.ustc.edu.cn/library/python:3.11-slim
docker tag docker.mirrors.ustc.edu.cn/library/python:3.11-slim python:3.11-slim
```

---

## 解决方案三：使用国内可用的基础镜像

修改 `docker-compose.yml` 使用国内镜像源：

```yaml
services:
  postgres:
    image: registry.cn-hangzhou.aliyuncs.com/library/postgres:15-alpine
    # 或使用
    # image: docker.mirrors.ustc.edu.cn/library/postgres:15-alpine
```

---

## 推荐配置（完整版）

### Docker Desktop 完整配置

```json
{
  "builder": {
    "gc": {
      "defaultKeepStorage": "20GB",
      "enabled": true
    }
  },
  "experimental": false,
  "features": {
    "buildkit": true
  },
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://dockerproxy.com"
  ],
  "insecure-registries": [],
  "debug": false
}
```

---

## 常用镜像加速器地址

| 提供商 | 镜像地址 | 说明 |
|--------|----------|------|
| 中科大 | https://docker.mirrors.ustc.edu.cn | 稳定，推荐 |
| 网易 | https://hub-mirror.c.163.com | 速度快 |
| 百度云 | https://mirror.baidubce.com | 国内访问快 |
| Docker Proxy | https://dockerproxy.com | 备用 |

---

## 验证是否成功

### 1. 检查配置
```powershell
docker info
```

查找 "Registry Mirrors" 部分，应该显示配置的镜像地址。

### 2. 测试拉取镜像
```powershell
docker pull hello-world
```

如果成功，说明镜像加速器配置正确。

### 3. 重新启动 QQuiz
```powershell
cd E:\QQuiz
docker-compose up -d
```

---

## 如果仍然失败

### 检查网络连接

```powershell
# 测试是否能访问镜像加速器
curl https://docker.mirrors.ustc.edu.cn
```

### 尝试其他镜像源

如果某个镜像源不可用，尝试注释掉它，只保留可用的：

```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn"
  ]
}
```

### 检查防火墙/代理

- 暂时关闭防火墙测试
- 如果使用代理，在 Docker Desktop 设置中配置代理

---

## 完成后的下一步

配置成功后：

```powershell
# 1. 重新启动服务
cd E:\QQuiz
docker-compose down
docker-compose up -d

# 2. 查看启动日志
docker-compose logs -f

# 3. 访问应用
# http://localhost:3000
```

---

祝你成功！🎉
