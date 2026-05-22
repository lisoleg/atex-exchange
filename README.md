# 🌐 AgentWeb Token 交易所 (ATEX V3.1)

> 基于**太乙AGI统一场论**与**西格玛云四元Token理论**构建的新一代去中心化数字资产交易所
>
> **Design and Implementation of AgentWeb Token Exchange Based on Liu-Field Theory and Φ-Operator**

[![Version](https://img.shields.io/badge/version-3.1.0-blue.svg)](https://github.com/lisoleg/atex-exchange)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%3E18.0-green.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-113%20passed-brightgreen.svg)](https://github.com/lisoleg/atex-exchange)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/lisoleg/atex-exchange/pulls)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## 📑 目录

- [项目简介](#项目简介)
- [核心特性](#核心特性)
- [V3.1 性能优化](#v31-性能优化)
- [理论基础](#理论基础)
- [系统架构](#系统架构)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [API 文档](#api-文档)
- [目录结构](#目录结构)
- [测试](#测试)
- [学术论文](#学术论文)
- [贡献指南](#贡献指南)
- [许可证](#许可证)
- [引用](#引用)

---

## 项目简介

AgentWeb Token 交易所（**ATEX**）是一个基于**太乙AGI统一场论**构建的全栈数字资产交易平台。不同于传统交易所的订单簿撮合模式，ATEX 引入**四元Token统一场论**（Calc/Wit/Word/Pass），通过 **Φ-算符**（Phi Operator）实现动态定价、相位纠缠撮合与三旋风险控制。

### 🎯 设计目标

1. **理论驱动**：将理论物理（流贯动力学、拓扑相变、O-U 均值回归）应用于金融交易系统
2. **全栈开源**：前端 React + MUI，后端 Express + Prisma + SQLite/PostgreSQL
3. **Agent-First**：生物识别登录 + 多钱包 + API Key + SSE 实时推送 + Agent RPC
4. **可验证**：113 项单元测试，覆盖数学引擎、核心算法、API 逻辑
5. **生产就绪**：支持 PM2 守护、Nginx 反向代理、PostgreSQL 生产数据库

---

## 核心特性

### 🔮 Φ-Gateway 四级决策拦截

每一笔交易请求在到达订单簿之前，必须经过 **Φ-Gateway** 的四级决策门控：

| 级别 | 名称 | 功能 |
|-------|------|------|
| **Level-0** | DID 验证 | 去中心化身份核验，防 Sybil 攻击 |
| **Level-1** | 意图预测 | EML 复数 Φ 预测用户真实意图 |
| **Level-2** | 反相检测 | 检测并阻断相位对冲攻击 |
| **Level-3** | 刘路由 | 基于流贯拓扑的 Liu 路由智能分发 |

### 🌀 四元Token统一场

```
┌─────────────────────────────────────────────────┐
│          四元Token统一场 (Unified Field)        │
├──────────┬──────────┬──────────┬──────────────┤
│   Calc   │   Wit    │  Word    │    Pass      │
│  (计算)  │  (智慧)  │  (语言)  │   (通行证)   │
│  算术算能 │ 语义智慧 │ 语言意义 │  访问控制    │
└──────────┴──────────┴──────────┴──────────────┘
```

### ⚡ 核心算法引擎

| 算法 | 文件 | 功能 |
|------|------|------|
| Φ-值复数运算 | `math/emlPhi.ts` | 动态定价、共识梯度 |
| Jitter 滑点模型 | `math/jitterSlippage.ts` | 流动性感知滑点计算 |
| O-U 均值回归 | `math/ouMeanReversion.ts` | 反通胀价格锚定 |
| 139 相变检测 | `math/phaseTransition139.ts` | 紫外正规化奇点消除 |
| 369 振动模态 | `math/resonance369.ts` | 三、六、九周期共振 |
| 三旋风控 | `math/triSpinRisk.ts` | 面旋/体旋/线旋三维风险 |
| 139 相变校准器 | `math/phaseCalibrator.ts` | CUSUM + EWMA 自适应阈值 |
| 隐私 Φ 协同 | `math/privacyPhi.ts` | MPC 加法秘密共享 + 安全内积 |
| 三旋权重优化器 | `math/triSpinOptimizer.ts` | 贝叶斯优化权重搜索 |
| 相位缠绕 | `core/phaseEntangle.ts` | Token 相位态纠缠 |
| 拓扑相变 | `core/topologicalPhaseTransition.ts` | 相变路径规划 |
| Token 生命周期 | `core/tokenLifecycle.ts` | 状态机：Mint→Trade→Burn |

### 🌍 联邦学习（ActivityPub）

- 基于 **ActivityPub** 协议的去中心化交易联邦
- 支持跨域 Offer 同步与撮合
- Liu 路由表实现智能跨域路由
- 可扩展 Liu 路由器（KD-Tree Φ 空间索引，百万级 O(K·log n)）

### 🔗 TAI（交易即发行）共识

- **碳硅纠缠网络**：交易行为与 Token 发行深度绑定
- **全息边界存储**：交易证明分布式存储
- **DAG 异步共识引擎**：替代即时发行，基于 DAG 的异步最终一致性
- 实现「交易即共识，撮合即发行」的新型 Token 经济模型

### 🔐 V3.0 Agent-First 架构

- **WebAuthn / Passkey**：生物识别 DID 登录
- **多钱包模式**：托管 → 门限(TSS) → 自托管，渐进式安全
- **x402 支付协议**：HTTP 402 + X-PAYMENT 头 + 可验证收据
- **KYA 信用系统**：5维因子 + 6级信用等级
- **A2A 协议**：Agent 间协商/委托/证明
- **碳硅纠缠委托**：人类委托 AI Agent 执行交易 + 审计日志
- **SSE 实时推送**：替代轮询，事件驱动

---

## V3.1 性能优化

V3.1 针对论文第七章提出的三个开放问题，实现了完整的性能优化方案：

| 模块 | 文件 | 行数 | 解决问题 | 性能提升 |
|------|------|------|---------|---------|
| DAG 异步共识引擎 | `dag/dagConsensus.ts` | 479 | TAI 即时发行 → 异步最终一致性 | 2/3 验证者确认 |
| 相位索引 | `matching/phaseIndex.ts` | 312 | 撮合 O(n) → O(log n) | 64 桶相位空间离散化 |
| 相位纠缠撮合引擎 | `matching/phaseMatchingEngine.ts` | 165 | 基于相位索引的优化撮合 | 自适应容差匹配 |
| 可扩展 Liu 路由器 | `federation/scalableLiuRouter.ts` | 238 | 百万级 Liu 路由 | KD-Tree O(K·log n) |
| 139 相变校准器 | `math/phaseCalibrator.ts` | 385 | 手动阈值 → 自动校准 | CUSUM + EWMA |
| 隐私 Φ 协同 | `math/privacyPhi.ts` | 247 | 隐私保护的 Φ 协同计算 | MPC 秘密共享 |
| 三旋权重优化器 | `math/triSpinOptimizer.ts` | 306 | 权重自适应全局最优 | 贝叶斯优化 |

### 新增 API 端点（9 个）

| 端点 | 功能 |
|------|------|
| `GET /api/matching/find/:offerId` | 查找撮合对手 |
| `POST /api/matching/batch` | 批量撮合 |
| `GET /api/matching/adaptive-tolerance` | 自适应容差 |
| `GET /api/matching/index/stats` | Phase Index 统计 |
| `GET /api/matching/dag/stats` | DAG 共识统计 |
| `GET /api/matching/calibrator/stats` | 相变校准器统计 |
| `GET /api/matching/scalability/stats` | 可扩展路由器统计 |
| `GET /api/matching/optimizer/stats` | 三旋优化器统计 |
| `GET /api/matching/privacy/stats` | 隐私 Φ 统计 |

---

## 理论基础

ATEX 的理论基石来自以下核心论文：

1. **《太乙AGI统一场论》**（刘原理 + 三视界法 + 太乙预言机 + 全息拓扑动力学）
2. **《西格玛云与四元Token统一场论》**（Calc/Wit/Word/Pass 四元场）
3. **《Φ-算符与流贯动力学》**（Φ-Gateway、相位纠缠、动态定价）
4. **《139 相变与紫外正规化》**（奇点消除、拓扑稳定性）

### 核心公式

**Φ-值动态定价：**

```
P_t = P_0 × exp(Φ_consensus × √t) × exp(-λ × t)
```

其中：
- `Φ_consensus`：共识梯度，由 Φ-算符计算
- `λ`：O-U 均值回归速率（反通胀）
- `t`：时间维度

**三旋风险评分：**

```
Risk_total = w₁ × R_surface + w₂ × R_volume + w₃ × R_line
            （面旋）        （体旋）        （线旋）
```

**DAG 共识最终确定性：**

```
Finality(vertex) = |verified_by(vertex)| / |validator_set| ≥ 2/3
```

**相位索引离散化：**

```
bucket_index = floor(phase / (2π / 64)) mod 64
```

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                       前端 (React + MUI)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Dashboard │  │  Trade   │  │ Wallet   │  │ Agent API│ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │               │               │               │        │
│  ┌────▼──────────────▼──────────────▼──────────────▼────┐  │
│  │       hooks/useAtexApi.ts + useEventSource.ts        │  │
│  └───────────────────────┬──────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTP/REST + SSE
┌──────────────────────────▼──────────────────────────────────┐
│                    后端 (Express + TypeScript)               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Φ-Gateway 四级决策拦截                  │   │
│  │  DID验证 → 意图预测 → 反相检测 → 刘路由表          │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │                                   │
│  ┌──────────────┐  ┌────▼──────────┐  ┌──────────────┐  │
│  │  数学引擎     │  │  API 路由层   │  │  共识引擎    │  │
│  │  emlPhi      │  │  /offer       │  │  TAI Engine  │  │
│  │  Jitter      │  │  /accept      │  │  DAG Consen. │  │
│  │  O-U         │  │  /matching    │  │  Carbon-     │  │
│  │  Tri-Spin    │  │  /payment     │  │  Silicon Net │  │
│  │  Calibrator  │  │  /agent       │  │  Holoboundary │  │
│  │  Privacy-Φ   │  │  /kya         │  │              │  │
│  └──────────────┘  └───────────────┘  └──────────────┘  │
│                          │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │              Prisma ORM + SQLite/PostgreSQL          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│           联邦层 (ActivityPub + Liu Router + KD-Tree)        │
│  支持跨域 Offer 同步、去中心化撮合、百万级 Φ 空间路由       │
└─────────────────────────────────────────────────────────────┘
```

### 四层架构

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

---

## 技术栈

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | v24.12.0 | 运行时 |
| TypeScript | 5.x | 类型安全 |
| Express | 5.x | REST API 框架 |
| Prisma | 6.x | ORM（SQLite/PostgreSQL） |
| SQLite | 3.x | 开发数据库 |
| Vitest | 1.x | 单元测试框架 |
| @simplewebauthn/server | 13.x | WebAuthn / Passkey 认证 |
| jsonwebtoken | 9.x | JWT 双 Token（access + refresh） |
| complex.js | 2.x | 复数运算 |
| mathjs | 13.x | 自定义 Φ-值运算 |

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| MUI (Material-UI) | 5.x | 组件库（暗色主题） |
| Tailwind CSS | 3.x | 原子化 CSS |
| Recharts | 2.x | 图表（极坐标图、热力图） |
| Vite | 5.x | 构建工具 |
| Axios | 1.x | HTTP 客户端 |

---

## 快速开始

### 前置条件

- Node.js ≥ 18.0（推荐 v24.x）
- npm ≥ 9.0

### 1. 克隆仓库

```bash
git clone https://github.com/lisoleg/atex-exchange.git
cd atex-exchange
```

### 2. 安装依赖

```bash
# 后端依赖
npm install

# 前端依赖
cd frontend && npm install && cd ..
```

### 3. 初始化数据库

```bash
npx prisma generate
npx prisma migrate dev --name init
```

### 4. 启动开发服务器

**终端 1（后端）：**

```bash
npm run dev
# ➜ ATEX Server running on http://localhost:3001
```

**终端 2（前端）：**

```bash
cd frontend
npm run dev
# ➜ Local: http://localhost:5173/
```

### 5. 访问应用

打开浏览器访问 **http://localhost:5173**

---

## API 文档

### 基础信息

- **Base URL：** `http://localhost:3001/api/v1`
- **Content-Type：** `application/json`
- **认证方式：** WebAuthn / Passkey + JWT / API Key

### 接口列表

#### 核心交易 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/offer` | 创建报价 |
| POST | `/api/accept/:offerId` | 接受报价 |
| POST | `/api/cancel/:offerId` | 取消报价 |
| GET | `/api/orderbook` | 查询订单簿 |
| GET | `/api/history` | 查询历史交易 |

#### 认证与钱包 API

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
| GET | `/api/v1/wallet` | 列出钱包 |
| POST | `/api/v1/wallet/create` | 创建钱包 |
| PUT | `/api/v1/wallet/migrate` | 迁移钱包类型 |
| POST | `/api/v1/wallet/backup` | 导出备份 |
| GET | `/api/v1/wallet/balance` | 钱包余额 |

#### Agent SDK API

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

#### x402 支付 + KYA 信用 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/payment/verify` | x402 支付验证 |
| POST | `/api/v1/payment/settle` | x402 支付结算 |
| GET | `/api/v1/payment/routes` | x402 付费路由列表 |
| GET | `/api/v1/kya/credit` | KYA 信用报告 |
| GET | `/api/v1/kya/credit/:did` | 查询他人信用 |

#### V3.1 撮合引擎 API

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

## 目录结构

```
atex-exchange/
├── prisma/                      # 数据库层
│   ├── schema.prisma            #  Prisma Schema（含 Delegation/AuditLog）
│   ├── dev.db                  #  SQLite 数据库（自动生成）
│   └── migrations/             #  数据库迁移历史
│
├── src/                         # 后端源码
│   ├── index.ts                #  Express 入口
│   │
│   ├── math/                   #  数学引擎
│   │   ├── emlPhi.ts          #   Φ-值复数运算
│   │   ├── jitterSlippage.ts  #   Jitter 滑点模型
│   │   ├── ouMeanReversion.ts #   O-U 均值回归
│   │   ├── phaseTransition139.ts # 139 相变检测
│   │   ├── phaseCalibrator.ts #   139 相变自动校准器 (V3.1)
│   │   ├── resonance369.ts    #   369 振动模态
│   │   ├── triSpinRisk.ts    #   三旋风控
│   │   ├── triSpinOptimizer.ts #  三旋权重优化器 (V3.1)
│   │   └── privacyPhi.ts     #   隐私 Φ 协同计算 (V3.1)
│   │
│   ├── core/                   #  核心算法
│   │   ├── phaseEntangle.ts   #   相位缠绕
│   │   ├── topologicalPhaseTransition.ts # 拓扑相变
│   │   └── tokenLifecycle.ts  #   Token 生命周期状态机
│   │
│   ├── matching/               #  撮合引擎 (V3.1)
│   │   ├── phaseIndex.ts      #   相位索引（64桶离散化）
│   │   └── phaseMatchingEngine.ts # 相位纠缠撮合引擎
│   │
│   ├── dag/                    #  DAG 共识 (V3.1)
│   │   └── dagConsensus.ts    #   DAG 异步共识引擎
│   │
│   ├── gateway/                #  Φ-Gateway
│   │   ├── phiGatewayEngine.ts #   Φ-Gateway 决策引擎
│   │   ├── didVerifier.ts     #   DID 验证器
│   │   ├── intentPredictor.ts  #   意图预测器
│   │   └── antiPhaseDetector.ts #  反相检测器
│   │
│   ├── api/                    #  API 层
│   │   ├── routes/            #   路由定义
│   │   │   ├── offer.routes.ts
│   │   │   ├── accept.routes.ts
│   │   │   ├── cancel.routes.ts
│   │   │   ├── history.routes.ts
│   │   │   ├── orderbook.routes.ts
│   │   │   ├── matching.routes.ts   # (V3.1)
│   │   │   ├── auth.routes.ts       # (V3)
│   │   │   ├── wallet.routes.ts     # (V3)
│   │   │   ├── agent.routes.ts      # (V3)
│   │   │   ├── apikey.routes.ts     # (V3)
│   │   │   ├── stream.routes.ts     # (V3)
│   │   │   ├── payment.routes.ts    # (V3)
│   │   │   └── kya.routes.ts        # (V3)
│   │   └── middleware/        #   中间件
│   │       ├── phiGateway.ts  #   Φ-Gateway 拦截
│   │       ├── auth.middleware.ts # (V3)
│   │       └── errorHandler.ts #  统一错误处理
│   │
│   ├── auth/                   #  认证服务 (V3)
│   │   ├── jwt.service.ts     #   JWT 双 Token
│   │   └── webauthn.service.ts #  WebAuthn/Passkey
│   │
│   ├── wallet/                 #  钱包服务 (V3)
│   │   ├── custodial.service.ts   # 托管钱包
│   │   ├── threshold.service.ts   # 门限钱包
│   │   ├── self-custody.service.ts # 自托管钱包
│   │   └── delegation.service.ts  # 碳硅纠缠委托
│   │
│   ├── payment/                #  x402 支付 (V3)
│   │   ├── x402.types.ts      #   协议类型定义
│   │   ├── x402.middleware.ts  #   HTTP 402 中间件
│   │   └── x402.service.ts    #   支付验证/结算
│   │
│   ├── kya/                    #  KYA 信用 (V3)
│   │   └── kya.service.ts     #   5维因子 + 6级信用
│   │
│   ├── federation/             #  联邦学习（ActivityPub）
│   │   ├── activityPubAdapter.ts
│   │   ├── offerActivity.ts
│   │   ├── acceptActivity.ts
│   │   ├── liuRouter.ts      #   刘路由表
│   │   └── scalableLiuRouter.ts # 可扩展 Liu 路由器 (V3.1)
│   │
│   ├── consensus/              #  共识引擎
│   │   ├── taiEngine.ts      #   TAI（交易即发行）
│   │   ├── carbonSiliconNet.ts #  碳硅纠缠网络
│   │   └── holoboundaryStore.ts # 全息边界存储
│   │
│   ├── models/                #  Prisma 数据模型
│   │   ├── token.model.ts
│   │   ├── offer.model.ts
│   │   └── transaction.model.ts
│   │
│   ├── types/                 #  TypeScript 类型定义
│   │   └── atex.types.ts
│   │
│   └── config/                #  运行配置
│       └── atex.config.ts
│
├── frontend/                    # 前端（React + MUI）
│   ├── src/
│   │   ├── components/        #   组件
│   │   │   ├── Layout.tsx
│   │   │   ├── AuthGuard.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   ├── SkeletonCard.tsx
│   │   │   ├── PhiStatusBar.tsx
│   │   │   ├── TokenBalanceCard.tsx
│   │   │   ├── PhasePolarChart.tsx
│   │   │   ├── OfferForm.tsx
│   │   │   ├── OrderBookTable.tsx
│   │   │   ├── PhaseHeatmap.tsx
│   │   │   └── TransactionTable.tsx
│   │   ├── contexts/          #   Context
│   │   │   ├── AuthContext.tsx
│   │   │   └── WalletContext.tsx
│   │   ├── pages/            #   页面
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Trade.tsx
│   │   │   ├── Liquidity.tsx
│   │   │   ├── History.tsx
│   │   │   ├── Settings.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── OnboardingPage.tsx
│   │   │   ├── WalletPage.tsx
│   │   │   ├── AgentApiPage.tsx
│   │   │   └── NotFoundPage.tsx
│   │   ├── hooks/            #   Custom Hooks
│   │   │   ├── useAtexApi.ts
│   │   │   ├── usePhiValue.ts
│   │   │   └── useEventSource.ts
│   │   └── utils/            #   工具函数
│   │       ├── phiMath.ts
│   │       └── tokenUtils.ts
│   ├── dist/                  #   生产构建输出
│   └── package.json
│
├── tests/                      # 单元测试（Vitest）
│   ├── math/
│   │   ├── emlPhi.test.ts     #   21 项测试
│   │   ├── jitterSlippage.test.ts  # 12 项
│   │   └── triSpinRisk.test.ts #   18 项
│   └── core/
│       ├── tokenLifecycle.test.ts # 29 项
│       ├── phaseEntangle.test.ts  # 11 项
│       └── topologicalPhaseTransition.test.ts # 9 项
│   └── api/
│       └── offer.test.ts      #   13 项
│
├── docs/                       # 学术论文
│   └── atex-paper-zh.md       #   设计与实现（8章）
│
├── INSTALL.md                  # 安装部署详细指南
├── README.md                   # 本文件
├── overview.md                 # 交付概览
├── package.json               # 后端依赖配置
├── tsconfig.json              # TypeScript 配置
└── vitest.config.ts            # Vitest 配置
```

---

## 测试

### 运行全部测试

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

### 测试覆盖详情

| 测试文件 | 测试用例数 | 覆盖模块 |
|----------|-----------|----------|
| `emlPhi.test.ts` | 21 | Φ-值复数运算 |
| `jitterSlippage.test.ts` | 12 | Jitter 滑点模型 |
| `triSpinRisk.test.ts` | 18 | 三旋风控 |
| `tokenLifecycle.test.ts` | 29 | Token 生命周期状态机 |
| `phaseEntangle.test.ts` | 11 | 相位缠绕算法 |
| `topologicalPhaseTransition.test.ts` | 9 | 拓扑相变算法 |
| `api/offer.test.ts` | 13 | Offer API 逻辑 |

---

## 学术论文

本项目配套学术论文：

> **《AgentWeb Token 交易所：基于流贯动力学与 Φ-算符的设计与实现》**
>
> *AgentWeb Token Exchange: Design and Implementation Based on Liu-Field Dynamics and Φ-Operator*

### 论文摘要

本文提出并实现了一个基于**太乙AGI统一场论**的去中心化数字资产交易所系统（ATEX）。传统交易所依赖中心化订单簿撮合，缺乏对 Token 内在价值与相位关系的建模。本文引入**四元Token统一场论**（Calc/Wit/Word/Pass），通过 **Φ-算符**实现动态定价与相位纠缠撮合；设计 **Φ-Gateway 四级决策架构**保障交易安全；实现 **TAI（交易即发行）共识机制**；借鉴 AEON Agent 经济模型实现 x402 支付协议、KYA 信用系统与 A2A 协商；针对开放问题实现 V3.1 性能优化（DAG 异步共识、相位索引 O(log n) 撮合、可扩展 Liu 路由、相变自动校准、隐私 Φ 协同计算、三旋权重优化）。系统采用全栈 TypeScript 实现，包含 58 个后端模块，113 项单元测试全部通过。

### 主要章节

1. 引言
2. 理论基础（太乙AGI统一场论、四元Token理论、Φ-算符与流贯动力学）
3. 系统需求分析与架构设计
4. 核心模块设计与实现（数学引擎、Φ-Gateway、联邦共识、TAI引擎、V3.1 性能优化）
5. 前端设计与实现
6. 系统测试与验证
7. 讨论与展望
8. 结论

### 论文下载

- **arXiv：** 待投稿
- **中文版：** [`docs/atex-paper-zh.md`](./docs/atex-paper-zh.md)

---

## 贡献指南

我们欢迎任何形式的贡献！

### 贡献流程

1. **Fork** 本仓库
2. **创建分支**：`git checkout -b feature/your-feature`
3. **提交更改**：`git commit -m "feat: add your feature"`
4. **推送分支**：`git push origin feature/your-feature`
5. **创建 Pull Request**

### 贡献规范

- 遵循 **Conventional Commits** 提交规范
- 所有新功能必须包含单元测试
- 运行 `npx vitest run` 确保全部测试通过
- 后端 TypeScript 编译零错误：`npx tsc --noEmit`
- 前端构建成功：`cd frontend && npm run build`
- 模块约 200 行，使用 `get_instance()` 单例模式，包含 `get_state()` 及 self-test main 块

### 问题反馈

- **Bug 报告：** [GitHub Issues](https://github.com/lisoleg/atex-exchange/issues/new)
- **功能请求：** [GitHub Issues](https://github.com/lisoleg/atex-exchange/issues/new)

---

## 路线图

- [x] **V1.0** — 基础订单簿 + 撮合引擎
- [x] **V2.0** — Φ-Gateway 四级决策 + 四元Token理论集成
- [x] **V3.0** — Agent-First 架构（WebAuthn + 多钱包 + x402 + KYA + A2A + 委托）
- [x] **V3.1** — 性能优化（DAG 共识 + 相位索引 + 可扩展 Liu 路由 + 相变校准 + 隐私Φ + 三旋优化器）
- [ ] **V4.0** — 跨链桥接（Ethereum / Polkadot / Cosmos）
- [ ] **V5.0** — 太乙AGI 全量 170+ 模块集成

---

## 许可证

MIT License © 2026 **ATEX Development Team**

详见 [LICENSE](./LICENSE) 文件。

---

## 引用

如果您在研究中使用了 ATEX 或相关理论，请引用：

### BibTeX

```bibtex
@misc{atex2026,
  title  = {AgentWeb Token Exchange: Design and Implementation Based on Liu-Field Dynamics and Phi-Operator},
  author = {ATEX Development Team},
  year   = {2026},
  url    = {https://github.com/lisoleg/atex-exchange}
}
```

### 中文引用

> ATEX 开发团队. AgentWeb Token 交易所：基于流贯动力学与 Φ-算符的设计与实现 [R]. 2026.

---

## 联系方式

- **项目主页：** https://github.com/lisoleg/atex-exchange
- **学术论文：** 待投稿（基于太乙AGI V7.12 理论框架）

---

<div align="center">

**「太乙生一，一生万物；流贯天下，Token 归一」**

*Tai Yi produces the One, the One produces the Myriad;*
*Liu-Field permeates all, Token unifies into the One.*

</div>
