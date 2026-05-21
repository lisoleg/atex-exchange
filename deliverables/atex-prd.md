# ATEX 产品需求文档（PRD）

## 项目信息

- **Language**: 中文
- **Programming Language**: Prisma + TypeScript + activitypub-express（后端）/ React + MUI + Tailwind CSS（前端）/ Solidity（L2 智能合约）
- **Project Name**: atex
- **原始需求复述**：基于西格玛云（Σ-Cloud）四元 Token 统一场论与 EML 一元数 Φ 值，构建去中心化 Token 交易所 ATEX。采用"相位缠绕发行 + 拓扑相变成交 + 流贯回收"生命周期机制，通过 ActivityPub 联邦协议实现跨实例交易。

---

## 1. 产品定义

### 1.1 Product Goals

1. **语义原生交易**：以 Φ 值相位差为核心定价机制，实现交易有效性由语义（而非仅签名）决定的新型交易范式
2. **四元 Token 无缝流通**：支持算元（Calc）、智元（Wit）、词元（Word）、通证（Pass）四类 Token 之间的高效兑换与组合
3. **机器经济基础设施**：为 AI Agent 提供协议层原生价值交换能力，使 Agent 可自主进行资源定价、交易与结算

### 1.2 User Stories

1. **As an AI Agent**，I want 用 10 Wit 兑换 1000 Calc，so that 我可以用计算资源执行推理任务
2. **As a Token 持有者**，I want 查看当前四类 Token 的相位分布与流动性，so that 我能判断最佳交易时机
3. **As a Σ-Cloud 实例管理员**，I want 跨实例广播交易报价并通过 Φ-Gateway 过滤恶意请求，so that 联邦网络安全且高效运行
4. **As a DeFi 开发者**，I want 通过标准 API 创建和接受交易报价，so that 我可以在 ATEX 之上构建组合型金融应用
5. **As a 审计员**，I want 查看交易的完整生命周期（Offer → Accept/Settle → Recycle）与 ZK 证明，so that 我能验证交易合规性

---

## 2. 需求池

### P0 — Must Have

| 编号 | 需求 | 描述 |
|------|------|------|
| P0-1 | 创建交易报价（Offer） | 支持 AI Agent 或用户发起 Offer，系统计算 Φ 值相位、创造临时 Token（Issued 状态）、锁定原始 Token |
| P0-2 | 接受交易报价（Accept） | 验证双方 Φ 值匹配，执行拓扑相变：创造新 Active Token 给双方，销毁临时 Token |
| P0-3 | 取消交易报价（Cancel） | 超时或主动取消时，销毁临时 Token，解除原 Token 锁定，相位松弛回归 |
| P0-4 | Φ-Gateway 语义网关 | 拦截所有交易请求，评估 Φ 值并输出 Priority / Normal / Throttle / Reject 四级决策 |
| P0-5 | Token 生命周期管理 | Null → Issued → Active → Consumed / Settled 完整状态机，含锁定/解锁逻辑 |
| P0-6 | 四元 Token 类型支持 | 算元（Calc）、智元（Wit）、词元（Word）、通证（Pass）的统一建模与互换 |
| P0-7 | ActivityPub 联邦交易 | 将 Offer/Accept 封装为 ActivityPub Activity，支持跨实例广播与接收 |

### P1 — Should Have

| 编号 | 需求 | 描述 |
|------|------|------|
| P1-1 | 流动性视图（相位分布） | 展示当前各 Token 类型的 Φ 值相位分布与流动性热力图 |
| P1-2 | 交易历史查询 | 按时间/类型/状态筛选交易记录，支持分页 |
| P1-3 | 相位差定价模型 | 基于 EML Φ 值模长比与相位差计算动态价格与滑点 |
| P1-4 | 堆垒素数锁机制 | 写操作（撮合）使用费米子排他锁，读操作（查询）使用玻色子共享锁 |
| P1-5 | 安全风控策略 | 粉尘攻击检测（低 Φ 值 Token 限流）、女巫攻击防御（新 Agent Throttle）、相位欺诈检测（反相位交易告警） |
| P1-6 | L2 智能合约结算 | PhiStaking.sol 合约 + OpenZeppelin ReentrancyGuard，网络中断时保障资产安全 |

### P2 — Nice to Have

| 编号 | 需求 | 描述 |
|------|------|------|
| P2-1 | ZK-Proof 压缩层 | M130 zk-Proof，证明余额充足且状态合法但不暴露具体数值 |
| P2-2 | React 仪表板 | 可视化界面：相位分布图、交易历史、Token 余额、Φ-Gateway 状态监控 |
| P2-3 | 虚时演化共识 | 49% BFT 交易确认，结算最终性 < 2s |
| P2-4 | 全息边界存储 | 仅存储 Offer/Accept Activity 哈希，极低存储成本 |
| P2-5 | 可组合交易编排 | 交易逻辑可被 AI Agent 自动调用与编排，支持复杂交易路径 |

---

## 3. UI 设计稿

### 3.1 整体布局

仪表板采用深色主题，左侧导航栏 + 右侧内容区，顶部状态栏显示 Φ-Gateway 实时状态与网络连接。

```
┌──────────────────────────────────────────────────────────┐
│  ATEX Dashboard    │ Φ-Gateway: NORMAL │ Net: 3 peers │ ⚡ │
├────────┬─────────────────────────────────────────────────┤
│        │                                                 │
│  📊    │              Main Content Area                  │
│ 总览   │                                                 │
│        │                                                 │
│  💱    │                                                 │
│ 交易   │                                                 │
│        │                                                 │
│  📈    │                                                 │
│ 流动性 │                                                 │
│        │                                                 │
│  📜    │                                                 │
│ 历史   │                                                 │
│        │                                                 │
│  ⚙️    │                                                 │
│ 设置   │                                                 │
└────────┴─────────────────────────────────────────────────┘
```

### 3.2 关键页面描述

#### 页面一：交易总览（Dashboard）

- **四元 Token 余额卡片**：四列布局，分别展示 Calc / Wit / Word / Pass 的余额、Φ 值模长、当前相位角
- **相位极坐标图**：以极坐标形式展示四种 Token 的相位分布，直观反映同相/反相关系
- **最近交易流**：滚动列表显示最近 10 笔交易的摘要（类型、双方、状态、Φ 差值）

#### 页面二：创建交易（Trade）

- **交易表单**：
  - 提供 Token（下拉：Calc/Wit/Word/Pass）+ 数量
  - 请求 Token（下拉：Calc/Wit/Word/Pass）+ 数量
  - 相位预览：实时计算预估 Φ 差值与滑点
  - Φ-Gateway 级别预判（Priority/Normal/Throttle/Reject）
- **确认按钮**：提交后显示临时 Token 状态（Issued），等待对方 Accept

#### 页面三：流动性视图（Liquidity）

- **相位分布热力图**：横轴为 Token 类型对，纵轴为相位差区间，颜色深浅表示流动性密度
- **订单簿列表**：当前活跃 Offer 列表，含 Φ 值、有效期、状态标签

#### 页面四：交易历史（History）

- **筛选栏**：按 Token 类型、时间范围、状态（Issued/Accepted/Cancelled/Settled）筛选
- **交易表格**：ID、提供方、请求方、Token 对、Φ 差值、状态、时间戳
- **交易详情抽屉**：点击行展开，显示完整生命周期事件链与 ZK 证明状态

---

## 4. 待确认问题

| 编号 | 问题 | 影响 | 建议 |
|------|------|------|------|
| Q1 | Φ 值的计算依赖哪些链上/链下数据源？模长和相位的具体获取方式 | P0 — 影响定价与风控核心逻辑 | 需 Σ-Cloud 团队明确 Φ 值 Provider 接口规范 |
| Q2 | ActivityPub 联邦跨实例交易的身份验证方案？是否依赖 Σ-Cloud 的 Agent DID | P0 — 影响联邦交易安全模型 | 需确认 DID 方法与签名验证流程 |
| Q3 | 智能合约部署在哪条 L2？Gas 费用模型如何与 Φ 值定价衔接 | P1 — 影响结算流程与用户体验 | 需确认 L2 选型（Arbitrum/Optimism/自定义） |
| Q4 | "交易即发行"模式下，Token 供应量的上限如何约束？是否存在通胀风险 | P0 — 影响经济模型稳定性 | 需设计 Token 总量约束或回收销毁机制 |
| Q5 | Φ-Gateway 的"相位欺诈"人工审核流程如何实现？是否需要链上治理投票 | P1 — 影响风控自动化程度 | 建议初期采用多签钱包紧急暂停 + 后续链上治理 |
| Q6 | React 仪表板是否需要支持移动端？还是仅面向桌面端 Agent 运维 | P2 — 影响前端工程量 | 建议首期仅桌面端，移动端视用户反馈再定 |
