import { useEffect, useState } from "react";

/**
 * Devuelve [ref, visible]: si el elemento está ahora mismo en el viewport. A
 * diferencia de useNearViewport, cambia en los dos sentidos. Sirve para que,
 * de dos instancias del mismo widget en la página, solo anuncie cambios la que
 * se está viendo.
 */
export function useInViewport<T extends Element>() {
  const [node, setNode] = useState<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry?.isIntersecting ?? false));
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);

  return [setNode, visible] as const;
}
