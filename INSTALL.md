# INSTALL.md — AgentWeb Token 交易所安装部署指南

> 基于太乙AGI统一场论 · ATEX V3.1 全栈数字资产交易所

---

## 目录

1. [系统要求](#系统要求)
2. [快速安装](#快速安装)
3. [数据库初始化](#数据库初始化)
4. [启动服务](#启动服务)
5. [验证安装](#验证安装)
6. [生产部署](#生产部署)
7. [API 端点一览](#api-端点一览)
8. [常见问题](#常见问题)

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
git clone https://github.com/lisoleg/atex-exchange.git
cd atex-exchange
```

### 2. 安装后端依赖

```bash
npm install
```

**核心依赖：**

| 包名 | 版本 | 用途 |
|------|------|------|
| express | 5.x | REST API 框架 |
| @prisma/client | 6.x | ORM |
| @simplewebauthn/server | 13.x | WebAuthn / Passkey |
| jsonwebtoken | 9.x | JWT 双 Token |
| complex.js | 2.x | 复数运算 |
| mathjs | 13.x | 数学工具 |

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

# JWT 密钥（生产环境必须设置）
JWT_SECRET=your-secret-key-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# WebAuthn 配置
WEBAUTHN_RP_ID=localhost
WEBAUTHN_RP_NAME=ATEX Exchange
WEBAUTHN_ORIGIN=http://localhost:5173
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

### 数据库模型

| 模型 | 用途 | 版本 |
|------|------|------|
| Agent | 用户/Agent 身份 | V3 |
| Session | JWT 会话管理 | V3 |
| ApiKey | API Key 认证 | V3 |
| Wallet | 多钱包管理 | V3 |
| Delegation | 碳硅纠缠委托 | V3 |
| DelegationAuditLog | 委托审计日志 | V3 |
| Token | 四元Token（Calc/Wit/Word/Pass） | V1 |
| Offer | 交易报价 | V1 |
| Transaction | 交易记录 | V1 |

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

### 2. TypeScript 编译检查

```bash
# 后端
npx tsc --noEmit
# 预期：0 错误

# 前端
cd frontend && npx tsc --noEmit
# 预期：0 错误
```

### 3. 运行单元测试

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

### 4. 前端构建验证

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

    # SSE 事件流（需关闭缓冲）
    location /api/v1/stream {
        proxy_pass http://localhost:3001;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
        proxy_buffering off;
        proxy_cache off;
    }
}
```

---

## API 端点一览

### 核心交易 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/offer` | 创建报价 |
| POST | `/api/accept/:offerId` | 接受报价 |
| POST | `/api/cancel/:offerId` | 取消报价 |
| GET | `/api/orderbook` | 查询订单簿 |
| GET | `/api/history` | 查询历史交易 |

### 认证 API (V3)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/auth/register-options` | WebAuthn 注册选项 |
| POST | `/api/v1/auth/register` | 注册 + 登录 |
| POST | `/api/v1/auth/login-options` | WebAuthn 登录选项 |
| POST | `/api/v1/auth/login` | WebAuthn 登录 |
| POST | `/api/v1/auth/dev-login` | 开发模式登录 |
| POST | `/api/v1/auth/refresh` | 刷新 JWT |
| POST | `/api/v1/auth/logout` | 注销 |
| GET | `/api/v1/auth/me` | 当前用户信息 |

### 钱包 API (V3)

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/v1/wallet` | 列出钱包 |
| POST | `/api/v1/wallet/create` | 创建钱包 |
| PUT | `/api/v1/wallet/migrate` | 迁移钱包类型 |
| POST | `/api/v1/wallet/backup` | 导出备份 |
| GET | `/api/v1/wallet/balance` | 钱包余额 |

### Agent SDK API (V3)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/agent/execute` | Agent 批量执行（依赖链） |
| POST | `/api/v1/agent/negotiate` | A2A 协商 |
| POST | `/api/v1/agent/delegate` | 委托 AI 代理 |
| POST | `/api/v1/agent/prove` | 交易加密证明 |
| GET | `/api/v1/agent/capabilities` | Agent 能力查询 |
| GET | `/api/v1/agent/stream` | SSE 事件流 |
| POST | `/api/v1/apikey` | 创建 API Key |
| GET | `/api/v1/apikey` | 列出 API Key |
| DELETE | `/api/v1/apikey/:id` | 吊销 API Key |
| GET | `/api/v1/stream` | 全局 SSE 流 |

### x402 支付 + KYA 信用 API (V3)

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/payment/verify` | x402 支付验证 |
| POST | `/api/v1/payment/settle` | x402 支付结算 |
| GET | `/api/v1/payment/routes` | x402 付费路由列表 |
| GET | `/api/v1/kya/credit` | KYA 信用报告 |
| GET | `/api/v1/kya/credit/:did` | 查询他人信用 |

### V3.1 撮合引擎 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/matching/find/:offerId` | 查找撮合对手 |
| POST | `/api/matching/batch` | 批量撮合 |
| GET | `/api/matching/adaptive-tolerance` | 自适应容差 |
| GET | `/api/matching/index/stats` | Phase Index 统计 |
| GET | `/api/matching/dag/stats` | DAG 共识统计 |
| GET | `/api/matching/calibrator/stats` | 相变校准器统计 |
| GET | `/api/matching/scalability/stats` | 可扩展路由器统计 |
| GET | `/api/matching/optimizer/stats` | 三旋优化器统计 |
| GET | `/api/matching/privacy/stats` | 隐私 Φ 统计 |

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

### Q5: WebAuthn 注册失败

**原因：** WebAuthn 需要 HTTPS 或 localhost 环境。

**解决：**

1. 开发环境使用 `localhost`（浏览器会自动信任）
2. 生产环境必须配置 HTTPS（Nginx + Let's Encrypt）
3. 检查 `.env` 中的 `WEBAUTHN_RP_ID` 和 `WEBAUTHN_ORIGIN` 配置

---

### Q6: SSE 事件流不工作

**原因：** Nginx 默认缓冲 SSE 响应。

**解决：** 在 Nginx 配置中添加：

```nginx
location /api/v1/stream {
    proxy_pass http://localhost:3001;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    chunked_transfer_encoding off;
    proxy_buffering off;
    proxy_cache off;
}
```

---

### Q7: 前端 `npm run dev` 卡住或端口被占用

```bash
# 查看占用 5173 端口的进程
netstat -ano | findstr :5173   # Windows
lsof -i :5173                   # macOS / Linux

# 更换端口
cd frontend
npm run dev -- --port 5174
```

---

### Q8: 单元测试部分失败

```bash
# 清除 vitest 缓存
npx vitest run --reporter=verbose

# 单独运行某个测试文件
npx vitest run tests/math/emlPhi.test.ts
```

---

### Q9: Prisma 返回的 enum 字段类型不匹配

**原因：** Prisma + SQLite 不支持 enum，使用 String 存储但 TypeScript 类型为应用层枚举。

**解决：** 需要显式类型断言：

```typescript
// 错误：Type 'string' is not assignable to type 'TokenType'
const tokenType = token.tokenType as TokenType;

// Zod z.enum() 解析后也需要断言
const parsed = TokenTypeSchema.parse(raw) as TokenType;
```

---

## 项目目录结构

```
atex-exchange/
├── prisma/                  # 数据库 Schema + 迁移
│   ├── schema.prisma        #   含 Agent/Session/ApiKey/Wallet/Delegation 等模型
│   ├── dev.db              #   SQLite 数据库（自动生成）
│   └── migrations/         #   迁移历史
├── src/                     # 后端源码（58 个模块）
│   ├── index.ts            #   Express 入口
│   ├── api/                #   API 路由 + 中间件（16 个路由文件）
│   ├── math/               #   数学引擎（9 个模块，含 V3.1 新增 3 个）
│   ├── core/               #   核心算法（3 个模块）
│   ├── matching/           #   撮合引擎（2 个模块，V3.1 新增）
│   ├── dag/                #   DAG 共识（1 个模块，V3.1 新增）
│   ├── gateway/            #   Φ-Gateway 决策引擎（4 个模块）
│   ├── auth/               #   认证服务（2 个模块，V3 新增）
│   ├── wallet/             #   钱包服务（4 个模块，V3 新增）
│   ├── payment/            #   x402 支付（3 个模块，V3 新增）
│   ├── kya/                #   KYA 信用（1 个模块，V3 新增）
│   ├── federation/         #   联邦学习（5 个模块，含 V3.1 可扩展路由）
│   ├── consensus/          #   共识引擎（3 个模块）
│   ├── models/             #   Prisma 数据模型（3 个模块）
│   ├── types/              #   TypeScript 类型定义
│   └── config/             #   运行配置
├── frontend/               # 前端（React + MUI + Recharts）
│   ├── src/
│   │   ├── components/    #   12 个组件（含 AuthGuard/ErrorBoundary/SkeletonCard）
│   │   ├── contexts/      #   2 个 Context（Auth/Wallet）
│   │   ├── pages/         #   10 个页面（含 Login/Wallet/AgentApi/NotFound）
│   │   ├── hooks/         #   3 个 Hooks（含 useEventSource）
│   │   └── utils/         #   工具函数
│   └── dist/              #   生产构建输出
├── tests/                  # 单元测试（Vitest，7 文件 113 项）
├── docs/                   # 学术论文
│   └── atex-paper-zh.md   #   设计与实现（8 章）
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
| 认证 | @simplewebauthn/server 13 + jsonwebtoken 9 | WebAuthn + JWT |
| 加密 | AES-256-GCM + MPC-TSS 模拟 | 钱包安全 |
| 数学引擎 | 自研 + complex.js + mathjs | Φ-值运算、三旋风控 |
| 前端框架 | React 18 + TypeScript | SPA |
| UI 组件库 | MUI v5 + Tailwind CSS | 暗色主题界面 |
| 图表 | Recharts | Φ-极坐标图、热力图 |
| 状态管理 | React Context + Hooks | Auth/Wallet 上下文 |
| 实时推送 | SSE (Server-Sent Events) | 事件流 |
| 测试框架 | Vitest | 单元测试（113 项） |
| 构建工具 | Vite 5 | 前端快速构建 |

---

## 核心理论背景

本项目基于 **太乙AGI统一场论** 与 **西格玛云四元Token理论** 构建：

- **四元统一场：** Calc（计算）+ Wit（智慧）+ Word（语言）+ Pass（通行证）
- **Φ-算符：** 复数 Φ-值运算，驱动动态定价与共识梯度
- **Φ-Gateway：** 四级决策拦截（DID 验证 → 意图预测 → 反相检测 → 刘路由）
- **TAI（交易即发行）：** 碳硅纠缠网络，实现交易驱动的通证发行
- **DAG 共识：** 异步最终一致性，2/3 验证者确认
- **三旋风控：** 面旋（利率）/ 体旋（准备金）/ 线旋（链上锁仓）三维风险模型
- **139 相变：** 紫外正规化奇点消除 + CUSUM/EWMA 自动校准
- **相位索引：** 64 桶离散化，撮合复杂度 O(n)→O(log n)

> 详细理论参见学术论文：《AgentWeb Token 交易所：基于流贯动力学与 Φ-算符的设计与实现》

---

## 联系方式与贡献

- **项目主页：** https://github.com/lisoleg/atex-exchange
- **Issue 追踪：** https://github.com/lisoleg/atex-exchange/issues
- **学术论文：** 待投稿（基于太乙AGI V7.12 理论框架）

---

## License

MIT License © 2026 ATEX Development Team
