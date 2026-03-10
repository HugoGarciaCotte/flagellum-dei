import { useState, useEffect, useCallback } from "react";
import { getTable, getBy, getRow } from "@/lib/localStore";
import type { TableName } from "@/lib/localStore";

export type { TableName };

/**
 * Reactive hook that returns rows from the local store, optionally filtered.
 * Re-renders automatically when the underlying table changes.
 * Returns [] if any filter value is undefined (filter not ready).
 */
export function useLocalRows<T = Record<string, any>>(
  table: TableName,
  filter?: Record<string, any>,
): T[] {
  const filterKey = JSON.stringify(filter);

  const compute = useCallback(() => {
    if (filter) {
      for (const val of Object.values(filter)) {
        if (val === undefined) return [] as T[];
      }
      return getBy<T>(table, filter);
    }
    return getTable<T>(table);
  }, [table, filterKey]);

  const [data, setData] = useState<T[]>(compute);

  useEffect(() => {
    setData(compute());
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.table === table || detail?.table === "*") {
        setData(compute());
      }
    };
    window.addEventListener("localstore-change", handler);
    return () => window.removeEventListener("localstore-change", handler);
  }, [table, filterKey, compute]);

  return data;
}

/**
 * Reactive hook that returns a single row by ID from the local store.
 */
export function useLocalRow<T = Record<string, any>>(
  table: TableName,
  id: string | undefined,
): T | undefined {
  const compute = useCallback(() => {
    if (!id) return undefined;
    return getRow<T>(table, id);
  }, [table, id]);

  const [data, setData] = useState<T | undefined>(compute);

  useEffect(() => {
    setData(compute());
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.table === table || detail?.table === "*") {
        setData(compute());
      }
    };
    window.addEventListener("localstore-change", handler);
    return () => window.removeEventListener("localstore-change", handler);
  }, [table, id, compute]);

  return data;
}
