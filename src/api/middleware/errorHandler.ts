/**
 * 全局错误处理中间件
 */

import { Request, Response, NextFunction } from 'express';
import { ERROR_CODES } from '../../config/atex.config';

/** ATEX 业务错误 */
export class AtexError extends Error {
  code: string;
  statusCode: number;

  constructor(code: keyof typeof ERROR_CODES, statusCode: number = 400) {
    super(ERROR_CODES[code]);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'AtexError';
  }
}

/**
 * 全局错误处理中间件
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // ATEX 业务错误
  if (err instanceof AtexError) {
    res.status(err.statusCode).json({
      error: err.code,
      message: err.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Zod 验证错误
  if (err.name === 'ZodError') {
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: err.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Prisma 错误
  if (err.name === 'PrismaClientKnownRequestError') {
    res.status(500).json({
      error: 'DATABASE_ERROR',
      message: '数据库操作失败',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // 默认服务器错误
  console.error('[ATEX Error]', err);
  res.status(500).json({
    error: 'INTERNAL_ERROR',
    message: '服务器内部错误',
    timestamp: new Date().toISOString(),
  });
}
