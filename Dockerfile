# ==================== 多阶段构建：单容器运行 FastAPI + Next.js ====================
# Stage 1: 构建 Next.js 前端
FROM node:20-slim AS web-builder

WORKDIR /web

COPY web/package*.json ./
RUN npm ci

COPY web/ ./

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 2: 运行 FastAPI + Next.js
FROM node:20-slim

WORKDIR /app

# 安装 Python 运行时和操作系统依赖
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip python3-venv libmagic1 \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# 安装后端依赖
COPY backend/requirements.txt ./backend-requirements.txt
RUN python -m pip install --no-cache-dir -r backend-requirements.txt

# 复制后端代码和启动脚本
COPY backend/ ./
COPY scripts/start_single_container.py ./scripts/start_single_container.py

# 复制 Next.js standalone 产物
COPY --from=web-builder /web/.next/standalone ./web
COPY --from=web-builder /web/.next/static ./web/.next/static

# 创建上传目录
RUN mkdir -p ./uploads

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV NEXT_SERVER_URL=http://127.0.0.1:3000
ENV NEXT_TELEMETRY_DISABLED=1

CMD ["python", "scripts/start_single_container.py"]
