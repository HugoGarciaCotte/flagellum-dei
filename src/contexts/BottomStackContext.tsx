import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

interface BottomStackValue {
  /** Total measured pixel height of all registered bottom-fixed layers. */
  bottomStackHeight: number;
  /** Map of layer id → measured height (px). Use to position a layer above specific others. */
  heights: Record<string, number>;
  /** Register a fixed-to-bottom layer so its height is tracked. */
  registerBottomLayer: (id: string, el: HTMLElement | null) => void;
}

const BottomStackContext = createContext<BottomStackValue>({
  bottomStackHeight: 0,
  heights: {},
  registerBottomLayer: () => {},
});

export function BottomStackProvider({ children }: { children: ReactNode }) {
  const layersRef = useRef<Map<string, HTMLElement>>(new Map());
  const observerRef = useRef<ResizeObserver | null>(null);
  const [heights, setHeights] = useState<Record<string, number>>({});

  const recompute = useCallback(() => {
    const next: Record<string, number> = {};
    for (const [id, el] of layersRef.current.entries()) {
      next[id] = Math.round(el.getBoundingClientRect().height);
    }
    setHeights((prev) => {
      const keys = new Set([...Object.keys(prev), ...Object.keys(next)]);
      for (const k of keys) {
        if (prev[k] !== next[k]) return next;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    observerRef.current = new ResizeObserver(() => recompute());
    const vv = window.visualViewport;
    const onVV = () => recompute();
    vv?.addEventListener("resize", onVV);
    window.addEventListener("orientationchange", onVV);
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      vv?.removeEventListener("resize", onVV);
      window.removeEventListener("orientationchange", onVV);
    };
  }, [recompute]);

  const registerBottomLayer = useCallback((id: string, el: HTMLElement | null) => {
    const prev = layersRef.current.get(id);
    if (prev && prev !== el) {
      observerRef.current?.unobserve(prev);
      layersRef.current.delete(id);
    }
    if (el) {
      layersRef.current.set(id, el);
      observerRef.current?.observe(el);
    } else if (prev) {
      setHeights((p) => {
        if (!(id in p)) return p;
        const { [id]: _, ...rest } = p;
        return rest;
      });
    }
    recompute();
  }, [recompute]);

  const bottomStackHeight = useMemo(
    () => Object.values(heights).reduce((a, b) => a + b, 0),
    [heights]
  );

  return (
    <BottomStackContext.Provider value={{ bottomStackHeight, heights, registerBottomLayer }}>
      {children}
    </BottomStackContext.Provider>
  );
}

export function useBottomStack() {
  return useContext(BottomStackContext);
}
