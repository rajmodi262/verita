import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props { children: ReactNode; label?: string }
interface State { error: Error | null }

/** Catches render errors so one broken view never blanks the whole app. */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    // eslint-disable-next-line no-console
    console.error(`[Verita] error in ${this.props.label || "view"}:`, error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="glass" style={{ margin: 24, padding: 32, textAlign: "center" }}>
        <AlertTriangle size={32} color="var(--danger)" />
        <h2 style={{ fontFamily: "var(--font-display)", marginTop: 12 }}>Something went wrong in this view</h2>
        <p style={{ color: "var(--text-muted)", marginTop: 8, fontSize: "0.9rem" }}>
          {this.props.label ? `${this.props.label}: ` : ""}{this.state.error.message}
        </p>
        <button
          onClick={() => this.setState({ error: null })}
          style={{ marginTop: 18, padding: "10px 20px", borderRadius: 10, border: "none", color: "#fff", background: "var(--signature)", fontWeight: 600, cursor: "pointer" }}
        >
          Try again
        </button>
      </div>
    );
  }
}
