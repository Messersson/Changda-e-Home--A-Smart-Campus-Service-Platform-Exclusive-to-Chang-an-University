# 长安大学校园服务平台 - 接口文档

## 技术栈
- 前端：Vue3 + Element Plus + Vite + Pinia
- 后端：Node.js + Express + JWT

## 接口说明
本文档分为两部分：
1. 前后端交互业务接口
2. 数据库对接预留接口

---

## 一、前后端交互业务接口

### 基础信息
- 基础URL：`http://localhost:3000/api`
- 认证方式：Bearer Token (JWT)
- 响应格式：JSON

### 通用响应格式
```json
{
  "success": true,
  "message": "操作成功",
  "data": {}
}
```

### 1. 用户认证模块

#### 1.1 发送邮箱验证码
- **接口地址**：`/auth/send-verification`
- **请求方式**：POST
- **请求参数**：
  ```json
  {
    "email": "student@chd.edu.cn",
    "studentId": "2024000001"
  }
  ```
- **返回值**：
  ```json
  {
    "success": true,
    "message": "验证码已发送到您的邮箱，有效期10分钟",
    "data": {
      "message": "验证码已发送到您的邮箱，有效期10分钟",
      "expiryTime": "2024-01-01T10:00:00.000Z"
    }
  }
  ```

#### 1.2 用户注册
- **接口地址**：`/auth/register`
- **请求方式**：POST
- **请求参数**：
  ```json
  {
    "studentId": "2024000001",
    "email": "student@chd.edu.cn",
    "code": "ABC123",
    "password": "123456",
    "name": "张三",
    "major": "计算机科学与技术",
    "grade": "大一"
  }
  ```
- **返回值**：
  ```json
  {
    "success": true,
    "message": "注册成功",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": 1,
        "studentId": "2024000001",
        "email": "student@chd.edu.cn",
        "name": "张三",
        "major": "计算机科学与技术",
        "grade": "大一",
        "role": "student"
      }
    }
  }
  ```

#### 1.3 用户登录
- **接口地址**：`/auth/login`
- **请求方式**：POST
- **请求参数**：
  ```json
  {
    "studentId": "2024000001",
    "password": "123456"
  }
  ```
- **返回值**：
  ```json
  {
    "success": true,
    "message": "登录成功",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": 1,
        "studentId": "2024000001",
        "email": "student@chd.edu.cn",
        "name": "张三",
        "major": "计算机科学与技术",
        "grade": "大一",
        "role": "student"
      }
    }
  }
  ```

#### 1.4 获取当前用户信息
- **接口地址**：`/auth/me`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}`
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": {
      "id": 1,
      "studentId": "2024000001",
      "email": "student@chd.edu.cn",
      "name": "张三",
      "major": "计算机科学与技术",
      "grade": "大一",
      "role": "student",
      "status": "active"
    }
  }
  ```

#### 1.5 退出登录
- **接口地址**：`/auth/logout`
- **请求方式**：POST
- **请求头**：`Authorization: Bearer {token}`
- **返回值**：
  ```json
  {
    "success": true,
    "message": "退出登录成功",
    "data": null
  }
  ```

### 2. 东门小吃摊点单模块

#### 2.1 获取商家列表
- **接口地址**：`/snack/merchants`
- **请求方式**：GET
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": ["东门老王肉夹馍", "东门煎饼摊", "东门烤冷面", "东门炸串摊"]
  }
  ```

#### 2.2 获取菜品列表
- **接口地址**：`/snack/list`
- **请求方式**：GET
- **请求参数**：`merchant` (可选)
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": [
      {
        "id": 1,
        "name": "肉夹馍",
        "price": 8.00,
        "description": "正宗陕西肉夹馍，肥而不腻",
        "image": "/uploads/snack1.jpg",
        "merchant": "东门老王肉夹馍",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

#### 2.3 获取菜品详情
- **接口地址**：`/snack/detail/:id`
- **请求方式**：GET
- **返回值**：同菜品列表中的单个菜品对象

#### 2.4 下单
- **接口地址**：`/snack/order`
- **请求方式**：POST
- **请求头**：`Authorization: Bearer {token}`
- **请求参数**：
  ```json
  {
    "items": [
      {
        "snackId": 1,
        "quantity": 2
      }
    ],
    "remark": "少放辣"
  }
  ```
- **返回值**：
  ```json
  {
    "success": true,
    "message": "下单成功",
    "data": {
      "orderId": 1,
      "totalAmount": 16.00
    }
  }
  ```

#### 2.5 获取订单列表
- **接口地址**：`/snack/orders`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}`
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": [
      {
        "id": 1,
        "userId": 1,
        "type": "snack",
        "items": [
          {
            "snackId": 1,
            "snackName": "肉夹馍",
            "price": 8.00,
            "quantity": 2,
            "subtotal": 16.00
          }
        ],
        "totalAmount": 16.00,
        "remark": "少放辣",
        "status": "pending",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

### 3. 校园超市点单模块

#### 3.1 获取商品分类
- **接口地址**：`/supermarket/categories`
- **请求方式**：GET
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": [
      {
        "id": 1,
        "name": "零食",
        "icon": "🍪",
        "parentId": null
      },
      {
        "id": 4,
        "name": "膨化食品",
        "icon": "🥨",
        "parentId": 1
      }
    ]
  }
  ```

#### 3.2 获取商品列表
- **接口地址**：`/supermarket/products`
- **请求方式**：GET
- **请求参数**：
  - `categoryId` (可选)：分类ID
  - `keyword` (可选)：搜索关键词
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": [
      {
        "id": 1,
        "name": "乐事薯片原味",
        "categoryId": 4,
        "price": 8.50,
        "spec": "70g",
        "stock": 50,
        "image": "/uploads/supermarket1.jpg",
        "description": "经典原味薯片",
        "status": "active"
      }
    ]
  }
  ```

#### 3.3 获取商品详情
- **接口地址**：`/supermarket/product/:id`
- **请求方式**：GET
- **返回值**：同商品列表中的单个商品对象

#### 3.4 加入购物车
- **接口地址**：`/supermarket/cart/add`
- **请求方式**：POST
- **请求头**：`Authorization: Bearer {token}`
- **请求参数**：
  ```json
  {
    "productId": 1,
    "quantity": 2
  }
  ```
- **返回值**：
  ```json
  {
    "success": true,
    "message": "已加入购物车",
    "data": null
  }
  ```

#### 3.5 获取购物车
- **接口地址**：`/supermarket/cart`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}`
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": {
      "id": 1,
      "userId": 1,
      "type": "cart",
      "items": [
        {
          "productId": 1,
          "productName": "乐事薯片原味",
          "price": 8.50,
          "quantity": 2,
          "subtotal": 17.00
        }
      ],
      "totalAmount": 17.00,
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### 3.6 更新购物车
- **接口地址**：`/supermarket/cart/update`
- **请求方式**：PUT
- **请求头**：`Authorization: Bearer {token}`
- **请求参数**：
  ```json
  {
    "productId": 1,
    "quantity": 3
  }
  ```
- **返回值**：同获取购物车

#### 3.7 移除购物车商品
- **接口地址**：`/supermarket/cart/remove`
- **请求方式**：DELETE
- **请求头**：`Authorization: Bearer {token}`
- **请求参数**：
  ```json
  {
    "productId": 1
  }
  ```
- **返回值**：同获取购物车

#### 3.8 结算下单
- **接口地址**：`/supermarket/checkout`
- **请求方式**：POST
- **请求头**：`Authorization: Bearer {token}`
- **请求参数**：
  ```json
  {
    "address": "长安大学南校区1号宿舍楼",
    "phone": "13800138000",
    "remark": "请尽快送达"
  }
  ```
- **返回值**：
  ```json
  {
    "success": true,
    "message": "下单成功",
    "data": {
      "orderId": 2,
      "totalAmount": 17.00
    }
  }
  ```

#### 3.9 获取超市订单列表
- **接口地址**：`/supermarket/orders`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}`
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": [
      {
        "id": 2,
        "userId": 1,
        "type": "supermarket",
        "items": [
          {
            "productId": 1,
            "productName": "乐事薯片原味",
            "price": 8.50,
            "quantity": 2,
            "subtotal": 17.00
          }
        ],
        "totalAmount": 17.00,
        "address": "长安大学南校区1号宿舍楼",
        "phone": "13800138000",
        "remark": "请尽快送达",
        "status": "pending",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

#### 3.10 获取超市订单详情
- **接口地址**：`/supermarket/order/:id`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}`
- **返回值**：同超市订单列表中的单个订单对象

### 4. 家教板块模块

#### 4.1 获取家教信息列表
- **接口地址**：`/tutor/list`
- **请求方式**：GET
- **请求参数**：
  - `subject` (可选)：科目
  - `grade` (可选)：年级
  - `minSalary` (可选)：最低薪资
  - `maxSalary` (可选)：最高薪资
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": [
      {
        "id": 1,
        "userId": 1001,
        "name": "张同学",
        "subject": "高等数学",
        "grade": "大一",
        "salary": 50,
        "description": "数学系大三学生，高数成绩95分",
        "contact": "138****1234",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

#### 4.2 获取家教信息详情
- **接口地址**：`/tutor/detail/:id`
- **请求方式**：GET
- **返回值**：同家教信息列表中的单个对象

#### 4.3 发布家教信息
- **接口地址**：`/tutor/publish`
- **请求方式**：POST
- **请求头**：`Authorization: Bearer {token}`
- **请求参数**：
  ```json
  {
    "subject": "高等数学",
    "grade": "大一",
    "salary": 50,
    "description": "数学系大三学生，高数成绩95分",
    "contact": "13800138000"
  }
  ```
- **返回值**：
  ```json
  {
    "success": true,
    "message": "家教信息发布成功，等待审核",
    "data": {
      "id": 1,
      "userId": 1,
      "name": "张三",
      "subject": "高等数学",
      "grade": "大一",
      "salary": 50,
      "description": "数学系大三学生，高数成绩95分",
      "contact": "13800138000",
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### 4.4 获取我的家教信息
- **接口地址**：`/tutor/my`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}`
- **返回值**：同家教信息列表

### 5. 二手交易模块

#### 5.1 获取二手商品列表
- **接口地址**：`/secondhand/list`
- **请求方式**：GET
- **请求参数**：
  - `category` (可选)：分类
  - `keyword` (可选)：搜索关键词
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": [
      {
        "id": 1,
        "userId": 1001,
        "title": "九成新自行车",
        "category": "交通工具",
        "price": 200,
        "description": "买来只骑了一个学期，保养很好",
        "images": ["/uploads/secondhand1.jpg"],
        "status": "active",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

#### 5.2 获取二手商品详情
- **接口地址**：`/secondhand/detail/:id`
- **请求方式**：GET
- **返回值**：同二手商品列表中的单个对象

#### 5.3 发布二手商品
- **接口地址**：`/secondhand/publish`
- **请求方式**：POST
- **请求头**：`Authorization: Bearer {token}`
- **请求参数**：
  ```json
  {
    "title": "九成新自行车",
    "category": "交通工具",
    "price": 200,
    "description": "买来只骑了一个学期，保养很好",
    "images": ["/uploads/secondhand1.jpg"]
  }
  ```
- **返回值**：
  ```json
  {
    "success": true,
    "message": "商品发布成功，等待审核",
    "data": {
      "id": 1,
      "userId": 1,
      "title": "九成新自行车",
      "category": "交通工具",
      "price": 200,
      "description": "买来只骑了一个学期，保养很好",
      "images": ["/uploads/secondhand1.jpg"],
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### 5.4 获取我的二手商品
- **接口地址**：`/secondhand/my`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}`
- **返回值**：同二手商品列表

#### 5.5 获取收藏列表
- **接口地址**：`/secondhand/favorites`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}`
- **返回值**：同二手商品列表

#### 5.6 收藏商品
- **接口地址**：`/secondhand/favorite/:id`
- **请求方式**：POST
- **请求头**：`Authorization: Bearer {token}`
- **返回值**：
  ```json
  {
    "success": true,
    "message": "收藏成功",
    "data": null
  }
  ```

#### 5.7 取消收藏
- **接口地址**：`/secondhand/favorite/:id`
- **请求方式**：DELETE
- **请求头**：`Authorization: Bearer {token}`
- **返回值**：
  ```json
  {
    "success": true,
    "message": "取消收藏成功",
    "data": null
  }
  ```

### 6. 驾校板块模块

#### 6.1 获取驾校列表
- **接口地址**：`/driving-school/list`
- **请求方式**：GET
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": [
      {
        "id": 1,
        "name": "长安驾校",
        "address": "长安大学北门对面",
        "phone": "029-88888888",
        "price": 2800,
        "description": "校内合作驾校，通过率高",
        "features": ["包过班", "周末练车", "校内接送"],
        "status": "active",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

#### 6.2 获取驾校详情
- **接口地址**：`/driving-school/detail/:id`
- **请求方式**：GET
- **返回值**：同驾校列表中的单个对象

#### 6.3 提交驾校咨询
- **接口地址**：`/driving-school/inquiry`
- **请求方式**：POST
- **请求头**：`Authorization: Bearer {token}`
- **请求参数**：
  ```json
  {
    "schoolId": 1,
    "name": "张三",
    "phone": "13800138000",
    "question": "请问周末可以练车吗？"
  }
  ```
- **返回值**：
  ```json
  {
    "success": true,
    "message": "咨询提交成功",
    "data": null
  }
  ```

#### 6.4 获取我的咨询记录
- **接口地址**：`/driving-school/my-inquiries`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}`
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": [
      {
        "id": 1,
        "userId": 1,
        "type": "driving_inquiry",
        "schoolId": 1,
        "schoolName": "长安驾校",
        "name": "张三",
        "phone": "13800138000",
        "question": "请问周末可以练车吗？",
        "status": "pending",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

### 7. 专业学习资料模块

#### 7.1 获取学习资料列表
- **接口地址**：`/study-material/list`
- **请求方式**：GET
- **请求参数**：
  - `major` (可选)：专业
  - `grade` (可选)：年级
  - `subject` (可选)：学科
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": [
      {
        "id": 1,
        "title": "高等数学上册复习资料",
        "major": "数学与应用数学",
        "grade": "大一",
        "subject": "高等数学",
        "type": "pdf",
        "size": "5.2MB",
        "downloadCount": 128,
        "uploaderId": 1001,
        "description": "包含历年真题和重点笔记",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

#### 7.2 获取学习资料详情
- **接口地址**：`/study-material/detail/:id`
- **请求方式**：GET
- **返回值**：同学习资料列表中的单个对象

#### 7.3 上传学习资料
- **接口地址**：`/study-material/upload`
- **请求方式**：POST
- **请求头**：`Authorization: Bearer {token}`
- **请求参数**：
  ```json
  {
    "title": "高等数学上册复习资料",
    "major": "数学与应用数学",
    "grade": "大一",
    "subject": "高等数学",
    "description": "包含历年真题和重点笔记",
    "type": "pdf",
    "size": "5.2MB"
  }
  ```
- **返回值**：
  ```json
  {
    "success": true,
    "message": "资料上传成功，等待审核",
    "data": {
      "id": 1,
      "title": "高等数学上册复习资料",
      "major": "数学与应用数学",
      "grade": "大一",
      "subject": "高等数学",
      "type": "pdf",
      "size": "5.2MB",
      "downloadCount": 0,
      "uploaderId": 1,
      "uploaderName": "张三",
      "description": "包含历年真题和重点笔记",
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### 7.4 获取我的学习资料
- **接口地址**：`/study-material/my`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}`
- **返回值**：同学习资料列表

#### 7.5 下载学习资料
- **接口地址**：`/study-material/download/:id`
- **请求方式**：POST
- **请求头**：`Authorization: Bearer {token}`
- **返回值**：
  ```json
  {
    "success": true,
    "message": "下载成功",
    "data": {
      "downloadCount": 129
    }
  }
  ```

### 8. 校园论坛模块

#### 8.1 获取论坛分类
- **接口地址**：`/forum/categories`
- **请求方式**：GET
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": [
      { "id": "study", "name": "学习", "icon": "📚" },
      { "id": "life", "name": "生活", "icon": "🌟" },
      { "id": "idle", "name": "闲置", "icon": "🔄" },
      { "id": "activity", "name": "活动", "icon": "🎉" }
    ]
  }
  ```

#### 8.2 获取帖子列表
- **接口地址**：`/forum/list`
- **请求方式**：GET
- **请求参数**：
  - `category` (可选)：分类
  - `keyword` (可选)：搜索关键词
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": [
      {
        "id": 1,
        "userId": 1001,
        "userName": "张三",
        "title": "求推荐好吃的食堂窗口",
        "content": "刚来学校，想问问大家哪个食堂的哪个窗口比较好吃？",
        "category": "生活",
        "images": [],
        "likes": 15,
        "comments": [
          {
            "id": 1,
            "userId": 1002,
            "userName": "李四",
            "content": "三食堂二楼的面条不错",
            "createdAt": "2024-01-01T00:00:00.000Z"
          }
        ],
        "status": "active",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

#### 8.3 获取帖子详情
- **接口地址**：`/forum/detail/:id`
- **请求方式**：GET
- **返回值**：同帖子列表中的单个对象

#### 8.4 发布帖子
- **接口地址**：`/forum/publish`
- **请求方式**：POST
- **请求头**：`Authorization: Bearer {token}`
- **请求参数**：
  ```json
  {
    "title": "求推荐好吃的食堂窗口",
    "content": "刚来学校，想问问大家哪个食堂的哪个窗口比较好吃？",
    "category": "life",
    "images": []
  }
  ```
- **返回值**：
  ```json
  {
    "success": true,
    "message": "帖子发布成功，等待审核",
    "data": {
      "id": 1,
      "userId": 1,
      "userName": "张三",
      "title": "求推荐好吃的食堂窗口",
      "content": "刚来学校，想问问大家哪个食堂的哪个窗口比较好吃？",
      "category": "life",
      "images": [],
      "likes": 0,
      "comments": [],
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### 8.5 点赞帖子
- **接口地址**：`/forum/like/:id`
- **请求方式**：POST
- **请求头**：`Authorization: Bearer {token}`
- **返回值**：
  ```json
  {
    "success": true,
    "message": "点赞成功",
    "data": {
      "likes": 16
    }
  }
  ```

#### 8.6 评论帖子
- **接口地址**：`/forum/comment/:id`
- **请求方式**：POST
- **请求头**：`Authorization: Bearer {token}`
- **请求参数**：
  ```json
  {
    "content": "三食堂二楼的面条不错"
  }
  ```
- **返回值**：
  ```json
  {
    "success": true,
    "message": "评论成功",
    "data": {
      "id": 1,
      "userId": 1,
      "userName": "张三",
      "content": "三食堂二楼的面条不错",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### 8.7 获取我的帖子
- **接口地址**：`/forum/my`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}`
- **返回值**：同帖子列表

### 9. 后台管理模块

#### 9.1 获取统计数据
- **接口地址**：`/admin/stats`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": {
      "userCount": 100,
      "snackOrderCount": 50,
      "supermarketOrderCount": 80,
      "tutorCount": 20,
      "secondhandCount": 30,
      "forumPostCount": 60,
      "studyMaterialCount": 40
    }
  }
  ```

#### 9.2 获取用户列表
- **接口地址**：`/admin/users`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：`keyword` (可选)：搜索关键词
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": [
      {
        "id": 1,
        "studentId": "2024000001",
        "email": "student@chd.edu.cn",
        "name": "张三",
        "major": "计算机科学与技术",
        "grade": "大一",
        "role": "student",
        "status": "active",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

#### 9.3 更新用户状态
- **接口地址**：`/admin/users/:id/status`
- **请求方式**：PUT
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：
  ```json
  {
    "status": "disabled"
  }
  ```
- **返回值**：
  ```json
  {
    "success": true,
    "message": "用户状态更新成功",
    "data": {
      "id": 1,
      "studentId": "2024000001",
      "email": "student@chd.edu.cn",
      "name": "张三",
      "major": "计算机科学与技术",
      "grade": "大一",
      "role": "student",
      "status": "disabled",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### 9.4 获取小吃摊菜品列表
- **接口地址**：`/admin/snacks`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：`status` (可选)：状态筛选
- **返回值**：同小吃摊菜品列表

#### 9.5 添加小吃摊菜品
- **接口地址**：`/admin/snacks`
- **请求方式**：POST
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：
  ```json
  {
    "name": "肉夹馍",
    "price": 8.00,
    "description": "正宗陕西肉夹馍，肥而不腻",
    "image": "/uploads/snack1.jpg",
    "merchant": "东门老王肉夹馍"
  }
  ```
- **返回值**：
  ```json
  {
    "success": true,
    "message": "菜品添加成功",
    "data": {
      "id": 1,
      "name": "肉夹馍",
      "price": 8.00,
      "description": "正宗陕西肉夹馍，肥而不腻",
      "image": "/uploads/snack1.jpg",
      "merchant": "东门老王肉夹馍",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

#### 9.6 更新小吃摊菜品
- **接口地址**：`/admin/snacks/:id`
- **请求方式**：PUT
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：所有字段均为可选
- **返回值**：同添加小吃摊菜品

#### 9.7 删除小吃摊菜品
- **接口地址**：`/admin/snacks/:id`
- **请求方式**：DELETE
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **返回值**：
  ```json
  {
    "success": true,
    "message": "菜品删除成功",
    "data": null
  }
  ```

#### 9.8 获取超市商品分类
- **接口地址**：`/admin/supermarket/categories`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **返回值**：同超市商品分类

#### 9.9 添加超市商品分类
- **接口地址**：`/admin/supermarket/categories`
- **请求方式**：POST
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：
  ```json
  {
    "name": "零食",
    "icon": "🍪",
    "parentId": null
  }
  ```
- **返回值**：
  ```json
  {
    "success": true,
    "message": "分类添加成功",
    "data": {
      "id": 1,
      "name": "零食",
      "icon": "🍪",
      "parentId": null
    }
  }
  ```

#### 9.10 更新超市商品分类
- **接口地址**：`/admin/supermarket/categories/:id`
- **请求方式**：PUT
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：所有字段均为可选
- **返回值**：同添加超市商品分类

#### 9.11 删除超市商品分类
- **接口地址**：`/admin/supermarket/categories/:id`
- **请求方式**：DELETE
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **返回值**：
  ```json
  {
    "success": true,
    "message": "分类删除成功",
    "data": null
  }
  ```

#### 9.12 获取超市商品列表
- **接口地址**：`/admin/supermarket/products`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：
  - `categoryId` (可选)：分类ID
  - `status` (可选)：状态筛选
- **返回值**：同超市商品列表

#### 9.13 添加超市商品
- **接口地址**：`/admin/supermarket/products`
- **请求方式**：POST
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：
  ```json
  {
    "name": "乐事薯片原味",
    "categoryId": 4,
    "price": 8.50,
    "spec": "70g",
    "stock": 50,
    "image": "/uploads/supermarket1.jpg",
    "description": "经典原味薯片"
  }
  ```
- **返回值**：
  ```json
  {
    "success": true,
    "message": "商品添加成功",
    "data": {
      "id": 1,
      "name": "乐事薯片原味",
      "categoryId": 4,
      "price": 8.50,
      "spec": "70g",
      "stock": 50,
      "image": "/uploads/supermarket1.jpg",
      "description": "经典原味薯片",
      "status": "active"
    }
  }
  ```

#### 9.14 更新超市商品
- **接口地址**：`/admin/supermarket/products/:id`
- **请求方式**：PUT
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：所有字段均为可选
- **返回值**：同添加超市商品

#### 9.15 删除超市商品
- **接口地址**：`/admin/supermarket/products/:id`
- **请求方式**：DELETE
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **返回值**：
  ```json
  {
    "success": true,
    "message": "商品删除成功",
    "data": null
  }
  ```

#### 9.16 获取家教信息列表（管理员）
- **接口地址**：`/admin/tutors`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：`status` (可选)：状态筛选
- **返回值**：同家教信息列表

#### 9.17 审核家教信息
- **接口地址**：`/admin/tutors/:id/status`
- **请求方式**：PUT
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：
  ```json
  {
    "status": "active"
  }
  ```
- **返回值**：同家教信息列表中的单个对象

#### 9.18 删除家教信息
- **接口地址**：`/admin/tutors/:id`
- **请求方式**：DELETE
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **返回值**：
  ```json
  {
    "success": true,
    "message": "家教信息删除成功",
    "data": null
  }
  ```

#### 9.19 获取二手商品列表（管理员）
- **接口地址**：`/admin/secondhand`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：`status` (可选)：状态筛选
- **返回值**：同二手商品列表

#### 9.20 审核二手商品
- **接口地址**：`/admin/secondhand/:id/status`
- **请求方式**：PUT
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：
  ```json
  {
    "status": "active"
  }
  ```
- **返回值**：同二手商品列表中的单个对象

#### 9.21 删除二手商品
- **接口地址**：`/admin/secondhand/:id`
- **请求方式**：DELETE
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **返回值**：
  ```json
  {
    "success": true,
    "message": "二手商品删除成功",
    "data": null
  }
  ```

#### 9.22 获取学习资料列表（管理员）
- **接口地址**：`/admin/study-materials`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：`status` (可选)：状态筛选
- **返回值**：同学习资料列表

#### 9.23 审核学习资料
- **接口地址**：`/admin/study-materials/:id/status`
- **请求方式**：PUT
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：
  ```json
  {
    "status": "active"
  }
  ```
- **返回值**：同学习资料列表中的单个对象

#### 9.24 删除学习资料
- **接口地址**：`/admin/study-materials/:id`
- **请求方式**：DELETE
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **返回值**：
  ```json
  {
    "success": true,
    "message": "学习资料删除成功",
    "data": null
  }
  ```

#### 9.25 获取论坛帖子列表（管理员）
- **接口地址**：`/admin/forum-posts`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：`status` (可选)：状态筛选
- **返回值**：同帖子列表

#### 9.26 审核论坛帖子
- **接口地址**：`/admin/forum-posts/:id/status`
- **请求方式**：PUT
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：
  ```json
  {
    "status": "active"
  }
  ```
- **返回值**：同帖子列表中的单个对象

#### 9.27 删除论坛帖子
- **接口地址**：`/admin/forum-posts/:id`
- **请求方式**：DELETE
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **返回值**：
  ```json
  {
    "success": true,
    "message": "帖子删除成功",
    "data": null
  }
  ```

#### 9.28 获取订单列表（管理员）
- **接口地址**：`/admin/orders`
- **请求方式**：GET
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：
  - `type` (可选)：订单类型
  - `status` (可选)：状态筛选
- **返回值**：
  ```json
  {
    "success": true,
    "message": "操作成功",
    "data": [
      {
        "id": 1,
        "userId": 1,
        "type": "supermarket",
        "items": [
          {
            "productId": 1,
            "productName": "乐事薯片原味",
            "price": 8.50,
            "quantity": 2,
            "subtotal": 17.00
          }
        ],
        "totalAmount": 17.00,
        "address": "长安大学南校区1号宿舍楼",
        "phone": "13800138000",
        "remark": "请尽快送达",
        "status": "pending",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
  ```

#### 9.29 更新订单状态
- **接口地址**：`/admin/orders/:id/status`
- **请求方式**：PUT
- **请求头**：`Authorization: Bearer {token}` (需要管理员权限)
- **请求参数**：
  ```json
  {
    "status": "processing"
  }
  ```
- **返回值**：同订单列表中的单个对象

---

## 二、数据库对接预留接口

### 接口说明
以下接口为数据库对接预留接口，当前实现为模拟数据，后续接入真实数据库时，只需替换 `DatabaseAdapter` 类中的实现即可。

### 2.1 数据库连接接口

#### connect()
- **接口用途**：连接数据库
- **入参格式**：无
- **出参格式**：`Promise<{ connected: boolean }>`
- **数据类型**：Object
- **对接说明**：后续接入数据库时，在此方法中实现数据库连接逻辑（如 MySQL: `mysql.createConnection()`）

#### disconnect()
- **接口用途**：断开数据库连接
- **入参格式**：无
- **出参格式**：`Promise<{ disconnected: boolean }>`
- **数据类型**：Object
- **对接说明**：后续接入数据库时，在此方法中实现数据库断开连接逻辑

### 2.2 数据库查询接口

#### query(sql, params)
- **接口用途**：执行自定义SQL查询
- **入参格式**：
  - `sql`: string - SQL语句
  - `params`: Array - 参数数组
- **出参格式**：`Promise<Array>`
- **数据类型**：Array
- **对接说明**：后续接入数据库时，在此方法中实现SQL执行逻辑（如 MySQL: `connection.query(sql, params)`）

#### select(table, where, fields)
- **接口用途**：查询数据
- **入参格式**：
  - `table`: string - 表名
  - `where`: Object - 查询条件
  - `fields`: string - 查询字段（默认'*'）
- **出参格式**：`Promise<Array>`
- **数据类型**：Array
- **对接说明**：后续接入数据库时，在此方法中实现SELECT查询逻辑

### 2.3 数据库插入接口

#### insert(table, data)
- **接口用途**：插入数据
- **入参格式**：
  - `table`: string - 表名
  - `data`: Object - 插入数据
- **出参格式**：`Promise<{ insertId: number, affectedRows: number }>`
- **数据类型**：Object
- **对接说明**：后续接入数据库时，在此方法中实现INSERT逻辑
- **超市模块对接要点**：超市商品信息入库、购物车数据入库、订单数据入库均使用此接口

### 2.4 数据库更新接口

#### update(table, data, where)
- **接口用途**：更新数据
- **入参格式**：
  - `table`: string - 表名
  - `data`: Object - 更新数据
  - `where`: Object - 更新条件
- **出参格式**：`Promise<{ affectedRows: number }>`
- **数据类型**：Object
- **对接说明**：后续接入数据库时，在此方法中实现UPDATE逻辑
- **超市模块对接要点**：超市商品库存更新、订单状态更新均使用此接口

### 2.5 数据库删除接口

#### delete(table, where)
- **接口用途**：删除数据
- **入参格式**：
  - `table`: string - 表名
  - `where`: Object - 删除条件
- **出参格式**：`Promise<{ affectedRows: number }>`
- **数据类型**：Object
- **对接说明**：后续接入数据库时，在此方法中实现DELETE逻辑

### 2.6 数据库事务接口

#### transaction(callback)
- **接口用途**：执行事务
- **入参格式**：
  - `callback`: Function - 事务回调函数
- **出参格式**：`Promise<any>`
- **数据类型**：any
- **对接说明**：后续接入数据库时，在此方法中实现事务逻辑
- **超市模块对接要点**：超市下单时需要同时更新库存和创建订单，应使用事务保证数据一致性

### 2.7 各模块数据库表结构建议

#### users（用户表）
- `id`: INT PRIMARY KEY AUTO_INCREMENT
- `student_id`: VARCHAR(20) UNIQUE - 学号
- `email`: VARCHAR(100) UNIQUE - 邮箱
- `password`: VARCHAR(255) - 密码
- `name`: VARCHAR(50) - 姓名
- `major`: VARCHAR(100) - 专业
- `grade`: VARCHAR(20) - 年级
- `role`: VARCHAR(20) - 角色
- `status`: VARCHAR(20) - 状态
- `created_at`: DATETIME - 创建时间

#### email_verifications（邮箱验证表）
- `id`: INT PRIMARY KEY AUTO_INCREMENT
- `email`: VARCHAR(100) - 邮箱
- `student_id`: VARCHAR(20) - 学号
- `code`: VARCHAR(10) - 验证码
- `expiry_time`: DATETIME - 过期时间
- `created_at`: DATETIME - 创建时间

#### snacks（小吃摊菜品表）
- `id`: INT PRIMARY KEY AUTO_INCREMENT
- `name`: VARCHAR(100) - 名称
- `price`: DECIMAL(10,2) - 价格
- `description`: TEXT - 描述
- `image`: VARCHAR(255) - 图片
- `merchant`: VARCHAR(100) - 商家
- `status`: VARCHAR(20) - 状态
- `created_at`: DATETIME - 创建时间

#### supermarket_categories（超市商品分类表）
- `id`: INT PRIMARY KEY AUTO_INCREMENT
- `name`: VARCHAR(50) - 名称
- `icon`: VARCHAR(10) - 图标
- `parent_id`: INT - 父分类ID
- `created_at`: DATETIME - 创建时间

#### supermarket_products（超市商品表）
- `id`: INT PRIMARY KEY AUTO_INCREMENT
- `name`: VARCHAR(100) - 名称
- `category_id`: INT - 分类ID
- `price`: DECIMAL(10,2) - 价格
- `spec`: VARCHAR(50) - 规格
- `stock`: INT - 库存
- `image`: VARCHAR(255) - 图片
- `description`: TEXT - 描述
- `status`: VARCHAR(20) - 状态
- `created_at`: DATETIME - 创建时间

#### cart_items（购物车表）
- `id`: INT PRIMARY KEY AUTO_INCREMENT
- `user_id`: INT - 用户ID
- `product_id`: INT - 商品ID
- `quantity`: INT - 数量
- `created_at`: DATETIME - 创建时间

#### orders（订单表）
- `id`: INT PRIMARY KEY AUTO_INCREMENT
- `user_id`: INT - 用户ID
- `type`: VARCHAR(20) - 订单类型
- `items`: TEXT - 订单项（JSON）
- `total_amount`: DECIMAL(10,2) - 总金额
- `address`: VARCHAR(255) - 地址
- `phone`: VARCHAR(20) - 电话
- `remark`: TEXT - 备注
- `status`: VARCHAR(20) - 状态
- `created_at`: DATETIME - 创建时间

#### tutors（家教信息表）
- `id`: INT PRIMARY KEY AUTO_INCREMENT
- `user_id`: INT - 用户ID
- `name`: VARCHAR(50) - 姓名
- `subject`: VARCHAR(50) - 科目
- `grade`: VARCHAR(20) - 年级
- `salary`: INT - 薪资
- `description`: TEXT - 描述
- `contact`: VARCHAR(50) - 联系方式
- `status`: VARCHAR(20) - 状态
- `created_at`: DATETIME - 创建时间

#### secondhand_items（二手商品表）
- `id`: INT PRIMARY KEY AUTO_INCREMENT
- `user_id`: INT - 用户ID
- `title`: VARCHAR(100) - 标题
- `category`: VARCHAR(50) - 分类
- `price`: DECIMAL(10,2) - 价格
- `description`: TEXT - 描述
- `images`: TEXT - 图片（JSON）
- `status`: VARCHAR(20) - 状态
- `created_at`: DATETIME - 创建时间

#### user_favorites（用户收藏表）
- `id`: INT PRIMARY KEY AUTO_INCREMENT
- `user_id`: INT - 用户ID
- `type`: VARCHAR(20) - 类型
- `item_id`: INT - 项目ID
- `created_at`: DATETIME - 创建时间

#### driving_schools（驾校表）
- `id`: INT PRIMARY KEY AUTO_INCREMENT
- `name`: VARCHAR(100) - 名称
- `address`: VARCHAR(255) - 地址
- `phone`: VARCHAR(20) - 电话
- `price`: INT - 价格
- `description`: TEXT - 描述
- `features`: TEXT - 特色（JSON）
- `status`: VARCHAR(20) - 状态
- `created_at`: DATETIME - 创建时间

#### driving_inquiries（驾校咨询表）
- `id`: INT PRIMARY KEY AUTO_INCREMENT
- `user_id`: INT - 用户ID
- `school_id`: INT - 驾校ID
- `name`: VARCHAR(50) - 姓名
- `phone`: VARCHAR(20) - 电话
- `question`: TEXT - 问题
- `status`: VARCHAR(20) - 状态
- `created_at`: DATETIME - 创建时间

#### study_materials（学习资料表）
- `id`: INT PRIMARY KEY AUTO_INCREMENT
- `title`: VARCHAR(100) - 标题
- `major`: VARCHAR(100) - 专业
- `grade`: VARCHAR(20) - 年级
- `subject`: VARCHAR(50) - 学科
- `type`: VARCHAR(20) - 类型
- `size`: VARCHAR(20) - 大小
- `download_count`: INT - 下载次数
- `uploader_id`: INT - 上传者ID
- `uploader_name`: VARCHAR(50) - 上传者姓名
- `description`: TEXT - 描述
- `status`: VARCHAR(20) - 状态
- `created_at`: DATETIME - 创建时间

#### forum_posts（论坛帖子表）
- `id`: INT PRIMARY KEY AUTO_INCREMENT
- `user_id`: INT - 用户ID
- `user_name`: VARCHAR(50) - 用户名
- `title`: VARCHAR(200) - 标题
- `content`: TEXT - 内容
- `category`: VARCHAR(20) - 分类
- `images`: TEXT - 图片（JSON）
- `likes`: INT - 点赞数
- `status`: VARCHAR(20) - 状态
- `created_at`: DATETIME - 创建时间

#### forum_comments（论坛评论表）
- `id`: INT PRIMARY KEY AUTO_INCREMENT
- `post_id`: INT - 帖子ID
- `user_id`: INT - 用户ID
- `user_name`: VARCHAR(50) - 用户名
- `content`: TEXT - 内容
- `created_at`: DATETIME - 创建时间

---

## 三、状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未认证或认证失败 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 四、注意事项

1. 所有需要认证的接口都需要在请求头中携带 `Authorization: Bearer {token}`
2. 管理员接口需要用户角色为 `admin`
3. 上传图片接口需要使用 `multipart/form-data` 格式
4. 分页参数：`page` 和 `pageSize`，默认 `page=1`, `pageSize=10`
5. 所有时间格式均为 ISO 8601 格式
6. 价格字段使用 `DECIMAL(10,2)` 类型，保留两位小数
