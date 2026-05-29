# API 接口文档

后端接口由 Spring Boot 提供，统一前缀为 `/api`。

统一响应格式：

```json
{
  "success": true,
  "data": {},
  "message": "success",
  "code": 200
}
```

Swagger 地址：

```text
http://127.0.0.1:3000/swagger-ui.html
```

## 公开设置

- `GET /api/public/guest-access`

该接口用于前端判断总管理员是否开启访客浏览功能。

## 认证

- `POST /api/auth/send-verification`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `PUT /api/auth/password`
- `POST /api/auth/logout`

认证接口使用 JWT，登录成功后前端会在 `Authorization: Bearer <token>` 中携带令牌。

## 小吃

- `GET /api/snack/merchants`
- `GET /api/snack/list`
- `GET /api/snack/detail/{id}`
- `POST /api/snack/order`
- `GET /api/snack/orders`
- `PUT /api/snack/orders/{id}/cancel`

## 超市

- `GET /api/supermarket/categories`
- `GET /api/supermarket/products`
- `GET /api/supermarket/product/{id}`
- `POST /api/supermarket/cart/add`
- `GET /api/supermarket/cart`
- `PUT /api/supermarket/cart/update`
- `DELETE /api/supermarket/cart/remove`
- `POST /api/supermarket/checkout`
- `GET /api/supermarket/orders`
- `GET /api/supermarket/order/{id}`
- `PUT /api/supermarket/orders/{id}/cancel`

## 家教、二手、驾校、资料、论坛

家教：

- `GET /api/tutor/list`
- `GET /api/tutor/detail/{id}`
- `POST /api/tutor/publish`
- `POST /api/tutor/order`
- `GET /api/tutor/orders`
- `PUT /api/tutor/orders/{id}/cancel`
- `GET /api/tutor/my`

二手：

- `GET /api/secondhand/list`
- `GET /api/secondhand/detail/{id}`
- `POST /api/secondhand/publish`
- `POST /api/secondhand/order`
- `GET /api/secondhand/orders`
- `PUT /api/secondhand/orders/{id}/cancel`
- `GET /api/secondhand/my`
- `GET /api/secondhand/favorites`
- `POST /api/secondhand/favorite/{id}`
- `DELETE /api/secondhand/favorite/{id}`

驾校：

- `GET /api/driving-school/list`
- `GET /api/driving-school/detail/{id}`
- `POST /api/driving-school/order`
- `GET /api/driving-school/orders`
- `PUT /api/driving-school/orders/{id}/cancel`
- `POST /api/driving-school/inquiry`
- `GET /api/driving-school/my-inquiries`

资料：

- `GET /api/study-material/list`
- `GET /api/study-material/detail/{id}`
- `POST /api/study-material/upload`
- `GET /api/study-material/my`
- `POST /api/study-material/download/{id}`

论坛：

- `GET /api/forum/categories`
- `GET /api/forum/list`
- `GET /api/forum/detail/{id}`
- `POST /api/forum/publish`
- `POST /api/forum/like/{id}`
- `POST /api/forum/comment/{id}`
- `GET /api/forum/my`

## 支付

- `POST /api/payments/create`
- `GET /api/payments/{id}`
- `POST /api/payments/{id}/mock/confirm`
- `POST /api/payments/{id}/refund`

演示环境默认使用 `mock` 支付通道。

## 后台管理

后台接口统一要求管理员角色：

- `GET /api/admin/stats`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/{id}`
- `PUT /api/admin/users/{id}/status`
- `DELETE /api/admin/users/{id}`
- `GET /api/admin/settings/guest-access`
- `PUT /api/admin/settings/guest-access`
- `GET /api/admin/snacks`
- `POST /api/admin/snacks`
- `PUT /api/admin/snacks/{id}`
- `DELETE /api/admin/snacks/{id}`
- `GET /api/admin/supermarket/categories`
- `POST /api/admin/supermarket/categories`
- `PUT /api/admin/supermarket/categories/{id}`
- `DELETE /api/admin/supermarket/categories/{id}`
- `GET /api/admin/supermarket/products`
- `POST /api/admin/supermarket/products`
- `PUT /api/admin/supermarket/products/{id}`
- `DELETE /api/admin/supermarket/products/{id}`
- `GET /api/admin/tutors`
- `PUT /api/admin/tutors/{id}/status`
- `DELETE /api/admin/tutors/{id}`
- `GET /api/admin/secondhand`
- `PUT /api/admin/secondhand/{id}/status`
- `DELETE /api/admin/secondhand/{id}`
- `GET /api/admin/study-materials`
- `PUT /api/admin/study-materials/{id}/status`
- `DELETE /api/admin/study-materials/{id}`
- `GET /api/admin/forum-posts`
- `PUT /api/admin/forum-posts/{id}/status`
- `DELETE /api/admin/forum-posts/{id}`
- `GET /api/admin/orders`
- `PUT /api/admin/orders/{id}/status`
- `GET /api/admin/driving-schools`
- `POST /api/admin/driving-schools`
- `PUT /api/admin/driving-schools/{id}`
- `DELETE /api/admin/driving-schools/{id}`
- `GET /api/admin/driving-inquiries`
- `PUT /api/admin/driving-inquiries/{id}/status`
