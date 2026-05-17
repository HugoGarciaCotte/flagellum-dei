import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type LayerMap = Map<string, HTMLElement>;

interface BottomStackValue {
  /** Total measured pixel height of all registered bottom-fixed layers (banners). */
  bottomStackHeight: number;
  /** Register a fixed-to-bottom layer so its height contributes to the stack. */
  registerBottomLayer: (id: string, el: HTMLElement | null) => void;
  /** True when there is no banner currently registered — used to know if you are the bottom-most layer and should add safe-area padding yourself. */
  isStackEmpty: boolean;
}

const BottomStackContext = createContext<BottomStackValue>({
  bottomStackHeight: 0,
  registerBottomLayer: () => {},
  isStackEmpty: true,
});

export function BottomStackProvider({ children }: { children: ReactNode }) {
  const layersRef = useRef<LayerMap>(new Map());
  const observerRef = useRef<ResizeObserver | null>(null);
  const [bottomStackHeight, setBottomStackHeight] = useState(0);
  const [isStackEmpty, setIsStackEmpty] = useState(true);

  const recompute = useCallback(() => {
    let max = 0;
    for (const el of layersRef.current.values()) {
      const r = el.getBoundingClientRect();
      if (r.height > max) max = r.height;
    }
    setBottomStackHeight(Math.round(max));
    setIsStackEmpty(layersRef.current.size === 0);
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
    }
    recompute();
  }, [recompute]);

  return (
    <BottomStackContext.Provider value={{ bottomStackHeight, registerBottomLayer, isStackEmpty }}>
      {children}
    </BottomStackContext.Provider>
  );
}

export function useBottomStack() {
  return useContext(BottomStackContext);
}
