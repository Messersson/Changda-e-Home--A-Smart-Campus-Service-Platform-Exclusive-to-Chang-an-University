# 长安大学校园服务平台

本项目已改造为前后端分离的企业级技术栈：

- 后端：Java 17 + Spring Boot 3
- 前端：Vue 3 + Element Plus
- 数据库：MySQL 8
- 环境：Docker Compose + Nginx

## 快速启动

```bash
node scripts/start-platform.js
```

访问地址：

- 用户端：`http://127.0.0.1:5173`
- 管理端：`http://127.0.0.1:5173/admin`
- 后端健康检查：`http://127.0.0.1:3000/api/health`
- Swagger：`http://127.0.0.1:3000/swagger-ui.html`

## 默认账号

管理员：

- 学号：`2024000000`
- 密码：`admin123`

普通用户：

- 学号：`2022000001`
- 密码：`123456`

更多说明见：

- `docs/平台启动说明.md`
- `docs/技术栈与企业级能力.md`
