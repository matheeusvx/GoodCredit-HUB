import { useEffect, useLayoutEffect, useRef, useState } from "react";

export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - 2 ** (-10 * t));
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

interface TweenOptions {
  duration?: number;
  /** Delay before the first value moves. */
  delay?: number;
  /** Extra delay per index, so a row of values moves one after another. */
  stagger?: number;
  ease?: (t: number) => number;
  /** Where the values start on first paint (an entrance); the target itself when left out. */
  from?: number[];
}

/**
 * Animates an array of numbers to `target`, always from what is on screen: a change halfway through
 * a tween carries on from there instead of jumping. Respects reduced motion.
 */
export function useTween(target: number[], { duration = 700, delay = 0, stagger = 0, ease = easeOutExpo, from }: TweenOptions = {}) {
  const [values, setValues] = useState<number[]>(() => from ?? target);
  const shown = useRef(values);
  const key = target.map((value) => Math.round(value * 1000) / 1000).join(",");
  const first = useRef(true);

  useEffect(() => {
    const start = shown.current;
    const end = target;
    const startDelay = first.current ? delay : 0;
    first.current = false;
    if (prefersReducedMotion()) {
      shown.current = end;
      setValues(end);
      return;
    }
    let frame = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      let done = true;
      const next = end.map((to, i) => {
        const fromValue = start[i] ?? 0;
        const local = (now - t0 - startDelay - i * stagger) / duration;
        if (local < 1) done = false;
        return fromValue + (to - fromValue) * ease(Math.min(1, Math.max(0, local)));
      });
      shown.current = next;
      setValues(next);
      if (!done) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return values;
}

/** The element's content width, kept current as it resizes. */
export function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const measure = () => setWidth(element.clientWidth || fallback);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [fallback]);
  return [ref, width] as const;
}
