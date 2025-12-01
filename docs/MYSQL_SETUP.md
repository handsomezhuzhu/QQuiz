# MySQL 安装与配置指南

QQuiz 使用 MySQL 8.0 作为数据库，你可以选择 Docker 部署或本地安装。

## 方式一：使用 Docker (推荐)

### 优点
- 无需手动安装 MySQL
- 自动配置和初始化
- 隔离环境，不影响系统

### 使用步骤

1. **安装 Docker Desktop**
   - 下载地址：https://www.docker.com/products/docker-desktop/
   - 安装后启动 Docker Desktop

2. **运行启动脚本**
   ```bash
   scripts\fix_and_start.bat
   ```
   选择 **[1] Use Docker**

3. **完成！**
   - Docker 会自动下载 MySQL 镜像
   - 自动创建数据库和用户
   - 自动启动服务

---

## 方式二：本地安装 MySQL

### 下载 MySQL

1. 访问 MySQL 官网下载页面：
   https://dev.mysql.com/downloads/installer/

2. 选择 **MySQL Installer for Windows**

3. 下载 `mysql-installer-community-8.0.x.x.msi`

### 安装步骤

1. **运行安装程序**
   - 双击下载的 .msi 文件

2. **选择安装类型**
   - 选择 "Developer Default" 或 "Server only"
   - 点击 Next

3. **配置 MySQL Server**
   - **Config Type**: Development Computer
   - **Port**: 3306 (默认)
   - **Authentication Method**: 选择 "Use Strong Password Encryption"

4. **设置 Root 密码**
   - 输入并记住 root 用户的密码
   - 建议密码：`root` (开发环境)

5. **Windows Service 配置**
   - ✅ Configure MySQL Server as a Windows Service
   - Service Name: MySQL80
   - ✅ Start the MySQL Server at System Startup

6. **完成安装**
   - 点击 Execute 开始安装
   - 等待安装完成
   - 点击 Finish

### 验证安装

打开命令提示符，运行：

```bash
mysql --version
```

应该显示：`mysql  Ver 8.0.x for Win64 on x86_64`

### 配置 QQuiz 数据库

**方式 A：使用脚本自动创建 (推荐)**

运行：
```bash
scripts\fix_and_start.bat
```
选择 **[2] Use Local MySQL**

**方式 B：手动创建**

1. 打开 MySQL 命令行客户端：
   ```bash
   mysql -u root -p
   ```

2. 输入 root 密码

3. 创建数据库和用户：
   ```sql
   CREATE DATABASE qquiz_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'qquiz'@'localhost' IDENTIFIED BY 'qquiz_password';
   GRANT ALL PRIVILEGES ON qquiz_db.* TO 'qquiz'@'localhost';
   FLUSH PRIVILEGES;
   EXIT;
   ```

---

## 数据库配置说明

### .env 文件配置

确保 `.env` 文件中的数据库连接字符串正确：

**本地 MySQL:**
```env
DATABASE_URL=mysql+aiomysql://qquiz:qquiz_password@localhost:3306/qquiz_db
```

**Docker MySQL:**
```env
DATABASE_URL=mysql+aiomysql://qquiz:qquiz_password@mysql:3306/qquiz_db
```

### 连接参数说明

- `mysql+aiomysql://` - 使用 aiomysql 异步驱动
- `qquiz` - 数据库用户名
- `qquiz_password` - 数据库密码
- `localhost` 或 `mysql` - 数据库主机地址
- `3306` - MySQL 默认端口
- `qquiz_db` - 数据库名称

---

## 常见问题

### 1. 端口 3306 被占用

**错误信息：**
```
Error: Port 3306 is already in use
```

**解决方案：**
- 检查是否已经有 MySQL 运行：`netstat -ano | findstr :3306`
- 停止现有的 MySQL 服务
- 或修改 `.env` 中的端口号

### 2. 无法连接到 MySQL

**错误信息：**
```
Can't connect to MySQL server on 'localhost'
```

**解决方案：**

1. **检查 MySQL 服务是否运行**
   - 按 Win+R，输入 `services.msc`
   - 查找 "MySQL80" 服务
   - 确认状态为 "正在运行"

2. **启动 MySQL 服务**
   ```bash
   net start MySQL80
   ```

3. **检查防火墙设置**
   - 确保防火墙允许 MySQL 端口 3306

### 3. 密码验证失败

**错误信息：**
```
Access denied for user 'qquiz'@'localhost'
```

**解决方案：**

重新创建用户并设置密码：
```sql
mysql -u root -p
DROP USER IF EXISTS 'qquiz'@'localhost';
CREATE USER 'qquiz'@'localhost' IDENTIFIED BY 'qquiz_password';
GRANT ALL PRIVILEGES ON qquiz_db.* TO 'qquiz'@'localhost';
FLUSH PRIVILEGES;
```

### 4. 字符集问题

**解决方案：**

确保数据库使用 UTF-8 字符集：
```sql
ALTER DATABASE qquiz_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

---

## 管理工具推荐

### 1. MySQL Workbench (官方)
- 下载：https://dev.mysql.com/downloads/workbench/
- 功能：可视化数据库管理、SQL 编辑器、备份还原

### 2. DBeaver (免费开源)
- 下载：https://dbeaver.io/download/
- 功能：多数据库支持、数据导入导出、ER 图

### 3. phpMyAdmin (Web 界面)
- 适合习惯 Web 界面的用户

---

## 数据库备份与恢复

### 备份数据库

```bash
mysqldump -u qquiz -p qquiz_db > backup.sql
```

### 恢复数据库

```bash
mysql -u qquiz -p qquiz_db < backup.sql
```

---

## 切换回 PostgreSQL

如果需要切换回 PostgreSQL：

1. 修改 `requirements.txt`：
   ```
   asyncpg==0.29.0  # 替换 aiomysql
   ```

2. 修改 `.env`：
   ```
   DATABASE_URL=postgresql+asyncpg://qquiz:qquiz_password@localhost:5432/qquiz_db
   ```

3. 修改 `docker-compose.yml`：
   - 将 `mysql` 服务改回 `postgres`

4. 重新安装依赖：
   ```bash
   pip install -r requirements.txt
   ```

---

## 技术支持

如遇到其他问题，请：
1. 检查 MySQL 错误日志
2. 确认防火墙和网络配置
3. 查看项目 issues: https://github.com/handsomezhuzhu/QQuiz/issues
