import { Component, type ErrorInfo, type ReactNode } from 'react';
import { MountainOutlineIcon } from '../lib/icons';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

// Red de seguridad para toda la app: sin esto, un error de render sin
// capturar (ej. un dato inesperado del servidor) deja al usuario con una
// pantalla en blanco sin forma de recuperarse.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error no capturado en la app:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="app-shell">
        <div className="app-main">
          <div className="auth-wrap">
            <div className="brand" style={{ justifyContent: 'center' }}>
              <MountainOutlineIcon size={26} color="var(--accent)" />
              Cumbre
            </div>
            <div className="error-banner" style={{ marginTop: 20 }}>
              Algo salió mal y la página no puede seguir mostrándose.
            </div>
            <button className="btn btn-accent" onClick={() => window.location.assign('/feed')}>
              Volver al feed
            </button>
          </div>
        </div>
      </div>
    );
  }
}
