import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { failed: boolean };

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep diagnostics in the browser console without exposing internals to visitors.
    console.error("[Elite NG] Application render failed", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main style={{ minHeight: "100vh", background: "#08080b", color: "#f7f4ed", display: "grid", placeItems: "center", padding: "24px", fontFamily: "system-ui, sans-serif" }}>
          <section style={{ maxWidth: "560px", width: "100%", border: "1px solid rgba(232,197,120,.28)", borderRadius: "20px", padding: "28px", background: "rgba(255,255,255,.035)" }}>
            <p style={{ color: "#e8c578", letterSpacing: ".18em", fontSize: "11px", textTransform: "uppercase" }}>Elite NG · Recovery</p>
            <h1 style={{ fontSize: "clamp(28px, 6vw, 42px)", lineHeight: 1.1, margin: "12px 0" }}>The page did not load correctly.</h1>
            <p style={{ color: "rgba(247,244,237,.72)", lineHeight: 1.7 }}>Your account and requests have not been changed. Reload the page or open another section while we recover this view.</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "22px" }}>
              <button onClick={() => window.location.reload()} style={{ border: 0, borderRadius: "999px", padding: "12px 18px", background: "#e8c578", color: "#08080b", fontWeight: 700, cursor: "pointer" }}>Reload page</button>
              <a href="/monetization" style={{ border: "1px solid rgba(255,255,255,.2)", borderRadius: "999px", padding: "12px 18px", color: "#f7f4ed", textDecoration: "none" }}>View plans</a>
              <a href="/" style={{ border: "1px solid rgba(255,255,255,.2)", borderRadius: "999px", padding: "12px 18px", color: "#f7f4ed", textDecoration: "none" }}>Home</a>
            </div>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
