'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '1.5rem',
          padding: '1rem',
          fontFamily: 'system-ui, sans-serif',
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, color: '#dc2626' }}>
            Error crítico de la aplicación
          </h2>
          <p style={{ color: '#6b7280', textAlign: 'center', maxWidth: '400px' }}>
            Ocurrió un error inesperado. Por favor recarga la página.
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '1rem',
            }}
          >
            Recargar página
          </button>
        </div>
      </body>
    </html>
  );
}
