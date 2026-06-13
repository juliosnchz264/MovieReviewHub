import { RefObject, useEffect, useState } from "react";

export function useIntersection(
  ref: RefObject<Element | null>,
  options?: IntersectionObserverInit
): boolean {
  const [intersecting, setIntersecting] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setIntersecting(entry.isIntersecting);
    }, options);

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, options]);

  return intersecting;
}
