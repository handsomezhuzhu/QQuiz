# ==================== 多阶段构建：前后端整合单容器 ====================
# Stage 1: 构建前端
FROM node:18-slim AS frontend-builder

WORKDIR /frontend

# 复制前端依赖文件
COPY frontend/package*.json ./

# 安装依赖
RUN npm ci

# 复制前端源代码
COPY frontend/ ./

# 构建前端（生成静态文件到 dist 目录）
RUN npm run build

# Stage 2: 构建后端并整合前端
FROM python:3.11-slim

WORKDIR /app

# 安装操作系统依赖（python-magic 需要 libmagic）
RUN apt-get update \
    && apt-get install -y --no-install-recommends libmagic1 \
    && rm -rf /var/lib/apt/lists/*

# 复制后端依赖文件
COPY backend/requirements.txt ./

# 安装 Python 依赖（使用预编译wheel包，无需gcc）
RUN pip install -r requirements.txt

# 复制后端代码
COPY backend/ ./

# 从前端构建阶段复制静态文件到后端 static 目录
COPY --from=frontend-builder /frontend/build ./static

# 创建上传目录
RUN mkdir -p ./uploads

# 暴露端口
EXPOSE 8000

# 设置环境变量
ENV PYTHONUNBUFFERED=1

# 启动命令
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
