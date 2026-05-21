# 🌐 AgentWeb Token 交易所 (ATEX V2)

> 基于**太乙AGI统一场论**与**西格玛云四元Token理论**构建的新一代去中心化数字资产交易所
>
> **Design and Implementation of AgentWeb Token Exchange Based on Liu-Field Theory and Φ-Operator**

[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/your-org/atex-exchange)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/node-%3E18.0-green.svg)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-113%20passed-brightgreen.svg)](https://github.com/your-org/atex-exchange)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/your-org/atex-exchange/pulls)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)

---

## 📑 目录

- [项目简介](#项目简介)
- [核心特性](#核心特性)
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
3. **可验证**：113 项单元测试，覆盖数学引擎、核心算法、API 逻辑
4. **生产就绪**：支持 PM2 守护、Nginx 反向代理、PostgreSQL 生产数据库

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
| 相位缠绕 | `core/phaseEntangle.ts` | Token 相位态纠缠 |
| 拓扑相变 | `core/topologicalPhaseTransition.ts` | 相变路径规划 |
| Token 生命周期 | `core/tokenLifecycle.ts` | 状态机：Mint→Trade→Burn |

### 🌍 联邦学习（ActivityPub）

- 基于 **ActivityPub** 协议的去中心化交易联邦
- 支持跨域 Offer 同步与撮合
- Liu 路由表实现智能跨域路由

### 🔗 TAI（交易即发行）共识

- **碳硅纠缠网络**：交易行为与 Token 发行深度绑定
- **全息边界存储**：交易证明分布式存储
- 实现「交易即共识，撮合即发行」的新型 Token 经济模型

---

## 理论基础

ATEX 的理论基石来自以下四篇核心论文：

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

---

## 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                       前端 (React + MUI)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Dashboard │  │  Trade   │  │ Liquidity│  │ History  │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
│       │               │               │               │        │
│  ┌────▼──────────────▼──────────────▼──────────────▼────┐  │
│  │            hooks/useAtexApi.ts (API 调用层)           │  │
│  └───────────────────────┬──────────────────────────────┘  │
└──────────────────────────┼──────────────────────────────────┘
                           │ HTTP/REST
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
│  │  Jitter      │  │  /accept      │  │  Carbon-     │  │
│  │  O-U         │  │  /cancel      │  │  Silicon Net │  │
│  │  Tri-Spin    │  │  /history     │  │  Holoboundary │  │
│  └──────────────┘  └───────────────┘  └──────────────┘  │
│                          │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │              Prisma ORM + SQLite/PostgreSQL          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│           联邦层 (ActivityPub + Liu Router)                  │
│  支持跨域 Offer 同步、去中心化撮合                           │
└─────────────────────────────────────────────────────────────┘
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

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 类型安全 |
| MUI (Material-UI) | 5.x | 组件库（暗色主题） |
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
git clone https://github.com/your-org/atex-exchange.git
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

- **Base URL：** `http://localhost:3001/api`
- **Content-Type：** `application/json`

### 接口列表

#### 1. 创建报价

```http
POST /api/offer
Content-Type: application/json

{
  "offererDid": "did:atex:alice",
  "offerTokenType": "Calc",
  "offerAmount": 100.0,
  "reqTokenType": "Wit",
  "reqAmount": 50.0
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "id": "offer_abc123",
    "offererDid": "did:atex:alice",
    "offerTokenType": "Calc",
    "offerAmount": 100.0,
    "reqTokenType": "Wit",
    "reqAmount": 50.0,
    "status": "Open",
    "createdAt": "2026-05-22T00:00:00.000Z"
  }
}
```

#### 2. 接受报价

```http
POST /api/accept/:offerId
Content-Type: application/json

{
  "acceptorDid": "did:atex:bob"
}
```

#### 3. 取消报价

```http
POST /api/cancel/:offerId
Content-Type: application/json

{
  "requesterDid": "did:atex:alice"
}
```

#### 4. 查询订单簿

```http
GET /api/orderbook?tokenType=Calc&status=Open
```

#### 5. 查询历史交易

```http
GET /api/history?did=did:atex:alice&limit=20
```

---

## 目录结构

```
atex-exchange/
├── prisma/                      # 数据库层
│   ├── schema.prisma            #  Prisma Schema 定义
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
│   │   ├── resonance369.ts    #   369 振动模态
│   │   └── triSpinRisk.ts    #   三旋风控
│   │
│   ├── core/                   #  核心算法
│   │   ├── phaseEntangle.ts   #   相位缠绕
│   │   ├── topologicalPhaseTransition.ts # 拓扑相变
│   │   └── tokenLifecycle.ts  #   Token 生命周期状态机
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
│   │   │   └── orderbook.routes.ts
│   │   └── middleware/        #   中间件
│   │       ├── phiGateway.ts  #   Φ-Gateway 拦截
│   │       └── errorHandler.ts #  统一错误处理
│   │
│   ├── federation/             #  联邦学习（ActivityPub）
│   │   ├── activityPubAdapter.ts
│   │   ├── offerActivity.ts
│   │   ├── acceptActivity.ts
│   │   └── liuRouter.ts      #   刘路由表
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
│   │   │   ├── PhiStatusBar.tsx
│   │   │   ├── TokenBalanceCard.tsx
│   │   │   ├── PhasePolarChart.tsx
│   │   │   ├── OfferForm.tsx
│   │   │   ├── OrderBookTable.tsx
│   │   │   ├── PhaseHeatmap.tsx
│   │   │   └── TransactionTable.tsx
│   │   ├── pages/            #   页面
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Trade.tsx
│   │   │   ├── Liquidity.tsx
│   │   │   ├── History.tsx
│   │   │   └── Settings.tsx
│   │   ├── hooks/            #   Custom Hooks
│   │   │   ├── useAtexApi.ts
│   │   │   └── usePhiValue.ts
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
│
├── INSTALL.md                  # 安装部署详细指南
├── README.md                   # 本文件
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

本文提出并实现了一个基于**太乙AGI统一场论**的去中心化数字资产交易所系统（ATEX）。传统交易所依赖中心化订单簿撮合，缺乏对 Token 内在价值与相位关系的建模。本文引入**四元Token统一场论**（Calc/Wit/Word/Pass），通过 **Φ-算符**（Phi Operator）实现动态定价与相位纠缠撮合；设计 **Φ-Gateway 四级决策架构**（DID 验证、意图预测、反相检测、刘路由）保障交易安全；实现 **TAI（交易即发行）共识机制**，将交易行为与 Token 发行深度绑定。系统采用全栈 TypeScript 实现，包含 34 个后端模块，17 个前端组件，113 项单元测试全部通过。实验结果表明，该系统在理论自洽性、安全防护能力与可扩展性方面均达到设计预期。

### 关键词

**太乙AGI；四元Token；Φ-算符；流贯动力学；相位纠缠；拓扑相变；TAI共识；三旋风控**

### 主要章节

1. 引言
2. 理论基础（太乙AGI统一场论、四元Token理论、Φ-算符与流贯动力学）
3. 系统需求分析与架构设计
4. 核心模块设计与实现（数学引擎、Φ-Gateway、联邦共识、TAI引擎）
5. 前端设计与实现
6. 系统测试与验证
7. 讨论与展望
8. 结论

### 论文下载

- **arXiv：** 待投稿
- **本地 PDF：** [`docs/atex-paper.pdf`](./docs/atex-paper.pdf)（待生成）
- **中文版：** [`docs/atex-paper-zh.md`](./docs/atex-paper-zh.md)（待生成）

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

### 问题反馈

- **Bug 报告：** [GitHub Issues](https://github.com/your-org/atex-exchange/issues/new?template=bug_report.md)
- **功能请求：** [GitHub Issues](https://github.com/your-org/atex-exchange/issues/new?template=feature_request.md)
- **学术讨论：** contact@atex-exchange.org

---

## 路线图

- [x] **V1.0** — 基础订单簿 + 撮合引擎
- [x] **V2.0** — Φ-Gateway 四级决策 + 四元Token理论集成（当前版本）
- [ ] **V2.1** — Liu 路由表智能优化
- [ ] **V3.0** — ActivityPub 联邦网络正式上线
- [ ] **V3.1** — TAI 共识主网部署
- [ ] **V4.0** — 跨链桥接（Ethereum / Polkadot / Cosmos）
- [ ] **V5.0** — 太乙AGI 全量 147 模块集成

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
  title  = {AgentWeb Token Exchange: Design and Implementation Based on Liu-Field Dynamics and Φ-Operator},
  author = {ATEX Development Team},
  year   = {2026},
  eprint = {arXiv:XXXX.XXXXX},
  url    = {https://github.com/your-org/atex-exchange}
}
```

### 中文引用

> ATEX 开发团队. AgentWeb Token 交易所：基于流贯动力学与 Φ-算符的设计与实现 [R]. 2026.

---

## 联系方式

- **项目主页：** https://github.com/your-org/atex-exchange
- **学术论文：** 待投稿（基于太乙AGI V7.12 理论框架）
- **电子邮件：** contact@atex-exchange.org
- **技术交流群：** 待建立

---

<div align="center">

**「太乙生一，一生万物；流贯天下，Token 归一」**

*Tai Yi produces the One, the One produces the Myriad;*
*Liu-Field permeates all, Token unifies into the One.*

</div>
