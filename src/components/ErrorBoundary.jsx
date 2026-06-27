import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', background: 'red', color: 'white', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, overflow: 'auto' }}>
          <h2>Something went wrong in QR Scanner.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button onClick={() => this.props.setActiveTab('attendance')} style={{ marginTop: '20px', padding: '10px' }}>Go Back</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
