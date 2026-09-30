import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("pUXWorkbench UI error", error, info);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="app-shell">
        <section className="app-error-boundary" role="alert">
          <h2>pUXWorkbench encountered a UI error</h2>
          <p>The workbench stopped rendering this view instead of leaving the application on a black screen.</p>
          <pre>{this.state.error.message}</pre>
          <button type="button" onClick={this.reset}>
            Return to workbench
          </button>
        </section>
      </main>
    );
  }
}
