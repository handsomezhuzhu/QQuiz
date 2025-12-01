# GitHub 推送指南

## 方式一：使用 Personal Access Token（推荐）

GitHub 已不再支持密码认证，需要使用 Personal Access Token (PAT)。

### 步骤 1：创建 GitHub Personal Access Token

1. **访问 GitHub 设置**
   - 登录 GitHub: https://github.com
   - 点击右上角头像 → Settings
   - 左侧菜单选择 **Developer settings**
   - 选择 **Personal access tokens** → **Tokens (classic)**
   - 点击 **Generate new token** → **Generate new token (classic)**

2. **配置 Token**
   - Note: `QQuiz Deploy`
   - Expiration: 选择过期时间（建议 90 days 或 No expiration）
   - 勾选权限：
     - ✅ **repo** (完整仓库访问权限)
   - 点击 **Generate token**

3. **保存 Token**
   - ⚠️ **重要**：立即复制生成的 token，它只会显示一次！
   - 格式类似：`ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### 步骤 2：配置 Git 凭据

**方式 A：使用 Git Credential Manager（推荐）**

```powershell
# 配置凭据存储
git config --global credential.helper manager-core

# 首次推送时会弹出窗口，输入：
# Username: handsomezhuzhu
# Password: 粘贴你的 Personal Access Token
```

**方式 B：直接在 URL 中使用 Token**

```powershell
cd E:\QQuiz

# 移除旧的 remote
git remote remove origin

# 添加包含 token 的 remote
git remote add origin https://ghp_YOUR_TOKEN_HERE@github.com/handsomezhuzhu/QQuiz.git

# 推送
git push -u origin main
```

将 `ghp_YOUR_TOKEN_HERE` 替换为你的实际 token。

### 步骤 3：推送到 GitHub

```powershell
cd E:\QQuiz

# 推送代码
git push -u origin main
```

如果使用方式 A，会弹出认证窗口，输入：
- **Username**: `handsomezhuzhu`
- **Password**: 粘贴你的 Personal Access Token

---

## 方式二：使用 SSH Key（适合频繁推送）

### 步骤 1：生成 SSH Key

```powershell
# 生成新的 SSH Key
ssh-keygen -t ed25519 -C "your_email@example.com"

# 按提示操作：
# - 文件位置：直接回车（使用默认）
# - 密码：可以留空或设置密码
```

### 步骤 2：添加 SSH Key 到 GitHub

```powershell
# 查看公钥
cat ~/.ssh/id_ed25519.pub

# 或在 Windows 上
type %USERPROFILE%\.ssh\id_ed25519.pub
```

复制输出的公钥（以 `ssh-ed25519` 开头）

1. 访问 GitHub Settings → SSH and GPG keys
2. 点击 **New SSH key**
3. Title: `QQuiz Dev PC`
4. Key: 粘贴公钥
5. 点击 **Add SSH key**

### 步骤 3：修改 Remote 为 SSH

```powershell
cd E:\QQuiz

# 移除旧的 HTTPS remote
git remote remove origin

# 添加 SSH remote
git remote add origin git@github.com:handsomezhuzhu/QQuiz.git

# 推送
git push -u origin main
```

---

## 快速推送脚本

创建 `push_to_github.bat`：

```batch
@echo off
echo Pushing to GitHub...

cd /d "%~dp0"

git add .
git status

echo.
set /p commit_msg="Enter commit message: "

git commit -m "%commit_msg%"
git push origin main

echo.
echo Done!
pause
```

---

## 验证推送成功

推送成功后：

1. 访问：https://github.com/handsomezhuzhu/QQuiz
2. 应该能看到所有代码文件
3. 查看 Commits 历史

---

## 常见问题

### Q1: 推送失败 - Authentication failed

**原因**：密码认证已被 GitHub 禁用

**解决**：使用 Personal Access Token 或 SSH Key

### Q2: 推送被拒绝 - Updates were rejected

```
! [rejected]        main -> main (fetch first)
```

**解决**：
```powershell
# 拉取远程更改
git pull origin main --allow-unrelated-histories

# 再次推送
git push -u origin main
```

### Q3: 推送很慢

**解决**：配置代理（如果使用 VPN）
```powershell
# 设置 HTTP 代理
git config --global http.proxy http://127.0.0.1:7890

# 取消代理
git config --global --unset http.proxy
```

---

## 后续推送

首次推送成功后，以后只需：

```powershell
cd E:\QQuiz

# 查看更改
git status

# 添加文件
git add .

# 提交
git commit -m "your commit message"

# 推送
git push
```

---

祝你推送成功！🚀
