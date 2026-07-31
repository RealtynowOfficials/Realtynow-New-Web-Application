import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    if (error.message && error.message.includes('Failed to fetch dynamically imported module')) {
      const hasRetried = sessionStorage.getItem('dynamic-import-retry');
      if (!hasRetried) {
        sessionStorage.setItem('dynamic-import-retry', 'true');
        window.location.reload();
      } else {
        sessionStorage.removeItem('dynamic-import-retry');
      }
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    if (error.message && error.message.includes('Failed to fetch dynamically imported module')) {
      return; // Handled by reload
    }
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-6">
          <h2 className="text-2xl font-bold text-navy-900">Something went wrong</h2>
          <p className="text-navy-600 text-center max-w-md">
            {this.state.error?.message ?? 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
