/**
 * Catches rendering errors in a part of the interface and shows a short fallback
 * instead of a blank screen, so the rest of the app keeps working.
 */
import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('Screen failed to render', error);
  }

  componentDidUpdate(prevProps) {
    // Navigating to another screen gives the boundary a new resetKey and clears the error.
    if (this.state.failed && prevProps.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '24px',
          textAlign: 'center',
          color: '#C9C1CB',
          fontFamily: "'Manrope', system-ui, sans-serif",
        }}
      >
        <span style={{ fontSize: '16px', fontWeight: '800', color: '#F4F1F2' }}>Nie udało się wyświetlić ekranu</span>
        <span style={{ fontSize: '13px' }}>Wybierz inną zakładkę. W sytuacji zagrożenia życia dzwoń pod 112.</span>
      </div>
    );
  }
}
