import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Filter out extension context errors
    const errorMessage = error?.toString() || "";
    if (
      errorMessage.includes("Extension context invalidated") ||
      errorMessage.includes("content.js")
    ) {
      // Silently ignore browser extension errors
      console.warn("Browser extension error ignored:", errorMessage);
      return;
    }

    this.setState({
      error,
      errorInfo,
      errorCount: this.state.errorCount + 1,
    });

    // Optional: Send error to logging service
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    // Reload the page if there have been multiple errors
    if (this.state.errorCount > 2) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-base-100 p-4">
          <div className="max-w-md w-full bg-base-200 rounded-lg shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={32} className="text-error flex-shrink-0" />
              <h2 className="text-2xl font-bold">Something went wrong</h2>
            </div>

            <p className="text-base-content/70 mb-4">
              The app encountered an unexpected error. Don't worry, your data is
              safe!
            </p>

            {this.state.error && (
              <details className="mb-4 bg-base-300 p-3 rounded">
                <summary className="cursor-pointer font-medium text-sm">
                  Error Details (for debugging)
                </summary>
                <pre className="text-xs mt-2 overflow-auto max-h-40 text-error">
                  {this.state.error.toString()}
                  {this.state.errorInfo &&
                    "\n\n" + this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-2">
              <button
                onClick={this.handleReset}
                className="btn btn-primary flex-1"
              >
                <RefreshCw size={18} />
                Try Again
              </button>
              <button
                onClick={() => window.location.reload()}
                className="btn btn-ghost flex-1"
              >
                Reload App
              </button>
            </div>

            <p className="text-xs text-base-content/50 mt-4 text-center">
              Error count: {this.state.errorCount}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
