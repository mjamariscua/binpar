"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefineResult } from "@/lib/explorer/explorer";
import type { ExplorerRequest, ExplorerResponse, SearchView } from "@/lib/explorer/messages";

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * Un único worker para toda la vida del explorador. Cada petición lleva un id
 * creciente y solo se acepta la respuesta de la última: si arrastras un
 * control, las búsquedas intermedias que lleguen tarde se descartan.
 *
 * Si el worker no se puede crear o falla sin responder, se informa (en vez de
 * quedarse «calculando» para siempre) y `retry` repite la última búsqueda.
 */
export function useExplorerWorker() {
  const worker = useRef<Worker | null>(null);
  const latest = useRef({ search: 0, refine: 0 });
  const nextId = useRef(1);
  const [search, setSearch] = useState<SearchView | null>(null);
  const [refined, setRefined] = useState<RefineResult | null>(null);
  const [busy, setBusy] = useState({ search: false, refine: false });
  const [error, setError] = useState<string | null>(null);
  const lastSearch = useRef<DistributiveOmit<ExplorerRequest, "id"> | null>(null);

  useEffect(() => {
    let w: Worker;
    try {
      w = new Worker(new URL("../../lib/explorer/explorer.worker.ts", import.meta.url), { type: "module" });
    } catch {
      // El navegador no deja crear el worker: un hecho externo, no estado derivado.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- se ejecuta como mucho una vez
      setError("Este navegador no puede hacer el cálculo en segundo plano (Web Workers).");
      return;
    }
    const fail = () => {
      setError("El cálculo se ha interrumpido. Puedes reintentarlo.");
      setBusy({ search: false, refine: false });
    };
    w.addEventListener("error", fail);
    w.addEventListener("messageerror", fail);
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
    if (request.kind === "search") lastSearch.current = request;
    setBusy((b) => ({ ...b, [request.kind]: true }));
    worker.current?.postMessage({ ...request, id } as ExplorerRequest);
  }, []);

  const retry = useCallback(() => {
    setError(null);
    if (lastSearch.current) send(lastSearch.current);
  }, [send]);

  return { search, refined, busy, error, send, retry, clearRefined: () => setRefined(null) };
}
