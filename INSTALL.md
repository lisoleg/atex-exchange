# INSTALL.md — AgentWeb Token 交易所安装部署指南

> 基于太乙AGI统一场论 · ATEX V2 全栈数字资产交易所

---

## 目录

1. [系统要求](#系统要求)
2. [快速安装](#快速安装)
3. [数据库初始化](#数据库初始化)
4. [启动服务](#启动服务)
5. [验证安装](#验证安装)
6. [生产部署](#生产部署)
7. [常见问题](#常见问题)

---

## 系统要求

| 组件 | 最低版本 | 推荐版本 |
|------|----------|----------|
| Node.js | v18.0.0 | v24.x (本项目使用 v24.12.0) |
| npm | v9.0.0 | v10.x |
| SQLite | 3.x | 3.40+ |
| 浏览器 | Chrome 90+ / Firefox 90+ | Chrome 最新版 |
| 内存 | 2GB | 4GB+ |
| 磁盘 | 500MB | 1GB+ |

### 操作系统支持

- ✅ Windows 10/11 (推荐)
- ✅ macOS 12+
- ✅ Linux (Ubuntu 20.04+, Debian 11+)

---

## 快速安装

### 1. 克隆仓库

```bash
git clone https://github.com/your-org/atex-exchange.git
cd atex-exchange
```

### 2. 安装后端依赖

```bash
npm install
```

### 3. 安装前端依赖

```bash
cd frontend
npm install
cd ..
```

### 4. 环境变量配置（可选）

项目默认使用内置配置，无需额外环境变量即可运行。

如需自定义，在项目根目录创建 `.env`：

```env
# 服务器端口（默认 3001）
PORT=3001

# 前端开发服务器端口（默认 5173）
VITE_API_BASE_URL=http://localhost:3001/api

# 数据库 URL（默认 SQLite，无需修改）
DATABASE_URL="file:./dev.db"

# Φ-Gateway 日志级别（debug | info | warn | error）
PHI_GATEWAY_LOG_LEVEL=info

# 刘路由表开关（true | false）
LIU_ROUTER_ENABLED=true
```

---

## 数据库初始化

本项目使用 **Prisma + SQLite**，无需安装外部数据库。

### 初始化步骤

```bash
# 1. 生成 Prisma Client
npx prisma generate

# 2. 运行数据库迁移（创建表结构）
npx prisma migrate dev --name init

# 3. （可选）用可视化界面管理数据
npx prisma studio
# 访问 http://localhost:5555
```

### 数据库文件位置

```
prisma/
├── dev.db          # SQLite 数据库文件（自动创建）
├── dev.db-journal # SQLite WAL 日志
└── schema.prisma   # 数据库 Schema 定义
```

---

## 启动服务

### 方式一：开发模式（推荐）

**终端 1 — 启动后端：**

```bash
npm run dev
# 输出：🚀 ATEX Server running on http://localhost:3001
```

**终端 2 — 启动前端：**

```bash
cd frontend
npm run dev
# 输出：➜ Local: http://localhost:5173/
```

**访问：** 打开浏览器访问 `http://localhost:5173`

---

### 方式二：生产构建

```bash
# 1. 构建前端
cd frontend
npm run build
# 输出到 frontend/dist/

# 2. 预览生产构建
npx vite preview
# 访问 http://localhost:4173

# 3. 后端生产模式
cd ..
npm run start   # （需在 package.json 中配置 build + start 脚本）
```

---

### 方式三：一键启动（Windows）

```bash
# 项目根目录执行
start-backend.bat    # 启动后端
start-frontend.bat   # 启动前端（新终端窗口）
```

---

## 验证安装

### 1. 后端健康检查

```bash
curl http://localhost:3001/api/health
# 预期输出：{ "status": "ok", "timestamp": "..." }
```

### 2. 运行单元测试

```bash
npx vitest run
```

**预期输出：**

```
 ✓ tests/math/emlPhi.test.ts (21)
 ✓ tests/math/jitterSlippage.test.ts (12)
 ✓ tests/math/triSpinRisk.test.ts (18)
 ✓ tests/core/tokenLifecycle.test.ts (29)
 ✓ tests/core/phaseEntangle.test.ts (11)
 ✓ tests/core/topologicalPhaseTransition.test.ts (9)
 ✓ tests/api/offer.test.ts (13)

 Test Files  7 passed (7)
      Tests  113 passed (113)
```

### 3. 前端构建验证

```bash
cd frontend
npm run build
```

**预期输出：** 无 TypeScript 错误，生成 `dist/` 目录。

---

## 生产部署

### 部署架构建议

```
                   ┌─────────────────┐
                   │   Nginx (反向代理) │
                   │   HTTPS / WSS    │
                   └────────┬────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
    ┌─────────▼──────┐ ┌──▼──────────┐ ┌▼──────────────┐
    │  Frontend       │ │  Backend     │ │  SQLite /     │
    │  (静态文件)     │ │  (Node.js)   │ │  PostgreSQL   │
    │  Nginx 托管     │ │  PM2 守护    │ │  (生产数据库)  │
    └────────────────┘ └─────────────┘ └───────────────┘
```

### 生产环境步骤

**1. 更换生产数据库（推荐 PostgreSQL）**

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

```bash
# .env
DATABASE_URL="postgresql://user:password@localhost:5432/atex_prod"

# 重新迁移
npx prisma migrate deploy
```

**2. 使用 PM2 守护后端进程**

```bash
npm install -g pm2

# 构建后端
npm run build

# 用 PM2 启动
pm2 start dist/index.js --name atex-backend
pm2 save
pm2 startup   # 开机自启
```

**3. 用 Nginx 托管前端 + 反向代理**

```nginx
# /etc/nginx/sites-available/atex
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/atex/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 反向代理
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 常见问题

### Q1: `npx prisma migrate dev` 报错 "enum not supported on SQLite"

**原因：** SQLite 不支持 Prisma `enum`，项目已通过 `String` 字段 + 应用层校验解决。

**解决：** 确保使用项目提供的 `schema.prisma`（已修复），然后重新运行：

```bash
rm prisma/dev.db
npx prisma migrate dev --name init
```

---

### Q2: 后端启动后前端无法连接（CORS 错误）

**原因：** 前端 dev 服务器端口与后端 CORS 配置不匹配。

**解决：** 检查 `src/index.ts` 中的 CORS 配置：

```typescript
app.use(cors({
  origin: 'http://localhost:5173',  // 确保与前端端口一致
}));
```

---

### Q3: `npm install` 报错 "node-gyp" 或 "SQLite3" 编译失败

**Windows 解决方案：**

```bash
# 安装构建工具
npm install --global windows-build-tools
# 或手动安装 Visual Studio Build Tools

# 然后重新安装
npm install
```

**替代方案：** 使用 `prisma` 内置的 SQLite（无需 native 编译）。

---

### Q4: Φ-Gateway 四级决策拦截不生效

**检查步骤：**

```bash
# 1. 确认 middleware 已注册
# 查看 src/index.ts 是否有：
app.use('/api', phiGatewayMiddleware);

# 2. 查看日志
# 发起一笔交易，观察控制台输出：
# [PhiGateway] Level-0 passed / Level-1 passed / ...
```

---

### Q5: 前端 `npm run dev` 卡住或端口被占用

```bash
# 查看占用 5173 端口的进程
netstat -ano | findstr :5173   # Windows
lsof -i :5173                   # macOS / Linux

# 更换端口
cd frontend
npm run dev -- --port 5174
```

---

### Q6: 单元测试部分失败

```bash
# 清除 vitest 缓存
npx vitest run --reporter=verbose

# 单独运行某个测试文件
npx vitest run tests/math/emlPhi.test.ts
```

---

## 项目目录结构

```
atex-exchange/
├── prisma/                  # 数据库 Schema + 迁移
│   ├── schema.prisma        #   Prisma Schema 定义
│   ├── dev.db              #   SQLite 数据库（自动生成）
│   └── migrations/         #   迁移历史
├── src/                     # 后端源码
│   ├── index.ts            #   Express 入口
│   ├── api/                #   API 路由 + 中间件
│   ├── math/               #   数学引擎（Φ-值、O-U、三旋...）
│   ├── core/               #   核心算法（相位缠绕、拓扑相变...）
│   ├── gateway/            #   Φ-Gateway 决策引擎
│   ├── federation/         #   联邦学习（ActivityPub）
│   ├── consensus/          #   共识引擎（TAI、碳硅网络）
│   ├── models/             #   Prisma 数据模型
│   ├── types/              #   TypeScript 类型定义
│   └── config/             #   运行配置
├── frontend/               # 前端（React + MUI + Recharts）
│   ├── src/
│   │   ├── components/    #   组件（Layout、OfferForm...）
│   │   ├── pages/         #   页面（Dashboard、Trade...）
│   │   ├── hooks/         #   Custom Hooks
│   │   └── utils/         #   工具函数
│   └── dist/              #   生产构建输出
├── tests/                  # 单元测试（Vitest）
├── package.json           # 后端依赖
├── tsconfig.json          # TypeScript 配置
└── vitest.config.ts       # Vitest 配置
```

---

## 技术栈一览

| 层级 | 技术 | 用途 |
|------|------|------|
| 后端框架 | Express 5 + TypeScript | REST API |
| 数据库 ORM | Prisma 6 | SQLite / PostgreSQL |
| 数据库 | SQLite（开发）/ PostgreSQL（生产） | 数据持久化 |
| 数学引擎 | 自研（Φ-值复数运算、O-U 均值回归、三旋风控） | 交易核心算法 |
| 前端框架 | React 18 + TypeScript | SPA |
| UI 组件库 | MUI (Material-UI) v5 | 暗色主题界面 |
| 图表 | Recharts | Φ-极坐标图、热力图 |
| 状态管理 | React Hooks | 局部状态 |
| 测试框架 | Vitest | 单元测试（113 项） |
| 构建工具 | Vite 5 | 前端快速构建 |

---

## 核心理论背景

本项目基于 **太乙AGI统一场论** 与 **西格玛云四元Token理论** 构建：

- **四元统一场：** Calc（计算）+ Wit（智慧）+ Word（语言）+ Pass（通行证）
- **Φ-算符：** 复数 Φ-值运算，驱动动态定价与共识梯度
- **Φ-Gateway：** 四级决策拦截（DID 验证 → 意图预测 → 反相检测 → 刘路由）
- **TAI（交易即发行）：** 碳硅纠缠网络，实现交易驱动的通证发行
- **三旋风控：** 面旋（利率）/ 体旋（准备金）/ 线旋（链上锁仓）三维风险模型
- **139 相变：** 紫外正规化奇点消除，保障系统稳定性

> 详细理论参见学术论文：《AgentWeb Token 交易所：基于流贯动力学与 Φ-算符的设计与实现》

---

## 联系方式与贡献

- **项目主页：** https://github.com/your-org/atex-exchange
- **Issue 追踪：** https://github.com/your-org/atex-exchange/issues
- **学术合作：** contact@atex-exchange.org
- **论文投稿：** 待投稿（基于太乙AGI V7.12 理论框架）

---

## License

MIT License © 2026 ATEX Development Team
