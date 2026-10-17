"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefineResult } from "@/lib/explorer/explorer";
import type { ExplorerRequest, ExplorerResponse, SearchView } from "@/lib/explorer/messages";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * Un único worker para toda la vida del explorador. Cada petición lleva un id
 * creciente y solo se acepta la respuesta de la última: si arrastras un
 * control, las búsquedas intermedias que lleguen tarde se descartan.
 */
export function useExplorerWorker() {
  const worker = useRef<Worker | null>(null);
  const latest = useRef({ search: 0, refine: 0 });
  const nextId = useRef(1);
  const [search, setSearch] = useState<SearchView | null>(null);
  const [refined, setRefined] = useState<RefineResult | null>(null);
  const [busy, setBusy] = useState({ search: false, refine: false });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const w = new Worker(new URL("../../lib/explorer/explorer.worker.ts", import.meta.url), { type: "module" });
    w.addEventListener("message", (event: MessageEvent<ExplorerResponse>) => {
      const response = event.data;
      if (response.kind === "error") {
        setError(response.message);
        setBusy({ search: false, refine: false });
        return;
      }
      if (response.id !== latest.current[response.kind]) return; // respuesta vieja
      setError(null);
      if (response.kind === "search") {
        setSearch(response.result);
        setBusy((b) => ({ ...b, search: false }));
      } else {
        setRefined(response.result);
        setBusy((b) => ({ ...b, refine: false }));
      }
    });
    worker.current = w;
    return () => w.terminate();
  }, []);

  const send = useCallback((request: DistributiveOmit<ExplorerRequest, "id">) => {
    const id = nextId.current++;
    latest.current[request.kind] = id;
    setBusy((b) => ({ ...b, [request.kind]: true }));
    worker.current?.postMessage({ ...request, id } as ExplorerRequest);
  }, []);

  return { search, refined, busy, error, send, clearRefined: () => setRefined(null) };
}
