import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** 顶层错误边界：渲染异常时给出兜底页而非白屏。 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("UI 渲染异常:", error, info);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#f0f2f5",
          color: "#1f2937",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 18, marginBottom: 8 }}>页面出错了</div>
          <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>
            {this.state.error.message}
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              background: "#1677ff",
              color: "#fff",
              border: "none",
              cursor: "pointer",
            }}
          >
            刷新
          </button>
        </div>
      </div>
    );
  }
}
