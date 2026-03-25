import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 32 }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ width: 64, height: 64, background: 'var(--color-red-light)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--color-red)' }}>
              <AlertTriangle size={28} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 24 }}>
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            >
              <RefreshCw size={16} /> Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
