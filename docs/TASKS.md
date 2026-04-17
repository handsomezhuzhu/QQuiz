# QQuiz Task Checklist

更新时间：2026-04-17

## P0 运行基线

- [x] 默认 Docker 拓扑切回 SQLite
- [x] 保留 MySQL 兼容 Compose 覆盖文件
- [x] 前后端容器可启动并完成最小探活
- [x] GitHub Actions 改成 push 后自动构建 backend/frontend 镜像
- [ ] 补开发/生产分离 Compose
- [ ] 补 PR 级别 build/smoke workflow
- [ ] 清理根目录 Docker 文档漂移

## P1 后端稳定性

- [x] 管理员配置接口忽略打码后的密钥回写
- [x] 用户列表返回改为强类型
- [x] 用户列表统计去掉 N+1 查询
- [x] 最后一个管理员保护
- [x] 管理员密码重置接口
- [ ] 去掉启动期 `create_all` 作为正式迁移方式
- [ ] 建 Alembic 初始迁移
- [ ] 去掉 `LLMService` import side effect
- [ ] 收敛事务边界
- [ ] 修 ingestion 并发与唯一约束
- [ ] 规范健康检查和错误模型

## P2 用户管理

- [x] 用户搜索
- [x] 创建用户
- [x] 编辑用户
- [x] 重置密码
- [x] 删除用户
- [ ] 用户状态字段（启用/禁用/锁定）
- [ ] 审计日志
- [ ] 批量操作
- [ ] 密码强度与重置流程优化
- [ ] 默认管理员保护策略文档化

## P3 新前端基础层

- [x] Next.js App Router 骨架
- [x] BFF 登录/登出/`/me` 代理
- [x] 同源 API 代理
- [x] SSE 代理入口
- [x] 移除旧前端 ESA 人机验证
- [ ] 中间件与服务端守卫完善
- [ ] 错误页/空状态统一
- [ ] URL 状态策略统一

## P4 页面迁移

### 已接入真实数据

- [x] Dashboard
- [x] Exams list
- [x] Exam detail
- [x] Questions list
- [x] Mistakes list
- [x] Quiz player
- [x] Mistake quiz
- [x] Admin user management
- [x] Admin settings

### 待继续

- [ ] 上传/进度/失败重试链路

## P5 前端视觉与交互

- [x] 侧边栏选中态修复
- [x] 新前端配色收敛为更简洁的产品风格
- [x] 去掉大段迁移说明文案
- [ ] 统一表格、表单、按钮、状态徽标
- [ ] 清理页面中的占位内容
- [ ] 替换 `window.confirm` 为统一对话框
- [ ] 移动端布局细化

## P6 测试与验收

- [x] 旧前端构建通过
- [x] 新前端构建通过
- [x] Docker 最小登录链路验证
- [x] 管理员配置、用户管理、上传解析、题目、错题、刷题链路验证
- [x] 管理员与普通用户登录验证
- [x] PowerShell smoke 脚本固化全流程验证
- [ ] 后端集成测试
- [ ] 前端 E2E 烟测
- [ ] SQLite / MySQL 双栈验证
- [ ] 用户管理回归用例
