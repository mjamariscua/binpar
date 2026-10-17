"use client";

import { Component, type ReactNode } from "react";

/**
 * Captura errores de render de sus hijos: aquí, que el worker falle o que el
 * navegador no pueda crear un contexto WebGL. React solo ofrece esta API como
 * componente de clase.
 */
export class ErrorBoundary extends Component<
  { fallback: (retry: () => void) => ReactNode; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  private readonly retry = () => this.setState({ failed: false });

  override render() {
    return this.state.failed ? this.props.fallback(this.retry) : this.props.children;
  }
}
