# 🚀 QQuiz 快速开始指南（5 分钟上手）

## Windows 用户快速部署

### 第一步：准备工作（2 分钟）

1. **安装 Docker Desktop**
   - 下载：https://www.docker.com/products/docker-desktop/
   - 安装后重启电脑
   - 启动 Docker Desktop，等待启动完成

2. **配置 API Key**
   ```powershell
   # 在项目目录打开 PowerShell
   cd E:\QQuiz

   # 复制环境变量模板
   copy .env.example .env

   # 编辑 .env 文件
   notepad .env
   ```

   **修改以下两项：**
   ```env
   SECRET_KEY=change-this-to-a-very-long-random-string-at-least-32-characters
   OPENAI_API_KEY=sk-your-actual-openai-api-key-here
   ```

### 第二步：启动服务（2 分钟）

**方式一：使用启动脚本（推荐）**
```powershell
# 双击运行
start_windows.bat
```

**方式二：手动启动**
```powershell
cd E:\QQuiz
docker-compose up -d
```

等待服务启动完成（首次启动需要下载镜像，约 1-2 分钟）

### 第三步：开始使用（1 分钟）

1. **访问应用**
   - 打开浏览器访问：http://localhost:3000

2. **登录**
   - 用户名：`admin`
   - 密码：`admin123`

3. **创建第一个题库**
   - 点击「题库管理」
   - 点击「创建题库」
   - 输入名称：`Python 基础测试`
   - 上传文件：`test_data/sample_questions.txt`
   - 等待解析完成（约 10-30 秒）

4. **开始刷题**
   - 点击「开始刷题」
   - 答题并查看解析

---

## 🎯 测试功能清单

完成以下测试，确保所有功能正常：

### ✅ 基础功能
- [ ] 登录系统
- [ ] 创建题库
- [ ] 上传文档并等待解析完成
- [ ] 开始刷题
- [ ] 答对一题
- [ ] 答错一题（应自动加入错题本）
- [ ] 查看错题本

### ✅ 高级功能
- [ ] 向已有题库追加新文档
- [ ] 验证去重功能（上传重复题目）
- [ ] 测试不同题型（单选、多选、判断、简答）
- [ ] 测试断点续做（刷到一半退出，再次进入继续）
- [ ] 手动添加/移除错题
- [ ] 修改管理员密码

### ✅ 管理员功能（使用 admin 账户）
- [ ] 访问系统设置
- [ ] 修改上传限制
- [ ] 关闭用户注册

---

## 📝 测试数据文件

项目提供了两个测试文件：

1. **`test_data/sample_questions.txt`** - 基础选择题和判断题
   - 10 道题
   - 包含单选、多选、判断题
   - 适合快速测试

2. **`test_data/sample_questions_advanced.txt`** - 简答题
   - 8 道题
   - 全部为简答题
   - 测试 AI 评分功能

**使用方法：**
1. 创建题库时上传 `sample_questions.txt`
2. 解析完成后，点击「添加题目文档」
3. 再次上传 `sample_questions.txt`（测试去重）
4. 观察日志，应该显示"去重 10 题，新增 0 题"

---

## 🛠️ 常用命令

### 查看日志
```powershell
# 方式一：使用脚本
logs_windows.bat

# 方式二：命令行
docker-compose logs -f
```

### 重启服务
```powershell
docker-compose restart
```

### 停止服务
```powershell
# 方式一：使用脚本
stop_windows.bat

# 方式二：命令行
docker-compose down
```

### 完全重置（清除所有数据）
```powershell
docker-compose down -v
docker-compose up -d
```

---

## ❓ 常见问题

### 问题 1: 端口被占用

**错误信息：** `Bind for 0.0.0.0:3000 failed: port is already allocated`

**解决方案：**
```powershell
# 查找占用端口的进程
netstat -ano | findstr :3000

# 结束进程（替换 <PID> 为实际进程 ID）
taskkill /F /PID <PID>

# 重新启动
docker-compose up -d
```

### 问题 2: Docker Desktop 未启动

**错误信息：** `error during connect: ... Is the docker daemon running?`

**解决方案：**
1. 打开 Docker Desktop 应用
2. 等待底部状态显示 "Running"
3. 重新运行启动脚本

### 问题 3: API Key 未配置

**现象：** 文档解析一直处于 "processing" 状态

**解决方案：**
1. 检查 `.env` 文件中的 `OPENAI_API_KEY` 是否正确
2. 查看后端日志：`docker-compose logs backend`
3. 重新启动：`docker-compose restart`

### 问题 4: 前端无法连接后端

**现象：** 登录失败，显示网络错误

**解决方案：**
```powershell
# 检查后端是否运行
docker-compose ps

# 检查后端健康状态
# 浏览器访问: http://localhost:8000/health

# 查看后端日志
docker-compose logs backend
```

---

## 📚 下一步

✅ **部署成功后，建议阅读：**

1. **完整功能说明**: `README.md`
2. **详细部署文档**: `DEPLOYMENT.md`
3. **Windows 专用指南**: `WINDOWS_DEPLOYMENT.md`
4. **项目架构**: `PROJECT_STRUCTURE.md`

✅ **进阶使用：**

1. 修改管理员密码
2. 创建普通用户账户
3. 上传真实的题目文档
4. 配置系统限制（上传大小、次数等）
5. 尝试不同的 AI 提供商（Qwen、Claude）

---

## 🎉 恭喜！

如果你已经完成了上述测试，说明 QQuiz 已经在你的 Windows 系统上成功部署运行了！

现在你可以：
- 📚 上传自己的题库文档
- 🎯 开始高效刷题学习
- 📊 通过错题本巩固薄弱知识点
- ⚙️ 自定义系统配置

祝你学习愉快！如有问题，请查看详细文档或提交 Issue。
