import { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) this.props.onReset();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { fallback: Fallback, inline } = this.props;
    if (Fallback) return <Fallback error={this.state.error} reset={this.handleReset} />;

    if (inline) {
      return (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>Something went wrong loading this section.</span>
          <button
            onClick={this.handleReset}
            className="ml-auto flex items-center gap-1 text-xs font-medium hover:text-red-900 transition-colors"
          >
            <RefreshCw size={13} /> Retry
          </button>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle size={26} className="text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500 mb-1">
            An unexpected error occurred. You can try refreshing or return to the home screen.
          </p>
          {import.meta.env.DEV && this.state.error && (
            <pre className="mt-3 mb-4 text-left text-xs bg-slate-100 rounded-lg p-3 overflow-auto max-h-32 text-slate-600 border border-slate-200">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex gap-3 justify-center mt-6">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <RefreshCw size={15} /> Try again
            </button>
            <a
              href="/"
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-200 transition-colors"
            >
              <Home size={15} /> Home
            </a>
          </div>
        </div>
      </div>
    );
  }
}
