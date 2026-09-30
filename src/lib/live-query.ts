import { useLiveQuery } from "dexie-react-hooks";

/**
 * useLiveQuery 的默认值显式包装：SSR 预渲染期间 getDB() 为 null，
 * 显式 default 可避免 undefined 闪烁与类型分支。
 */
export function useLiveQueryDefault<T>(
  querier: () => Promise<T> | T | undefined,
  deps: unknown[],
  defaultValue: T
): T {
  const value = useLiveQuery(querier, deps, defaultValue);
  return value === undefined ? defaultValue : value;
}
