/**
 * useEventSource — SSE EventSource Hook
 * 替代轮询，监听实时事件
 */

import { useEffect, useRef, useCallback } from 'react';

interface SSEOptions {
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  eventTypes?: Record<string, (data: any) => void>;
}

export function useEventSource(url: string | null, options: SSEOptions = {}) {
  const sourceRef = useRef<EventSource | null>(null);
  const { onMessage, onError, eventTypes } = options;

  const connect = useCallback(() => {
    if (!url) return;

    // 关闭旧连接
    if (sourceRef.current) {
      sourceRef.current.close();
    }

    const source = new EventSource(url);
    sourceRef.current = source;

    source.onmessage = (event) => {
      if (onMessage) onMessage(event);
    };

    source.onerror = (error) => {
      if (onError) onError(error);
      // 自动重连（EventSource 内置，但我们可以额外处理）
    };

    // 注册特定事件类型
    if (eventTypes) {
      for (const [type, handler] of Object.entries(eventTypes)) {
        source.addEventListener(type, (event: any) => {
          try {
            const data = JSON.parse(event.data);
            handler(data);
          } catch { /* ignore parse error */ }
        });
      }
    }

    return source;
  }, [url, onMessage, onError, eventTypes]);

  useEffect(() => {
    const source = connect();
    return () => {
      if (source) source.close();
      sourceRef.current = null;
    };
  }, [connect]);

  const disconnect = useCallback(() => {
    if (sourceRef.current) {
      sourceRef.current.close();
      sourceRef.current = null;
    }
  }, []);

  return { connect, disconnect, source: sourceRef };
}
