import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in child component tree,
 * logs those errors, and displays a fallback UI instead of crashing
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🔴 App Error Caught:', error);
    console.error('Component Stack:', errorInfo.componentStack);
    
    // Here you could send to error tracking service like Sentry
    // Sentry.captureException(error, { extra: errorInfo });
  }

  private handleReload = () => {
    // Clear potentially corrupted localStorage data
    try {
      // Only clear game state, keep settings
      const settings = localStorage.getItem('guessus_settings');
      localStorage.clear();
      if (settings) {
        localStorage.setItem('guessus_settings', settings);
      }
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
    
    window.location.reload();
  };

  private handleReset = () => {
    // Clear all data and reload
    try {
      localStorage.clear();
    } catch (e) {
      console.warn('Failed to clear localStorage:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-neutral-900 text-white flex flex-col items-center justify-center p-6">
          <div className="max-w-sm w-full text-center">
            {/* Error Icon */}
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} className="text-red-500" />
            </div>
            
            {/* Error Message */}
            <h1 className="text-2xl font-bold mb-2">Oops! Something went wrong</h1>
            <p className="text-neutral-400 mb-8 text-sm">
              The app encountered an unexpected error. Don't worry, your game data is safe.
            </p>

            {/* Error Details (collapsed by default) */}
            {this.state.error && (
              <details className="mb-6 text-left bg-neutral-800 rounded-xl p-4 text-xs">
                <summary className="cursor-pointer text-neutral-400 mb-2">
                  Technical Details
                </summary>
                <code className="text-red-400 break-all">
                  {this.state.error.message}
                </code>
              </details>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <RefreshCw size={20} />
                Reload App
              </button>
              
              <button
                onClick={this.handleReset}
                className="w-full bg-neutral-800 text-neutral-300 py-3 rounded-xl font-medium text-sm hover:bg-neutral-700 transition-colors"
              >
                Reset All Data & Reload
              </button>
            </div>

            {/* Version Info */}
            <p className="text-neutral-600 text-xs mt-8">
              If this keeps happening, try updating the app or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
