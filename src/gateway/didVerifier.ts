/**
 * DID 验证器
 * 模拟 DID (去中心化标识符) 验证
 * 首期使用模拟验证，后续对接真实 DID 方法
 */

/** 已注册的 DID 缓存 (模拟) */
const registeredDIDs = new Map<string, DIDRecord>();

/** DID 记录 */
interface DIDRecord {
  did: string;
  publicKey: string;
  registeredAt: Date;
  isActive: boolean;
}

/**
 * 注册 DID (模拟)
 * @param did DID 标识符
 * @param publicKey 公钥
 * @returns 是否注册成功
 */
export function registerDID(did: string, publicKey?: string): boolean {
  if (registeredDIDs.has(did)) return false;

  registeredDIDs.set(did, {
    did,
    publicKey: publicKey || `pk_${did.substring(0, 16)}`,
    registeredAt: new Date(),
    isActive: true,
  });
  return true;
}

/**
 * 验证 DID 是否有效
 * @param did DID 标识符
 * @returns 是否验证通过
 */
export function verifyDID(did: string): boolean {
  // 基本格式检查
  if (!did || did.length < 10) return false;

  // 检查是否已注册
  const record = registeredDIDs.get(did);
  if (!record) {
    // 自动注册新 DID (模拟环境)
    registerDID(did);
    return true;
  }

  // 检查是否活跃
  return record.isActive;
}

/**
 * 停用 DID
 * @param did DID 标识符
 */
export function deactivateDID(did: string): boolean {
  const record = registeredDIDs.get(did);
  if (!record) return false;
  record.isActive = false;
  return true;
}

/**
 * 重新激活 DID
 * @param did DID 标识符
 */
export function reactivateDID(did: string): boolean {
  const record = registeredDIDs.get(did);
  if (!record) return false;
  record.isActive = true;
  return true;
}

/**
 * 获取 DID 记录
 * @param did DID 标识符
 * @returns DID 记录或 null
 */
export function getDIDRecord(did: string): DIDRecord | null {
  return registeredDIDs.get(did) || null;
}

/**
 * 列出所有已注册 DID
 * @returns DID 列表
 */
export function listDIDs(): string[] {
  return Array.from(registeredDIDs.keys());
}

// 初始化一些默认 DID
registerDID('did:atex:alice', 'pk_alice_001');
registerDID('did:atex:bob', 'pk_bob_002');
registerDID('did:atex:system', 'pk_system_000');
