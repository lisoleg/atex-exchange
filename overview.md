# ATEX V3.1 — 交付概览

## TL;DR
基于太乙AGI统一场论的全栈交易所 ATEX V3.1，在 V3.0 Agent-First 架构基础上，新增 DAG 异步共识、相位索引 O(log n) 撮合、可扩展 Liu 路由、相变自动校准、隐私 Φ 协同计算、三旋权重优化器，解决了论文提出的全部三个开放问题。

## 四层架构

```
┌──────────────────────────────────────────────────┐
│  Layer 4: Agent Economy  ← AEON 借鉴             │
│  (x402 + KYA + A2A + 委托 + 证明)               │
├──────────────────────────────────────────────────┤
│  Layer 3: AI Agent SDK    ← HEADLESS API-first   │
│  (API Key + JWT + SSE + Agent RPC)               │
├──────────────────────────────────────────────────┤
│  Layer 2: Human Web App    ← Web2 舒适体验        │
│  (生物DID登录 + 多钱包 + 流畅UI)                 │
├──────────────────────────────────────────────────┤
│  Layer 1: Auth & Wallet Core ← 安全基座           │
│  (WebAuthn + Passkey + TSS + MPC)                │
└──────────────────────────────────────────────────┘
```

## 交付状态

| 检查项 | 状态 |
|--------|------|
| 后端 TypeScript 编译 | ✅ 零错误 |
| 前端 TypeScript 编译 | ✅ 零错误 |
| 单元测试 (7 文件 / 113 项) | ✅ 全部通过 |
| Prisma 数据库迁移 | ✅ 含 Agent/Session/ApiKey/Wallet/Delegation 模型 |
| GitHub 推送 | ✅ https://github.com/lisoleg/atex-exchange |

## 版本演进

| 版本 | 核心特性 | 后端模块数 |
|------|---------|-----------|
| V1.0 | 基础订单簿 + 撮合引擎 | ~15 |
| V2.0 | Φ-Gateway + 四元Token + ActivityPub + TAI | 34 |
| V3.0 | Agent-First（WebAuthn + 多钱包 + x402 + KYA + A2A） | 51 |
| V3.1 | 性能优化（DAG + 相位索引 + 可扩展Liu + 相变校准 + 隐私Φ + 三旋优化） | 58 |

## V3.0 新增（借鉴 AEON）

### x402 支付协议（借鉴 AEON Protocol Kernel）
- HTTP 402 Payment Required 中间件
- X-PAYMENT / X-PAYMENT-RESPONSE 头部标准
- 支付验证与结算服务
- 可验证收据（ERC-8004 风格：交易证明 + 用途证明 + 授权证明）

### KYA 信用系统（借鉴 AEON KYA）
- 5 维信用因子：交易历史(30%) + Φ值稳定性(25%) + 钱包安全(20%) + DID验证(15%) + 活跃时间(10%)
- 6 级信用等级：UNRATED → BRONZE → SILVER → GOLD → PLATINUM → DIAMOND
- Agent 信用报告 API

### A2A 协议（借鉴 AEON Agent-to-Agent）
- Agent 间协商（报价/还价）
- 人类委托 AI 代理执行交易
- 批量执行增强（依赖链 + 条件分支）
- 交易加密证明（三重证明）

### 碳硅纠缠（人机委托）
- 委托关系管理（创建/查询/撤销）
- 代理权限分级
- 操作审计日志
- 金额限制和追踪

## V3.1 新增（性能优化 + 开放问题解决）

| 模块 | 文件 | 行数 | 解决问题 | 性能提升 |
|------|------|------|---------|---------|
| DAG 异步共识引擎 | `dag/dagConsensus.ts` | 479 | TAI 即时发行 → 异步最终一致性 | 2/3 验证者确认 |
| 相位索引 | `matching/phaseIndex.ts` | 312 | 撮合 O(n) → O(log n) | 64 桶相位空间离散化 |
| 相位纠缠撮合引擎 | `matching/phaseMatchingEngine.ts` | 165 | 基于相位索引的优化撮合 | 自适应容差匹配 |
| 可扩展 Liu 路由器 | `federation/scalableLiuRouter.ts` | 238 | 百万级 Liu 路由 | KD-Tree O(K·log n) |
| 139 相变校准器 | `math/phaseCalibrator.ts` | 385 | 手动阈值 → 自动校准 | CUSUM + EWMA |
| 隐私 Φ 协同 | `math/privacyPhi.ts` | 247 | 隐私保护的 Φ 协同计算 | MPC 秘密共享 + 安全内积 |
| 三旋权重优化器 | `math/triSpinOptimizer.ts` | 306 | 权重自适应全局最优 | 贝叶斯优化搜索 |
| 撮合路由 | `api/routes/matching.routes.ts` | 147 | 9 个新 API 端点 | — |

### 开放问题解决对照

| 论文 §7.3 开放问题 | V3.1 解决方案 | 关键技术 |
|-------------------|-------------|---------|
| 隐私保护的 Φ 协同计算 | `privacyPhi.ts` | MPC 加法秘密共享 + 安全内积 |
| 三旋风控权重全局最优 | `triSpinOptimizer.ts` | 贝叶斯优化搜索 |
| 百万级 Liu 路由可扩展性 | `scalableLiuRouter.ts` | KD-Tree Φ 空间索引 |
| 撮合 O(n) 复杂度 | `phaseIndex.ts` + `phaseMatchingEngine.ts` | 64 桶相位索引 |
| TAI 即时发行 | `dagConsensus.ts` | DAG 异步最终一致性 |
| 139 相变手动阈值 | `phaseCalibrator.ts` | CUSUM + EWMA 自适应 |

## 完整 API 端点（58 个）

### 核心交易 (5)

| 端点 | 说明 | 版本 |
|------|------|------|
| POST /api/offer | 创建报价 | V1 |
| POST /api/accept/:offerId | 接受报价 | V1 |
| POST /api/cancel/:offerId | 取消报价 | V1 |
| GET /api/orderbook | 查询订单簿 | V1 |
| GET /api/history | 查询历史交易 | V1 |

### 认证 (8)

| 端点 | 说明 | 版本 |
|------|------|------|
| POST /api/v1/auth/register-options | WebAuthn 注册选项 | V3 |
| POST /api/v1/auth/register | 注册 + 登录 | V3 |
| POST /api/v1/auth/login-options | WebAuthn 登录选项 | V3 |
| POST /api/v1/auth/login | WebAuthn 登录 | V3 |
| POST /api/v1/auth/dev-login | 开发模式登录 | V3 |
| POST /api/v1/auth/refresh | 刷新 JWT | V3 |
| POST /api/v1/auth/logout | 注销 | V3 |
| GET /api/v1/auth/me | 当前用户信息 | V3 |

### 钱包 (5)

| 端点 | 说明 | 版本 |
|------|------|------|
| GET /api/v1/wallet | 列出钱包 | V3 |
| POST /api/v1/wallet/create | 创建钱包 | V3 |
| PUT /api/v1/wallet/migrate | 迁移钱包类型 | V3 |
| POST /api/v1/wallet/backup | 导出备份 | V3 |
| GET /api/v1/wallet/balance | 钱包余额 | V3 |

### Agent SDK (10)

| 端点 | 说明 | 版本 |
|------|------|------|
| POST /api/v1/agent/execute | Agent 批量执行（依赖链） | V3 |
| POST /api/v1/agent/negotiate | A2A 协商 | V3 |
| POST /api/v1/agent/delegate | 委托 AI 代理 | V3 |
| POST /api/v1/agent/prove | 交易加密证明 | V3 |
| GET /api/v1/agent/capabilities | Agent 能力查询 | V3 |
| GET /api/v1/agent/stream | SSE 事件流 | V3 |
| POST /api/v1/apikey | 创建 API Key | V3 |
| GET /api/v1/apikey | 列出 API Key | V3 |
| DELETE /api/v1/apikey/:id | 吊销 API Key | V3 |
| GET /api/v1/stream | 全局 SSE 流 | V3 |

### x402 支付 + KYA 信用 (5)

| 端点 | 说明 | 版本 |
|------|------|------|
| POST /api/v1/payment/verify | x402 支付验证 | V3 |
| POST /api/v1/payment/settle | x402 支付结算 | V3 |
| GET /api/v1/payment/routes | x402 付费路由列表 | V3 |
| GET /api/v1/kya/credit | KYA 信用报告 | V3 |
| GET /api/v1/kya/credit/:did | 查询他人信用 | V3 |

### V3.1 撮合引擎 (9)

| 端点 | 说明 | 版本 |
|------|------|------|
| GET /api/matching/find/:offerId | 查找撮合对手 | V3.1 |
| POST /api/matching/batch | 批量撮合 | V3.1 |
| GET /api/matching/adaptive-tolerance | 自适应容差 | V3.1 |
| GET /api/matching/index/stats | Phase Index 统计 | V3.1 |
| GET /api/matching/dag/stats | DAG 共识统计 | V3.1 |
| GET /api/matching/calibrator/stats | 相变校准器统计 | V3.1 |
| GET /api/matching/scalability/stats | 可扩展路由器统计 | V3.1 |
| GET /api/matching/optimizer/stats | 三旋优化器统计 | V3.1 |
| GET /api/matching/privacy/stats | 隐私 Φ 统计 | V3.1 |

## 文件清单

### 后端 — V3.1 新增 (8 个文件)
- `src/dag/dagConsensus.ts` — DAG 异步共识引擎 (479 行)
- `src/matching/phaseIndex.ts` — 相位索引 (312 行)
- `src/matching/phaseMatchingEngine.ts` — 相位纠缠撮合引擎 (165 行)
- `src/federation/scalableLiuRouter.ts` — 可扩展 Liu 路由器 (238 行)
- `src/math/phaseCalibrator.ts` — 139 相变自动校准器 (385 行)
- `src/math/privacyPhi.ts` — 隐私 Φ 协同计算 (247 行)
- `src/math/triSpinOptimizer.ts` — 三旋权重优化器 (306 行)
- `src/api/routes/matching.routes.ts` — 撮合路由 (147 行)

### 后端 — V3.0 新增 (7 个文件)
- `src/payment/x402.types.ts` — x402 协议类型定义
- `src/payment/x402.middleware.ts` — HTTP 402 支付中间件
- `src/payment/x402.service.ts` — 支付验证/结算/收据服务
- `src/kya/kya.service.ts` — KYA 信用系统
- `src/api/routes/payment.routes.ts` — 支付路由
- `src/api/routes/kya.routes.ts` — KYA 路由
- `src/wallet/delegation.service.ts` — 碳硅纠缠委托服务

### 后端 — V3.0 认证/钱包 (9 个文件)
- `src/auth/jwt.service.ts` / `src/auth/webauthn.service.ts`
- `src/api/middleware/auth.middleware.ts`
- `src/api/routes/{auth,wallet,agent,apikey,stream}.routes.ts`
- `src/wallet/{custodial,threshold,self-custody}.service.ts`

### 后端 — V2 文件 (18 个)
- `src/math/` (6) + `src/core/` (3) + `src/gateway/` (4)
- `src/federation/` (3, 不含 scalableLiuRouter) + `src/consensus/` (3)
- `src/api/routes/` (5) + `src/api/middleware/` (2)
- `src/models/` (3) + `src/config/` (1) + `src/types/` (1) + `src/index.ts`

### 前端 (21 个)
- `contexts/{Auth,Wallet}Context.tsx`
- `components/{AuthGuard,ErrorBoundary,SkeletonCard,Layout,PhiStatusBar,TokenBalanceCard,PhasePolarChart,OfferForm,OrderBookTable,PhaseHeatmap,TransactionTable}.tsx`
- `pages/{Dashboard,Trade,Liquidity,History,Settings,LoginPage,OnboardingPage,WalletPage,AgentApiPage,NotFoundPage}.tsx`
- `hooks/{useAtexApi,usePhiValue,useEventSource}.ts`

## AEON 借鉴对比

| AEON 特性 | ATEX 实现 | 对应文件 |
|-----------|-----------|---------|
| x402 Protocol Kernel | HTTP 402 支付中间件 + X-PAYMENT 头 | `src/payment/x402.*` |
| Distributed Trust Hub | Φ-Gateway 验证 + 原子终局性 | `x402.service.ts` |
| ERC-8004 可验证收据 | 三重加密证明（交易+用途+授权） | `x402.service.ts` |
| KYA 信用系统 | 5维因子 + 6级信用 | `src/kya/kya.service.ts` |
| A2A 交互 | negotiate/delegate/prove 端点 | `agent.routes.ts` |
| Agent 支付 | 四元 Token 结算 | `x402.service.ts` |
| 碳硅纠缠（人机协作） | Delegation + 审计日志 | `delegation.service.ts` |

## 钱包模式

| 模式 | 私钥位置 | 安全级别 | 适用场景 |
|------|---------|---------|---------|
| 托管 (CUSTODIAL) | 服务端 AES-256-GCM | ★★★ | 新手、快速上手 |
| 门限 (THRESHOLD) | 2-of-3 MPC 分片 | ★★★★ | 安全与便捷平衡 |
| 自托管 (SELF_CUSTODY) | 仅浏览器 IndexedDB | ★★★★★ | 高级用户、完全自主 |

## 用户下一步建议

1. **启动**: `npm run dev` + `cd frontend && npm run dev`
2. **开发登录**: 访问 http://localhost:5173 → 点击"开发模式登录"
3. **创建钱包**: 登录后选择钱包类型（推荐门限钱包）
4. **KYA 信用**: `GET /api/v1/kya/credit` 查看信用报告
5. **A2A 协商**: `POST /api/v1/agent/negotiate` Agent 间协商
6. **x402 支付**: `POST /api/v1/payment/settle` 执行 Token 结算
7. **委托代理**: `POST /api/v1/agent/delegate` 委托 AI Agent
8. **撮合引擎**: `GET /api/matching/index/stats` 查看 Phase Index 统计
9. **DAG 共识**: `GET /api/matching/dag/stats` 查看共识状态
