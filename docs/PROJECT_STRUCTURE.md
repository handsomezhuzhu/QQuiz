# QQuiz 项目结构

## 📁 完整目录结构

```
QQuiz/
├── backend/                    # FastAPI 后端
│   ├── alembic/                # 数据库迁移
│   │   ├── versions/           # 迁移脚本
│   │   ├── env.py              # Alembic 环境配置
│   │   └── script.py.mako      # 迁移脚本模板
│   ├── routers/                # API 路由
│   │   ├── __init__.py         # 路由包初始化
│   │   ├── auth.py             # 认证路由（登录/注册）
│   │   ├── admin.py            # 管理员路由
│   │   ├── exam.py             # 题库路由（创建/追加/查询）⭐
│   │   ├── question.py         # 题目路由（刷题/答题）
│   │   └── mistake.py          # 错题本路由
│   ├── services/               # 业务逻辑层
│   │   ├── __init__.py         # 服务包初始化
│   │   ├── auth_service.py     # 认证服务（JWT/权限）
│   │   ├── llm_service.py      # AI 服务（解析/评分）⭐
│   │   └── document_parser.py  # 文档解析服务
│   ├── models.py               # SQLAlchemy 数据模型 ⭐
│   ├── schemas.py              # Pydantic 请求/响应模型
│   ├── database.py             # 数据库配置
│   ├── utils.py                # 工具函数（Hash/密码）
│   ├── main.py                 # FastAPI 应用入口
│   ├── requirements.txt        # Python 依赖
│   ├── alembic.ini             # Alembic 配置
│   └── Dockerfile              # 后端 Docker 镜像
│
├── web/                        # Next.js 前端
│   ├── src/
│   │   ├── app/                # App Router 页面、布局、Route Handlers
│   │   ├── components/         # 共享 UI 组件
│   │   ├── lib/                # API、认证、格式化等公共逻辑
│   │   └── middleware.ts       # 登录态守卫
│   ├── package.json            # Node 依赖
│   ├── next.config.mjs         # Next.js 配置
│   ├── tailwind.config.ts      # Tailwind CSS 配置
│   ├── postcss.config.mjs      # PostCSS 配置
│   └── Dockerfile              # 分离部署前端镜像
│
├── docker-compose.yml          # Docker 编排配置 ⭐
├── .env.example                # 环境变量模板
├── .gitignore                  # Git 忽略文件
├── README.md                   # 项目说明
├── DEPLOYMENT.md               # 部署指南
├── PROJECT_STRUCTURE.md        # 项目结构（本文件）
└── run_local.sh                # 本地运行脚本

⭐ 表示核心文件
```

---

## 🔑 核心文件说明

### 后端核心

#### `models.py` - 数据模型
定义了 5 个核心数据表：
- **User**: 用户表（用户名、密码、管理员标识）
- **SystemConfig**: 系统配置（KV 存储）
- **Exam**: 题库表（标题、状态、进度、题目数）
- **Question**: 题目表（内容、类型、选项、答案、**content_hash**）
- **UserMistake**: 错题本（用户 ID、题目 ID）

**关键设计：**
- `content_hash`: MD5 哈希，用于题目去重
- `current_index`: 记录刷题进度
- `status`: Enum 管理题库状态（pending/processing/ready/failed）

#### `exam.py` - 题库路由
实现了最核心的业务逻辑：
- `POST /create`: 创建题库并上传第一份文档
- `POST /{exam_id}/append`: 追加文档到现有题库 ⭐
- `GET /`: 获取题库列表
- `GET /{exam_id}`: 获取题库详情
- `PUT /{exam_id}/progress`: 更新刷题进度

**去重逻辑：**
```python
# 1. 解析文档获取题目
questions_data = await llm_service.parse_document(content)

# 2. 计算每道题的 Hash
for q in questions_data:
    q["content_hash"] = calculate_content_hash(q["content"])

# 3. 仅在当前 exam_id 范围内查询去重
existing_hashes = await db.execute(
    select(Question.content_hash).where(Question.exam_id == exam_id)
)

# 4. 仅插入 Hash 不存在的题目
for q in questions_data:
    if q["content_hash"] not in existing_hashes:
        db.add(Question(**q))
```

#### `llm_service.py` - AI 服务
提供两个核心功能：
1. `parse_document()`: 调用 LLM 解析文档，提取题目
2. `grade_short_answer()`: AI 评分简答题

支持 3 个 AI 提供商：
- OpenAI (GPT-4o-mini)
- Anthropic (Claude-3-haiku)
- Qwen (通义千问)

---

### 前端核心

#### `src/lib/api/server.ts` - 服务端 API 访问
用于 Next Server Components 访问后端：
- 从 `HttpOnly` Cookie 读取会话令牌
- 直接请求 FastAPI `/api/*`
- 401 时自动重定向回登录页

#### `src/lib/api/browser.ts` - 浏览器端 API 访问
用于客户端交互：
- 请求同源 `/frontend-api/proxy/*`
- 统一处理错误信息
- 默认禁用缓存，保持刷题和后台状态最新

#### `src/components/exams/exam-detail-client.tsx` - 题库详情
负责：
- 追加上传文档
- 展示解析进度
- 通过 `/frontend-api/exams/{examId}/progress` 订阅同源 SSE
- 处理解析完成/失败后的页面刷新

#### `src/components/practice/quiz-player-client.tsx` - 刷题核心
负责：
- 加载当前题目
- 提交答案并展示结果
- 推进刷题进度
- 管理简答题与错题练习等交互

---

## 🔄 核心业务流程

### 1. 创建题库流程

```
用户上传文档
    ↓
后端创建 Exam (status=pending)
    ↓
后台任务开始解析
    ↓
更新状态为 processing
    ↓
调用 document_parser 解析文件
    ↓
调用 llm_service 提取题目
    ↓
计算 content_hash 并去重
    ↓
插入新题目到数据库
    ↓
更新 total_questions 和 status=ready
    ↓
前端轮询检测到状态变化
    ↓
自动刷新显示新题目
```

### 2. 追加文档流程

```
用户点击「添加题目文档」
    ↓
上传新文档
    ↓
后端检查 Exam 是否在处理中
    ↓
更新状态为 processing
    ↓
后台任务解析新文档
    ↓
提取题目并计算 Hash
    ↓
仅在当前 exam_id 范围内查重
    ↓
插入不重复的题目
    ↓
更新 total_questions
    ↓
更新状态为 ready
    ↓
前端轮询检测并刷新
```

### 3. 刷题流程

```
用户点击「开始刷题」
    ↓
基于 current_index 加载题目
    ↓
用户选择/输入答案
    ↓
提交答案到后端
    ↓
后端检查答案
  ├─ 选择题：字符串比对
  ├─ 多选题：排序后比对
  ├─ 判断题：字符串比对
  └─ 简答题：调用 AI 评分
    ↓
答错自动加入错题本
    ↓
返回结果和解析
    ↓
用户点击「下一题」
    ↓
更新 current_index += 1
    ↓
加载下一题
```

---

## 🗄️ 数据库设计

### 关键索引

```sql
-- Exam 表
CREATE INDEX ix_exams_user_status ON exams(user_id, status);

-- Question 表
CREATE INDEX ix_questions_exam_hash ON questions(exam_id, content_hash);
CREATE INDEX ix_questions_content_hash ON questions(content_hash);

-- UserMistake 表
CREATE UNIQUE INDEX ix_user_mistakes_unique ON user_mistakes(user_id, question_id);
```

### 关键约束

- `Question.content_hash`: 用于去重，同一 exam_id 下不允许重复
- `UserMistake`: user_id + question_id 唯一约束，防止重复添加
- 级联删除：删除 Exam 时自动删除所有关联的 Question 和 UserMistake

---

## 🎨 技术栈

### 后端
- **FastAPI**: 现代化 Python Web 框架
- **SQLAlchemy 2.0**: 异步 ORM
- **Alembic**: 数据库迁移
- **Pydantic**: 数据验证
- **JWT**: 无状态认证
- **OpenAI/Anthropic/Qwen**: AI 解析和评分

### 前端
- **Next.js 14 App Router**: 前端运行时
- **React 18**: UI 框架
- **TypeScript**: 类型系统
- **Tailwind CSS**: 原子化 CSS
- **TanStack Query**: 客户端缓存和数据同步
- **Route Handlers**: 同源认证与代理层

### 部署
- **Docker + Docker Compose**: 容器化部署
- **SQLite / MySQL**: 关系型数据库
- **FastAPI reverse proxy**: 单容器模式下代理 Next.js

---

## 📊 API 接口汇总

### 认证相关
- `POST /api/auth/register`: 用户注册
- `POST /api/auth/login`: 用户登录
- `GET /api/auth/me`: 获取当前用户信息
- `POST /api/auth/change-password`: 修改密码

### 题库相关
- `POST /api/exams/create`: 创建题库
- `POST /api/exams/{exam_id}/append`: 追加文档 ⭐
- `GET /api/exams/`: 获取题库列表
- `GET /api/exams/{exam_id}`: 获取题库详情
- `DELETE /api/exams/{exam_id}`: 删除题库
- `PUT /api/exams/{exam_id}/progress`: 更新进度

### 题目相关
- `GET /api/questions/exam/{exam_id}/questions`: 获取题库所有题目
- `GET /api/questions/exam/{exam_id}/current`: 获取当前题目
- `GET /api/questions/{question_id}`: 获取题目详情
- `POST /api/questions/check`: 检查答案

### 错题本相关
- `GET /api/mistakes/`: 获取错题列表
- `POST /api/mistakes/add`: 添加错题
- `DELETE /api/mistakes/{mistake_id}`: 移除错题
- `DELETE /api/mistakes/question/{question_id}`: 按题目 ID 移除

### 管理员相关
- `GET /api/admin/config`: 获取系统配置
- `PUT /api/admin/config`: 更新系统配置

---

## 🔒 安全特性

1. **密码加密**: bcrypt 哈希
2. **JWT 认证**: 无状态 Token
3. **权限控制**: 管理员/普通用户
4. **CORS 保护**: 可配置允许的来源
5. **文件类型验证**: 仅允许特定格式
6. **文件大小限制**: 可配置最大上传大小
7. **速率限制**: 每日上传次数限制

---

## 🎯 核心创新点

1. **智能去重**: 基于 content_hash 的高效去重算法
2. **追加上传**: 支持向现有题库添加新文档
3. **异步处理**: 后台任务处理文档解析，不阻塞用户
4. **状态轮询**: 前端实时显示处理状态
5. **断点续做**: 基于 current_index 的进度管理
6. **AI 评分**: 简答题智能评分和反馈
7. **自动错题本**: 答错自动收集，支持手动管理
8. **多 AI 支持**: 灵活切换 AI 提供商

---

这就是 QQuiz 的完整架构！🎉
