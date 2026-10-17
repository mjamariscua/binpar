import { useEffect, useState } from "react";

/**
 * Devuelve [ref, near]: `near` pasa a true (y se queda así) cuando el
 * elemento entra en un margen alrededor del viewport. Sirve para no
 * descargar three.js ni crear contextos WebGL de escenas que aún están lejos
 * en una página larga.
 */
export function useNearViewport<T extends Element>(rootMargin = "300px") {
  const [node, setNode] = useState<T | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (!node || near) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setNear(true);
      },
      { rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, near, rootMargin]);

  return [setNode, near] as const;
}
